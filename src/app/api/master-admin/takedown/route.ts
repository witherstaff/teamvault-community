import { NextRequest, NextResponse } from 'next/server'
import { getTeamVaultSession } from '@/lib/auth'
import { isMasterAdmin } from '@/lib/config'
import { getAdminClient } from '@/db'
import { logAuditEvent } from '@/lib/audit'

export async function POST(req: NextRequest) {
    try {
        const session = await getTeamVaultSession(req)
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        if (!isMasterAdmin(session.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        const body = await req.json().catch(() => ({}))
        const { workspaceId, objectId, action, reason = 'AUP violation / suspected abuse' } = body

        if (!action) {
            return NextResponse.json(
                { error: 'action is required (purge_file, suspend_workspace, revoke_all_keys)' },
                { status: 422 }
            )
        }

        const db = getAdminClient()

        if (action === 'purge_file') {
            if (!objectId) {
                return NextResponse.json({ error: 'objectId is required for purge_file action' }, { status: 422 })
            }

            const { data: obj } = await db.from('vault_objects').select('workspace_id, name').eq('id', objectId).single()
            if (!obj) {
                return NextResponse.json({ error: 'Object not found' }, { status: 404 })
            }

            // Soft-delete / purge file
            await db
                .from('vault_objects')
                .update({
                    is_deleted: true,
                    deleted_at: new Date().toISOString(),
                    deleted_by: session.userId,
                })
                .eq('id', objectId)

            logAuditEvent({
                workspaceId: obj.workspace_id,
                actorUserId: session.userId,
                actorEmail: session.email,
                action: 'AGENT_TAKEDOWN_EXECUTED',
                objectId,
                result: 'allowed',
                metadata: {
                    takedownAction: 'purge_file',
                    fileName: obj.name,
                    reason,
                    executedBy: session.email,
                },
                request: req,
            })

            return NextResponse.json({
                success: true,
                message: `File ${obj.name} (${objectId}) has been taken down and purged.`,
            })
        } else if (action === 'suspend_workspace') {
            if (!workspaceId) {
                return NextResponse.json({ error: 'workspaceId is required for suspend_workspace action' }, { status: 422 })
            }

            // Suspend agent account
            await db.from('agent_accounts').update({ status: 'suspended' }).eq('workspace_id', workspaceId)

            // Revoke all machine agent keys and viewer keys
            await Promise.all([
                db.from('agent_api_keys').update({ is_revoked: true }).eq('workspace_id', workspaceId),
                db.from('agent_viewer_keys').update({ is_revoked: true }).eq('workspace_id', workspaceId),
            ])

            logAuditEvent({
                workspaceId,
                actorUserId: session.userId,
                actorEmail: session.email,
                action: 'AGENT_TAKEDOWN_EXECUTED',
                result: 'allowed',
                metadata: {
                    takedownAction: 'suspend_workspace',
                    reason,
                    executedBy: session.email,
                },
                request: req,
            })

            return NextResponse.json({
                success: true,
                message: `Workspace ${workspaceId} has been suspended and all active keys have been revoked.`,
            })
        } else if (action === 'revoke_all_keys') {
            if (!workspaceId) {
                return NextResponse.json({ error: 'workspaceId is required for revoke_all_keys action' }, { status: 422 })
            }

            await Promise.all([
                db.from('agent_api_keys').update({ is_revoked: true }).eq('workspace_id', workspaceId),
                db.from('agent_viewer_keys').update({ is_revoked: true }).eq('workspace_id', workspaceId),
            ])

            logAuditEvent({
                workspaceId,
                actorUserId: session.userId,
                actorEmail: session.email,
                action: 'AGENT_KEY_REVOKED',
                result: 'allowed',
                metadata: {
                    reason,
                    allKeysRevoked: true,
                    executedBy: session.email,
                },
                request: req,
            })

            return NextResponse.json({
                success: true,
                message: `All machine and viewer keys for workspace ${workspaceId} have been revoked.`,
            })
        }

        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    } catch (err: any) {
        console.error('[master-admin/takedown]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
