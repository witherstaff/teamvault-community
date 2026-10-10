import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'
import { z } from 'zod'

const schema = z.object({
    workspace_id: z.string().uuid(),
    parent_id: z.string().uuid(),
})

/**
 * GET /api/admin/recycle-bin/path?workspace_id=<id>&parent_id=<id>
 *
 * Resolves a human-readable folder path for any vault_object, including
 * deleted ones. Used by the recycle bin UI to show item origin.
 * Admin only.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const raw = Object.fromEntries(req.nextUrl.searchParams)
        const { workspace_id, parent_id } = schema.parse(raw)

        const membership = await requireMembership(session.userId, workspace_id)
        if (membership.role !== 'admin') {
            return NextResponse.json({ error: 'Admin only' }, { status: 403 })
        }

        const db = getAdminClient()
        const segments: string[] = []
        let currentId: string | null = parent_id

        while (currentId) {
            const { data } = await db
                .from('vault_objects')
                .select('name, parent_id, workspace_id')
                .eq('id', currentId)
                .single()

            const folder = data as { name: string; parent_id: string | null; workspace_id: string } | null
            if (!folder || folder.workspace_id !== workspace_id) break
            if (folder.name !== '/') segments.unshift(folder.name)
            currentId = folder.parent_id
        }

        return NextResponse.json({ path: segments.length > 0 ? segments.join(' / ') : '/' })
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        console.error('[admin/recycle-bin/path]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
