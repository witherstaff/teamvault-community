import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { checkFolderAccess } from '@/lib/access'
import { getAdminClient } from '@/db'
import { searchVaultSchema } from '@/lib/validation'
import { z } from 'zod'

export async function GET(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const raw = Object.fromEntries(req.nextUrl.searchParams)
        const params = searchVaultSchema.parse(raw)

        const { userId } = session
        const { workspace_id, query: searchQuery } = params
        const membership = await requireMembership(userId, workspace_id)
        const db = getAdminClient()
        const isAdmin = membership.role === 'admin'

        // Search for items matching the query in the workspace
        let query = db
            .from('vault_objects')
            .select('id, type, name, size_bytes, mime_type, created_at, parent_id, workspace_id')
            .eq('workspace_id', workspace_id)
            .eq('is_deleted', false)
            .ilike('name', `%${searchQuery}%`)
            .or('type.eq.folder,checksum_sha256.not.is.null')
            .order('type', { ascending: true }) // folders first
            .order('name', { ascending: true })
            .limit(100)

        const { data: items, error } = await query
        if (error) throw error

        // Fetch all folders to build paths
        const { data: folders, error: foldersError } = await db
            .from('vault_objects')
            .select('id, name, parent_id')
            .eq('workspace_id', workspace_id)
            .eq('type', 'folder')
            .eq('is_deleted', false)

        if (foldersError) throw foldersError

        const folderMap = new Map()
        for (const f of folders) {
            folderMap.set(f.id, f)
        }

        const buildPath = (parentId: string | null): string => {
            if (!parentId) return ''
            const parent = folderMap.get(parentId)
            if (!parent) return ''
            const parentPath = buildPath(parent.parent_id)
            if (parent.name === '/') return parentPath
            return parentPath ? parentPath + ' / ' + parent.name : parent.name
        }

        const itemsWithPaths = items.map((item) => ({
            ...item,
            path: buildPath(item.parent_id)
        }))

        // Filter by access for non-admins
        if (!isAdmin) {
            const accessChecks = await Promise.all(
                itemsWithPaths.map((item) =>
                    checkFolderAccess(userId, workspace_id, item.type === 'folder' ? item.id : item.parent_id!, false)
                        .then((ok) => ({ item, ok }))
                )
            )
            const visible = accessChecks.filter((r) => r.ok).map((r) => r.item)
            return NextResponse.json(visible)
        }

        return NextResponse.json(itemsWithPaths)


    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        console.error('[vault/search]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
