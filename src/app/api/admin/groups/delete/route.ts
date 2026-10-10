import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'
import { deleteGroupSchema } from '@/lib/validation'
import { logAuditEvent } from '@/lib/audit'
import { z } from 'zod'

export async function POST(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const body = deleteGroupSchema.parse(await req.json())
        const membership = await requireMembership(session.userId, body.workspace_id)
        if (membership.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

        const db = getAdminClient()

        // Prevent deleting system groups
        const { data: group } = await db.from('groups').select('is_system').eq('id', body.group_id).single()
        if (group?.is_system) return NextResponse.json({ error: 'Cannot delete system group' }, { status: 400 })

        const { error } = await db.from('groups').delete().match({ id: body.group_id, workspace_id: body.workspace_id }).eq('is_system', false)
        if (error) throw error

        const { data: actor } = await db.from('users').select('name, email').eq('id', session.userId).single()
        logAuditEvent({ workspaceId: body.workspace_id, actorUserId: session.userId, actorName: actor?.name, actorEmail: actor?.email, action: 'GROUP_DELETED', targetGroupId: body.group_id, result: 'allowed', request: req })

        return NextResponse.json({ success: true })
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

