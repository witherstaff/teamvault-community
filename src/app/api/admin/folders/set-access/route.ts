import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'
import { setFolderAccessSchema } from '@/lib/validation'
import { logAuditEvent } from '@/lib/audit'
import { z } from 'zod'

export async function POST(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const body = setFolderAccessSchema.parse(await req.json())
        const { workspace_id, folder_id, allow_users, allow_groups } = body
        const membership = await requireMembership(session.userId, workspace_id)
        if (membership.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

        const db = getAdminClient()

        // Replace ACL for this folder in a transaction-like sequence
        await db.from('folder_access').delete().eq('folder_id', folder_id).eq('workspace_id', workspace_id)

        const entries = [
            ...allow_users.map((uid) => ({ workspace_id, folder_id, subject_type: 'user' as const, subject_id: uid })),
            ...allow_groups.map((gid) => ({ workspace_id, folder_id, subject_type: 'group' as const, subject_id: gid })),
        ]

        if (entries.length > 0) {
            const { error } = await db.from('folder_access').insert(entries)
            if (error) return NextResponse.json({ error: error.message }, { status: 400 })
        }

        const { data: actor } = await db.from('users').select('name, email').eq('id', session.userId).single()
        const { data: folder } = await db.from('vault_objects').select('name').eq('id', folder_id).single()

        logAuditEvent({
            workspaceId: workspace_id, actorUserId: session.userId, actorName: actor?.name, actorEmail: actor?.email,
            action: 'FOLDER_ACCESS_CHANGED', objectId: folder_id,
            result: 'allowed', metadata: { folder_name: folder?.name, allow_users, allow_groups }, request: req,
        })
        return NextResponse.json({ success: true })
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

