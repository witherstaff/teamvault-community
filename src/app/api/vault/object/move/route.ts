import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { requireSameWorkspace } from '@/lib/access'
import { getAdminClient } from '@/db'
import { moveBatchSchema } from '@/lib/validation'
import { logAuditEvent } from '@/lib/audit'
import { z } from 'zod'
import { VERIFIED_DOWNLOADS_FOLDER_NAME, VERIFIED_DOWNLOADS_ALLOWED_EXTENSIONS, isAllowedInVerifiedDownloads, isVerifiedDownloadsFolder } from '@/lib/config'
import { resolveUniqueName } from '@/lib/verified-rename'

export async function POST(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const body = moveBatchSchema.parse(await req.json())
        const { workspace_id, object_ids, parent_id } = body
        const membership = await requireMembership(session.userId, workspace_id)
        if (membership.role !== 'admin') {
            return NextResponse.json({ error: 'Admin only' }, { status: 403 })
        }

        for (const oid of object_ids) {
            await requireSameWorkspace(oid, workspace_id)
        }
        if (parent_id) {
            await requireSameWorkspace(parent_id, workspace_id)
        }

        const db = getAdminClient()
        const { data: actor } = await db.from('users').select('name, email').eq('id', session.userId).single()

        // Check if any of the items being moved is the system folder (use canonical name from config)
        const { data: systemFolders } = await db
            .from('vault_objects')
            .select('id')
            .in('id', object_ids)
            .eq('name', VERIFIED_DOWNLOADS_FOLDER_NAME)
            .eq('type', 'folder')
            .limit(1)

        if (systemFolders && systemFolders.length > 0) {
            return NextResponse.json({ error: 'System folders cannot be moved.' }, { status: 403 })
        }

        // Check whether the destination is inside "Verified Downloads".
        // If so, only files with allowed extensions may be moved there.
        const destIsInVerifiedDownloads = await (async () => {
            let folderId: string | null = parent_id ?? null
            while (folderId) {
                const { data: folder } = await db
                    .from('vault_objects')
                    .select('id, name, parent_id')
                    .eq('id', folderId)
                    .single() as { data: { id: string; name: string; parent_id: string | null } | null }
                if (!folder) break
                if (isVerifiedDownloadsFolder(folder.name)) return true
                folderId = folder.parent_id ?? null
            }
            return false
        })()

        if (destIsInVerifiedDownloads) {
            // Fetch names of all objects being moved so we can check extensions.
            const { data: movingObjects } = await db
                .from('vault_objects')
                .select('id, name, type')
                .in('id', object_ids)
                .eq('workspace_id', workspace_id)

            const badFiles = (movingObjects ?? []).filter(
                (o: { id: string; name: string; type: string }) =>
                    o.type === 'file' && !isAllowedInVerifiedDownloads(o.name)
            )

            if (badFiles.length > 0) {
                const allowed = VERIFIED_DOWNLOADS_ALLOWED_EXTENSIONS.join(', ')
                const names = badFiles.map((f: { name: string }) => f.name).join(', ')
                return NextResponse.json(
                    { error: `Only ${allowed} files are allowed in Verified Downloads. Rejected: ${names}` },
                    { status: 415 }
                )
            }
        }

        if (destIsInVerifiedDownloads) {
            // Move each file individually so we can auto-rename on conflict
            const { data: movingObjects } = await db
                .from('vault_objects')
                .select('id, name, type')
                .in('id', object_ids)
                .eq('workspace_id', workspace_id)

            const renames: Array<{ original: string; resolved: string }> = []

            for (const obj of movingObjects ?? []) {
                const newName = obj.type === 'file'
                    ? await resolveUniqueName(parent_id ?? '', workspace_id, obj.name)
                    : obj.name
                if (newName !== obj.name) renames.push({ original: obj.name, resolved: newName })
                await db
                    .from('vault_objects')
                    .update({ parent_id, name: newName })
                    .eq('id', obj.id)
                    .eq('workspace_id', workspace_id)
                    .eq('is_deleted', false)
            }

            logAuditEvent({
                workspaceId: workspace_id, actorUserId: session.userId, actorName: actor?.name, actorEmail: actor?.email,
                action: 'OBJECT_MOVED_BATCH', objectId: object_ids[0], result: 'allowed',
                metadata: { object_ids, new_parent_id: parent_id }, request: req,
            })

            return NextResponse.json({ success: true, renames })
        } else {
            const { data, error } = await db
                .from('vault_objects')
                .update({ parent_id })
                .in('id', object_ids)
                .eq('workspace_id', workspace_id)
                .eq('is_deleted', false)
                .select()

            if (error || !data) {
                return NextResponse.json({ error: 'Failed to move objects' }, { status: 500 })
            }

            logAuditEvent({
                workspaceId: workspace_id, actorUserId: session.userId, actorName: actor?.name, actorEmail: actor?.email,
                action: 'OBJECT_MOVED_BATCH', objectId: object_ids[0], result: 'allowed',
                metadata: { object_ids, new_parent_id: parent_id }, request: req,
            })

            return NextResponse.json({ success: true, renames: [] })
        }
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        console.error('[vault/object/move]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
