import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'
import { recycleBinRestoreSchema } from '@/lib/validation'
import { logAuditEvent } from '@/lib/audit'
import { z } from 'zod'

export async function POST(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const body = recycleBinRestoreSchema.parse(await req.json())
        const { workspace_id, object_id } = body

        const membership = await requireMembership(session.userId, workspace_id)
        if (membership.role !== 'admin') {
            return NextResponse.json({ error: 'Admin only' }, { status: 403 })
        }

        const db = getAdminClient()

        const { data: actor } = await db.from('users').select('name, email').eq('id', session.userId).single()

        const { data: obj } = await db
            .from('vault_objects')
            .select('id, name, type, parent_id, workspace_id, is_deleted')
            .eq('id', object_id)
            .eq('workspace_id', workspace_id)
            .single()

        if (!obj || !obj.is_deleted) {
            return NextResponse.json({ error: 'Item not found in recycle bin' }, { status: 404 })
        }

        // If the item has a parent folder, make sure it is not itself deleted
        if (obj.parent_id) {
            const { data: parent } = await db
                .from('vault_objects')
                .select('id, is_deleted')
                .eq('id', obj.parent_id)
                .single()

            if (!parent || parent.is_deleted) {
                return NextResponse.json({
                    error: 'Parent folder is in the recycle bin. Restore the parent folder first.',
                }, { status: 409 })
            }

            // Check for a name collision in the destination folder
            const { data: collision } = await db
                .from('vault_objects')
                .select('id')
                .eq('workspace_id', workspace_id)
                .eq('parent_id', obj.parent_id)
                .eq('name', obj.name)
                .eq('is_deleted', false)
                .maybeSingle()

            if (collision) {
                // Suffix the name to avoid collision
                const now = new Date().toISOString().slice(0, 10)
                const dotIndex = obj.name.lastIndexOf('.')
                const suffixed = dotIndex > 0
                    ? `${obj.name.slice(0, dotIndex)} (restored ${now})${obj.name.slice(dotIndex)}`
                    : `${obj.name} (restored ${now})`

                await db
                    .from('vault_objects')
                    .update({ is_deleted: false, deleted_at: null, deleted_by: null, name: suffixed })
                    .eq('id', object_id)
            } else {
                await db
                    .from('vault_objects')
                    .update({ is_deleted: false, deleted_at: null, deleted_by: null })
                    .eq('id', object_id)
            }
        } else {
            await db
                .from('vault_objects')
                .update({ is_deleted: false, deleted_at: null, deleted_by: null })
                .eq('id', object_id)
        }

        logAuditEvent({
            workspaceId: workspace_id,
            actorUserId: session.userId,
            actorName: actor?.name,
            actorEmail: actor?.email,
            action: obj.type === 'file' ? 'FILE_RESTORED' : 'FOLDER_RESTORED',
            objectId: object_id,
            result: 'allowed',
            metadata: { name: obj.name },
            request: req,
        })

        return NextResponse.json({ success: true, objectId: object_id })
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        console.error('[admin/recycle-bin/restore]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
