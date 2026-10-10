import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'
import { setUserStatusSchema } from '@/lib/validation'
import { logAuditEvent } from '@/lib/audit'
import { z } from 'zod'

export async function POST(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const body = setUserStatusSchema.parse(await req.json())
        const { workspace_id, user_id, status } = body
        const membership = await requireMembership(session.userId, workspace_id)
        if (membership.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

        const db = getAdminClient()

        // Guard: prevent disabling the last admin
        if (status === 'disabled') {
            const { data: target } = await db
                .from('memberships')
                .select('role')
                .eq('workspace_id', workspace_id)
                .eq('user_id', user_id)
                .single()

            if (target?.role === 'admin') {
                const { count } = await db
                    .from('memberships')
                    .select('user_id', { count: 'exact', head: true })
                    .eq('workspace_id', workspace_id)
                    .eq('role', 'admin')
                    .eq('status', 'active')

                if ((count ?? 0) <= 1) {
                    return NextResponse.json(
                        { error: 'Cannot disable the last admin. Promote another user to admin first.' },
                        { status: 409 }
                    )
                }
            }
        }

        const { error } = await db.from('memberships').update({ status }).eq('workspace_id', workspace_id).eq('user_id', user_id)
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
        const { data: actor } = await db.from('users').select('name, email').eq('id', session.userId).single()

        logAuditEvent({ workspaceId: workspace_id, actorUserId: session.userId, actorName: actor?.name, actorEmail: actor?.email, action: status === 'disabled' ? 'USER_DISABLED' : 'USER_INVITED', targetUserId: user_id, result: 'allowed', request: req })

        return NextResponse.json({ success: true })
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

