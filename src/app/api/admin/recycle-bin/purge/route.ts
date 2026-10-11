import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'
import { recycleBinPurgeSchema } from '@/lib/validation'
import { deleteObject } from '@/lib/storage'
import { logAuditEvent } from '@/lib/audit'
import { z } from 'zod'

export async function POST(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const body = recycleBinPurgeSchema.parse(await req.json())
        const { workspace_id, object_id } = body

        const membership = await requireMembership(session.userId, workspace_id)
        if (membership.role !== 'admin') {
            return NextResponse.json({ error: 'Admin only' }, { status: 403 })
        }

        const db = getAdminClient()

        const { data: actor } = await db.from('users').select('name, email').eq('id', session.userId).single()

        const { data: obj } = await db
            .from('vault_objects')
            .select('id, name, type, workspace_id, is_deleted, storage_key, size_bytes')
            .eq('id', object_id)
            .eq('workspace_id', workspace_id)
            .single()

        if (!obj || !obj.is_deleted) {
            return NextResponse.json({ error: 'Item not found in recycle bin' }, { status: 404 })
        }

        if (obj.type === 'file') {
            // Fetch all versions before CASCADE deletes them
            const { data: versions } = await db
                .from('file_versions')
                .select('storage_key, size_bytes')
                .eq('object_id', object_id)

            if (obj.storage_key) await deleteObject(obj.storage_key).catch(console.error)
            await Promise.all((versions ?? []).map(v =>
                v.storage_key ? deleteObject(v.storage_key).catch(console.error) : null
            ))

            const totalFreed = Number(obj.size_bytes || 0) +
                (versions ?? []).reduce((acc, v) => acc + Number(v.size_bytes || 0), 0)

            if (totalFreed > 0) {
                const { data: ws } = await db.from('workspaces').select('storage_used_bytes').eq('id', workspace_id).single()
                if (ws) {
                    const newSize = Math.max(0, Number(ws.storage_used_bytes) - totalFreed)
                    await db.from('workspaces').update({ storage_used_bytes: newSize }).eq('id', workspace_id)
                }
            }
        } else {
            // Folder purge: use get_all_descendants to find all files under THIS folder
            let descendantIds: string[] = []
            try {
                const { data: descendants, error: rpcErr } = await db.rpc('get_all_descendants', { p_folder_id: object_id })
                if (!rpcErr && descendants) {
                    descendantIds = descendants.map((r: { id: string }) => r.id)
                }
            } catch {
                // ignore
            }

            // Fallback: If RPC is not available, query direct children in this folder
            if (descendantIds.length === 0) {
                const { data: directChildren } = await db
                    .from('vault_objects')
                    .select('id')
                    .eq('parent_id', object_id)
                descendantIds = (directChildren || []).map(c => c.id)
            }

            if (descendantIds.length > 0) {
                const { data: descendantFiles } = await db
                    .from('vault_objects')
                    .select('id, storage_key, size_bytes')
                    .in('id', descendantIds)
                    .eq('type', 'file')

                const fileIds = (descendantFiles ?? []).filter(f => f.storage_key).map(f => f.id)

                // Fetch all versions for descendant files before CASCADE deletes them
                const { data: fileVersions } = fileIds.length > 0
                    ? await db.from('file_versions').select('storage_key, size_bytes').in('object_id', fileIds)
                    : { data: [] }

                await Promise.all([
                    ...(descendantFiles ?? []).map(f =>
                        f.storage_key ? deleteObject(f.storage_key).catch(console.error) : null
                    ),
                    ...(fileVersions ?? []).map(v =>
                        v.storage_key ? deleteObject(v.storage_key).catch(console.error) : null
                    ),
                ])
            }
        }

        // Hard-delete the DB row — CASCADE removes all descendants and their file_versions
        await db.from('vault_objects').delete().eq('id', object_id)

        // Accurately synchronize workspace storage counter with remaining files
        const { data: remainingObjects } = await db
            .from('vault_objects')
            .select('size_bytes')
            .eq('workspace_id', workspace_id)
            .eq('type', 'file')
            .not('checksum_sha256', 'is', null)

        const remainingObjectBytes = (remainingObjects || []).reduce((acc: number, o: any) => acc + Number(o.size_bytes || 0), 0)

        let remainingVersionBytes = 0
        try {
            const { data: remainingVersions } = await db
                .from('file_versions')
                .select('size_bytes, vault_objects!inner(workspace_id)')
                .eq('vault_objects.workspace_id', workspace_id)
            remainingVersionBytes = (remainingVersions || []).reduce((acc: number, v: any) => acc + Number(v.size_bytes || 0), 0)
        } catch {
            // ignore
        }

        const remainingTotal = remainingObjectBytes + remainingVersionBytes
        await db.from('workspaces').update({ storage_used_bytes: remainingTotal }).eq('id', workspace_id)

        logAuditEvent({
            workspaceId: workspace_id,
            actorUserId: session.userId,
            actorName: actor?.name,
            actorEmail: actor?.email,
            action: obj.type === 'file' ? 'FILE_PURGED' : 'FOLDER_PURGED',
            objectId: object_id,
            result: 'allowed',
            metadata: { name: obj.name },
            request: req,
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        console.error('[admin/recycle-bin/purge]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
