import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { requireSameWorkspace, requireFolderAccess } from '@/lib/access'
import { getAdminClient } from '@/db'
import { deleteObjectSchema } from '@/lib/validation'
import { logAuditEvent } from '@/lib/audit'
import { z } from 'zod'

export async function POST(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const body = deleteObjectSchema.parse(await req.json())
        const { workspace_id, object_id, recursive } = body
        const membership = await requireMembership(session.userId, workspace_id)
        const isAdmin = membership.role === 'admin'

        // Recursive deletion is admin-only — too destructive for regular users
        if (recursive && !isAdmin) {
            return NextResponse.json({ error: 'Recursive deletion requires admin role' }, { status: 403 })
        }

        // Non-admin users must have upload permission to delete
        if (!isAdmin && !membership.can_upload) {
            return NextResponse.json({ error: 'Upload permission required to delete files' }, { status: 403 })
        }

        await requireSameWorkspace(object_id, workspace_id)

        const db = getAdminClient()

        const { data: actor } = await db.from('users').select('name, email').eq('id', session.userId).single()

        const { data: obj } = await db
            .from('vault_objects')
            .select('type, name, parent_id, is_deleted')
            .eq('id', object_id)
            .single()

        if (!obj || obj.is_deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        // System folder protection — admin-only
        if (obj.type === 'folder' && obj.name === 'Verified Downloads') {
            return NextResponse.json({ error: 'System folders cannot be deleted.' }, { status: 403 })
        }

        // Check folder access on the parent (or the object itself if it is the parent)
        const accessCheckId = obj.parent_id ?? object_id
        await requireFolderAccess(session.userId, workspace_id, accessCheckId, isAdmin)

        const now = new Date().toISOString()
        const softDelete = { is_deleted: true, deleted_at: now, deleted_by: session.userId }

        if (obj.type === 'file') {
            // Soft-delete only — R2 object is retained in the recycle bin
            await db.from('vault_objects').update(softDelete).eq('id', object_id)

            logAuditEvent({ workspaceId: workspace_id, actorUserId: session.userId, actorName: actor?.name, actorEmail: actor?.email, action: 'FILE_DELETED', objectId: object_id, result: 'allowed', metadata: { file_name: obj.name }, request: req })
        } else {
            // Folder delete
            if (!recursive) {
                const { count } = await db
                    .from('vault_objects')
                    .select('id', { count: 'exact', head: true })
                    .eq('parent_id', object_id)
                    .eq('is_deleted', false)
                if ((count ?? 0) > 0) {
                    return NextResponse.json({ error: 'Folder is not empty. Use recursive=true to delete.' }, { status: 409 })
                }
                await db.from('vault_objects').update(softDelete).eq('id', object_id)
            } else {
                // Collect all descendants and soft-delete them together with the folder (admin-only, guarded above)
                const { data: descendants } = await db.rpc('get_all_descendants', { p_folder_id: object_id })
                const ids: string[] = [(descendants ?? []).map((r: { id: string }) => r.id), object_id].flat()
                await db.from('vault_objects').update(softDelete).in('id', ids)
            }
            logAuditEvent({ workspaceId: workspace_id, actorUserId: session.userId, actorName: actor?.name, actorEmail: actor?.email, action: 'FOLDER_DELETED', objectId: object_id, result: 'allowed', metadata: { folder_name: obj.name, recursive }, request: req })
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        console.error('[vault/object/delete]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
