import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'
import { createFolderSchema } from '@/lib/validation'
import { logAuditEvent } from '@/lib/audit'
import { z } from 'zod'

export async function POST(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const body = createFolderSchema.parse(await req.json())
        const { workspace_id, parent_id, name } = body
        const membership = await requireMembership(session.userId, workspace_id)

        const db = getAdminClient()
        const { data: actor } = await db.from('users').select('name, email').eq('id', session.userId).single()

        if (!membership.can_upload && membership.role !== 'admin') {
            logAuditEvent({ workspaceId: workspace_id, actorUserId: session.userId, actorName: actor?.name, actorEmail: actor?.email, action: 'FOLDER_CREATED', result: 'denied', request: req })
            return NextResponse.json({ error: 'Folder creation not enabled for your account' }, { status: 403 })
        }

        const { data, error } = await db
            .from('vault_objects')
            .insert({ workspace_id, parent_id: parent_id ?? null, type: 'folder', name, created_by: session.userId })
            .select()
            .single()

        if (error) throw error

        logAuditEvent({ workspaceId: workspace_id, actorUserId: session.userId, actorName: actor?.name, actorEmail: actor?.email, action: 'FOLDER_CREATED', objectId: data.id, result: 'allowed', metadata: { folder_name: name }, request: req })
        return NextResponse.json(data, { status: 201 })
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        console.error('[vault/folder/create]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

