import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'
import { z } from 'zod'
import { logAuditEvent } from '@/lib/audit'

const updateSchema = z.object({
    workspace_id: z.string().uuid(),
    name: z.string().min(1, "Name must be at least 1 character").max(50, "Name must be less than 50 characters"),
})

export async function POST(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const body = updateSchema.parse(await req.json())
        const membership = await requireMembership(session.userId, body.workspace_id)

        if (membership.role !== 'admin') {
            return NextResponse.json({ error: 'Admin only' }, { status: 403 })
        }

        const db = getAdminClient()

        // 1. Check for uniqueness (case-insensitive)
        const { data: existing } = await db
            .from('workspaces')
            .select('id')
            .ilike('name', body.name)
            .neq('id', body.workspace_id)
            .maybeSingle()

        if (existing) {
            return NextResponse.json({ error: `Workspace name "${body.name}" is already taken` }, { status: 400 })
        }

        // 2. Fetch current name for the audit log
        const { data: oldWorkspace } = await db
            .from('workspaces')
            .select('name')
            .eq('id', body.workspace_id)
            .single()

        // 3. Update the name
        const { error: updateError } = await db
            .from('workspaces')
            .update({ name: body.name })
            .eq('id', body.workspace_id)

        if (updateError) {
            throw updateError
        }

        // 4. Log the audit event
        const { data: actor } = await db.from('users').select('name, email').eq('id', session.userId).single()

        logAuditEvent({
            workspaceId: body.workspace_id,
            actorUserId: session.userId,
            actorName: actor?.name,
            actorEmail: actor?.email,
            action: 'WORKSPACE_RENAMED',
            result: 'allowed',
            metadata: { old_name: oldWorkspace?.name, new_name: body.name },
            request: req
        })

        return NextResponse.json({ success: true, name: body.name })

    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
        console.error('[admin/workspace/update]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
