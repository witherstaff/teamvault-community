import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'
import { z } from 'zod'

const querySchema = z.object({
    workspace_id: z.string().uuid()
})

export async function GET(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const url = new URL(req.url)
        const { workspace_id } = querySchema.parse({ workspace_id: url.searchParams.get('workspace_id') })

        // Everyone in the workspace can view storage usage
        await requireMembership(session.userId, workspace_id)

        const db = getAdminClient()
        const { data, error } = await db
            .from('workspaces')
            .select('plan_id, storage_limit_bytes, storage_used_bytes')
            .eq('id', workspace_id)
            .single()

        if (error || !data) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

        const { data: rootFolder } = await db
            .from('vault_objects')
            .select('id')
            .eq('workspace_id', workspace_id)
            .eq('name', '/')
            .eq('type', 'folder')
            .is('parent_id', null)
            .single()

        return NextResponse.json({
            plan_id: data.plan_id,
            storage_limit_bytes: Number(data.storage_limit_bytes),
            storage_used_bytes: Number(data.storage_used_bytes),
            root_folder_id: rootFolder?.id || null
        })
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        console.error('[vault/workspace-info]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
