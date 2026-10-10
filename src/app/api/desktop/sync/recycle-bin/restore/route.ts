import { NextRequest, NextResponse } from 'next/server'
import { requireBearerSession } from '@/lib/desktop-auth'
import { requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'
import { logAuditEvent } from '@/lib/audit'

export async function POST(req: NextRequest) {
    try {
        const session = await requireBearerSession(req)
        const body = await req.json()
        const { workspaceId, objectId } = body

        if (!workspaceId || !objectId) {
            return NextResponse.json({ error: 'Missing workspaceId or objectId' }, { status: 400 })
        }

        const membership = await requireMembership(session.userId, workspaceId)
        if (membership.role !== 'admin') {
            return NextResponse.json({ error: 'Admin only' }, { status: 403 })
        }

        const db = getAdminClient()

        const { data: obj } = await db
            .from('vault_objects')
            .select('id, name, type, parent_id, workspace_id, is_deleted')
            .eq('id', objectId)
            .eq('workspace_id', workspaceId)
            .single()

        if (!obj || !obj.is_deleted) {
            return NextResponse.json({ error: 'Item not found in recycle bin' }, { status: 404 })
        }

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

            const { data: collision } = await db
                .from('vault_objects')
                .select('id')
                .eq('workspace_id', workspaceId)
                .eq('parent_id', obj.parent_id)
                .eq('name', obj.name)
                .eq('is_deleted', false)
                .maybeSingle()

            const restoredName = collision
                ? (() => {
                    const now = new Date().toISOString().slice(0, 10)
                    const dotIndex = obj.name.lastIndexOf('.')
                    return dotIndex > 0
                        ? `${obj.name.slice(0, dotIndex)} (restored ${now})${obj.name.slice(dotIndex)}`
                        : `${obj.name} (restored ${now})`
                })()
                : obj.name

            await db
                .from('vault_objects')
                .update({ is_deleted: false, deleted_at: null, deleted_by: null, name: restoredName })
                .eq('id', objectId)
        } else {
            await db
                .from('vault_objects')
                .update({ is_deleted: false, deleted_at: null, deleted_by: null })
                .eq('id', objectId)
        }

        logAuditEvent({
            workspaceId,
            actorUserId: session.userId,
            actorEmail: session.email,
            action: obj.type === 'file' ? 'FILE_RESTORED' : 'FOLDER_RESTORED',
            objectId,
            result: 'allowed',
            metadata: { name: obj.name },
            request: req,
        })

        return NextResponse.json({ success: true, objectId })
    } catch (error: any) {
        if (error.message === 'Unauthorized' || error.message === 'Forbidden' || error.message === 'Account disabled') {
            return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
        }
        console.error('[desktop/sync/recycle-bin/restore]', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
