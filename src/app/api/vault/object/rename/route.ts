import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { requireSameWorkspace } from '@/lib/access'
import { getAdminClient } from '@/db'
import { renameObjectSchema } from '@/lib/validation'
import { logAuditEvent } from '@/lib/audit'
import { z } from 'zod'

export async function POST(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const body = renameObjectSchema.parse(await req.json())
        const { workspace_id, object_id, name } = body
        const membership = await requireMembership(session.userId, workspace_id)
        if (membership.role !== 'admin') {
            return NextResponse.json({ error: 'Admin only' }, { status: 403 })
        }
        await requireSameWorkspace(object_id, workspace_id)

        const db = getAdminClient()

        const { data: actor } = await db.from('users').select('name, email').eq('id', session.userId).single()

        // Fetch old name first
        const { data: oldObj } = await db.from('vault_objects').select('name').eq('id', object_id).single()

        if (oldObj?.name === 'Verified Downloads') {
            return NextResponse.json({ error: 'System folders cannot be renamed.' }, { status: 403 })
        }

        const { data, error } = await db
            .from('vault_objects')
            .update({ name })
            .eq('id', object_id)
            .eq('is_deleted', false)
            .select()
            .single()

        if (error || !data) {
            return NextResponse.json({ error: 'Object not found' }, { status: 404 })
        }

        logAuditEvent({
            workspaceId: workspace_id, actorUserId: session.userId, actorName: actor?.name, actorEmail: actor?.email,
            action: 'OBJECT_RENAMED', objectId: object_id, result: 'allowed',
            metadata: { old_name: oldObj?.name, new_name: name }, request: req,
        })

        return NextResponse.json(data)
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        console.error('[vault/object/rename]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
