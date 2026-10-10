import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/db'
import { getPlan } from '@/lib/config'
import { deleteObject } from '@/lib/storage'

const INTERNAL_SECRET = process.env.INTERNAL_CRON_SECRET

/**
 * GET /api/internal/recycle-bin/cleanup
 *
 * Purges expired recycle bin items and old file versions across all workspaces.
 * Called by Vercel Cron Jobs or any external scheduler.
 *
 * Authorization: Bearer <INTERNAL_CRON_SECRET>
 */
export async function GET(req: NextRequest) {
    const auth = req.headers.get('authorization') ?? ''
    if (!INTERNAL_SECRET || auth !== `Bearer ${INTERNAL_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getAdminClient()

    const { data: workspaces, error: wsError } = await db
        .from('workspaces')
        .select('id, plan_id, storage_used_bytes')

    if (wsError || !workspaces) {
        console.error('[cleanup] Failed to load workspaces:', wsError)
        return NextResponse.json({ error: 'Failed to load workspaces' }, { status: 500 })
    }

    const results: Record<string, { purgedItems: number; purgedVersions: number; freedBytes: number; skipped?: string }> = {}

    for (const ws of workspaces) {
        const plan = getPlan(ws.plan_id)
        const retentionDays = plan.recycleBinRetentionDays

        if (retentionDays === null) {
            results[ws.id] = { purgedItems: 0, purgedVersions: 0, freedBytes: 0, skipped: 'indefinite retention' }
            continue
        }

        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - retentionDays)
        const cutoffIso = cutoff.toISOString()

        let freedBytes = 0
        let purgedItems = 0
        let purgedVersions = 0

        // ── Purge expired recycle bin files ───────────────────────────

        const { data: expiredFiles } = await db
            .from('vault_objects')
            .select('id, storage_key, size_bytes')
            .eq('workspace_id', ws.id)
            .eq('is_deleted', true)
            .eq('type', 'file')
            .not('deleted_at', 'is', null)
            .lt('deleted_at', cutoffIso)

        for (const file of expiredFiles ?? []) {
            if (file.storage_key) await deleteObject(file.storage_key).catch(console.error)
            if (file.size_bytes) freedBytes += Number(file.size_bytes)
            purgedItems++
        }

        // Also purge file versions belonging to expired recycle-bin files before the
        // batch delete (CASCADE would remove the DB rows but not the storage objects or
        // the storage counter contributions).
        const expiredFileIds = (expiredFiles ?? []).map((f: { id: string }) => f.id)
        if (expiredFileIds.length > 0) {
            const { data: expiredFileVersions } = await db
                .from('file_versions')
                .select('id, storage_key, size_bytes')
                .in('object_id', expiredFileIds)

            for (const version of expiredFileVersions ?? []) {
                if (version.storage_key) await deleteObject(version.storage_key).catch(console.error)
                if (version.size_bytes) freedBytes += Number(version.size_bytes)
                purgedVersions++
            }

            if ((expiredFileVersions ?? []).length > 0) {
                const versionIds = (expiredFileVersions ?? []).map((v: { id: string }) => v.id)
                await db.from('file_versions').delete().in('id', versionIds)
            }
        }

        if ((expiredFiles ?? []).length > 0) {
            await db
                .from('vault_objects')
                .delete()
                .eq('workspace_id', ws.id)
                .eq('is_deleted', true)
                .eq('type', 'file')
                .not('deleted_at', 'is', null)
                .lt('deleted_at', cutoffIso)
        }

        // ── Purge expired recycle bin folders ─────────────────────────
        // Files inside were already purged from storage above; CASCADE cleans up DB children.

        await db
            .from('vault_objects')
            .delete()
            .eq('workspace_id', ws.id)
            .eq('is_deleted', true)
            .eq('type', 'folder')
            .not('deleted_at', 'is', null)
            .lt('deleted_at', cutoffIso)

        // ── Purge old file versions beyond retention ──────────────────
        // Scope to this workspace by joining through vault_objects.
        // Two-step: get object IDs for this workspace, then query versions.

        const { data: wsObjects } = await db
            .from('vault_objects')
            .select('id')
            .eq('workspace_id', ws.id)

        const wsObjectIds = (wsObjects ?? []).map((o: { id: string }) => o.id)

        if (wsObjectIds.length > 0) {
            const { data: expiredVersions } = await db
                .from('file_versions')
                .select('id, storage_key, size_bytes')
                .in('object_id', wsObjectIds)
                .lt('created_at', cutoffIso)

            for (const version of expiredVersions ?? []) {
                if (version.storage_key) await deleteObject(version.storage_key).catch(console.error)
                if (version.size_bytes) freedBytes += Number(version.size_bytes)
                purgedVersions++
            }

            if ((expiredVersions ?? []).length > 0) {
                const versionIds = (expiredVersions ?? []).map((v: { id: string }) => v.id)
                await db.from('file_versions').delete().in('id', versionIds)
            }
        }

        // ── Update workspace storage counter ─────────────────────────

        if (freedBytes > 0) {
            const newSize = Math.max(0, Number(ws.storage_used_bytes) - freedBytes)
            await db.from('workspaces').update({ storage_used_bytes: newSize }).eq('id', ws.id)
        }

        results[ws.id] = { purgedItems, purgedVersions, freedBytes }
    }

    console.log('[cleanup] Completed:', results)
    return NextResponse.json({ success: true, results })
}
