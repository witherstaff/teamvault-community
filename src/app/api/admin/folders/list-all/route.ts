import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'

export async function GET(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const workspace_id = req.nextUrl.searchParams.get('workspace_id')

        if (!workspace_id) {
            return NextResponse.json({ error: 'Missing workspace_id' }, { status: 400 })
        }

        const membership = await requireMembership(session.userId, workspace_id)
        if (membership.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const db = getAdminClient()

        // Fetch all folders in the workspace
        const { data: allFolders, error } = await db
            .from('vault_objects')
            .select('id, name, parent_id')
            .eq('workspace_id', workspace_id)
            .eq('type', 'folder')
            .eq('is_deleted', false)

        if (error) throw error

        // Map for quick lookup
        const folderMap = new Map<string, { id: string; name: string; parent_id: string | null }>()
        allFolders.forEach(f => folderMap.set(f.id, f))

        // Reconstruct paths and filter
        const folderList = allFolders
            .filter(f => f.name !== '/') // Skip showing the root "/" folder itself
            .map(folder => {
                const pathParts: string[] = []
                let current = folder

                while (current) {
                    if (current.name !== '/') {
                        pathParts.unshift(current.name)
                    }
                    if (current.parent_id) {
                        current = folderMap.get(current.parent_id) || (null as any)
                    } else {
                        current = null as any
                    }
                }

                return {
                    id: folder.id,
                    name: folder.name,
                    path: pathParts.join(' / ') || '/'
                }
            })

        // Deduplicate by path (in case of redundant folder entries like duplicate Verified Downloads)
        const uniquePaths = new Map<string, { id: string; name: string; path: string }>()
        folderList.forEach(item => {
            if (!uniquePaths.has(item.path)) {
                uniquePaths.set(item.path, item)
            }
        })

        const result = Array.from(uniquePaths.values())

        // Sort alphabetically by path
        result.sort((a, b) => a.path.localeCompare(b.path))

        return NextResponse.json(result)
    } catch (err) {
        if (err instanceof Response) return err
        console.error('[admin/folders/list-all]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
