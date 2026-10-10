import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'
import { createGroupSchema } from '@/lib/validation'
import { logAuditEvent } from '@/lib/audit'
import { z } from 'zod'

export async function POST(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const body = createGroupSchema.parse(await req.json())
        const membership = await requireMembership(session.userId, body.workspace_id)
        if (membership.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

        const db = getAdminClient()
        const { error } = await db.from('groups').insert({ workspace_id: body.workspace_id, name: body.name })
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })

        const { data: actor } = await db.from('users').select('name, email').eq('id', session.userId).single()
        logAuditEvent({ workspaceId: body.workspace_id, actorUserId: session.userId, actorName: actor?.name, actorEmail: actor?.email, action: 'GROUP_CREATED', result: 'allowed', request: req })
        return NextResponse.json({ success: true }, { status: 201 })
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

