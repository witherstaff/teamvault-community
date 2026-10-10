import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { requireSameWorkspace } from '@/lib/access'
import { getAdminClient } from '@/db'
import { logAuditEvent } from '@/lib/audit'
import { resolveFolderPath } from '@/lib/folder-path'
import { z } from 'zod'

const schema = z.object({
    workspace_id: z.string().uuid(),
    object_id: z.string().uuid(),
})

export async function POST(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const body = schema.parse(await req.json())
        const { workspace_id, object_id } = body
        await requireMembership(session.userId, workspace_id)
        await requireSameWorkspace(object_id, workspace_id)

        const db = getAdminClient()
        const { data: obj } = await db
            .from('vault_objects')
            .select('name, parent_id, is_deleted')
            .eq('id', object_id)
            .single()

        if (!obj || obj.is_deleted) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 })
        }

        const [folder_path, actor] = await Promise.all([
            resolveFolderPath(obj.parent_id ?? null),
            db.from('users').select('name, email').eq('id', session.userId).single().then(r => r.data),
        ])

        logAuditEvent({
            workspaceId: workspace_id,
            actorUserId: session.userId,
            actorName: actor?.name,
            actorEmail: actor?.email,
            action: 'FILE_LINK_COPIED',
            objectId: object_id,
            result: 'allowed',
            metadata: { filename: obj.name, folder_path },
            request: req,
        })

        return NextResponse.json({ ok: true })
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        console.error('[vault/file/copy-link]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
