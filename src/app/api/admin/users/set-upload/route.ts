import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'
import { setUploadSchema } from '@/lib/validation'
import { logAuditEvent } from '@/lib/audit'
import { z } from 'zod'

export async function POST(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const body = setUploadSchema.parse(await req.json())
        const { workspace_id, user_id, can_upload } = body
        const membership = await requireMembership(session.userId, workspace_id)
        if (membership.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

        const db = getAdminClient()
        const { error } = await db.from('memberships').update({ can_upload }).eq('workspace_id', workspace_id).eq('user_id', user_id)
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
        const { data: actor } = await db.from('users').select('name, email').eq('id', session.userId).single()

        logAuditEvent({ workspaceId: workspace_id, actorUserId: session.userId, actorName: actor?.name, actorEmail: actor?.email, action: 'UPLOAD_TOGGLED', targetUserId: user_id, result: 'allowed', metadata: { can_upload }, request: req })

        return NextResponse.json({ success: true })
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

