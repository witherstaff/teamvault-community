import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { checkFolderAccess } from '@/lib/access'
import { getAdminClient } from '@/db'
import { getObjectSchema } from '@/lib/validation'
import { z } from 'zod'

export async function GET(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const raw = Object.fromEntries(req.nextUrl.searchParams)
        const params = getObjectSchema.parse(raw)

        const { userId } = session
        const { workspace_id, object_id } = params
        const membership = await requireMembership(userId, workspace_id)
        const db = getAdminClient()
        const isAdmin = membership.role === 'admin'

        // Fetch the object directly
        const { data: item, error } = await db
            .from('vault_objects')
            .select('id, type, name, size_bytes, mime_type, created_at, parent_id, workspace_id')
            .eq('id', object_id)
            .eq('workspace_id', workspace_id)
            .eq('is_deleted', false)
            .single()

        if (error || !item) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 })
        }

        // If not admin, check row-level/folder access
        if (!isAdmin) {
            const hasAccess = await checkFolderAccess(userId, workspace_id, item.type === 'folder' ? item.id : item.parent_id!, false)
            if (!hasAccess) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 })
            }
        }

        // Walk up the parent chain to build a human-readable folder path
        const pathSegments: string[] = []
        let parentId = item.parent_id
        while (parentId) {
            const { data: folder } = await db
                .from('vault_objects')
                .select('name, parent_id')
                .eq('id', parentId)
                .single()
            if (!folder) break
            if (folder.name !== '/') pathSegments.unshift(folder.name)
            parentId = folder.parent_id
        }
        const folder_path = pathSegments.length > 0 ? pathSegments.join(' / ') : null

        return NextResponse.json({ ...item, folder_path })
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        console.error('[vault/object/info]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
