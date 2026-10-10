import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'

export async function GET(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const workspace_id = req.nextUrl.searchParams.get('workspace_id')
        if (!workspace_id) return NextResponse.json({ error: 'Missing workspace_id' }, { status: 400 })

        // Check if user has access to this workspace
        await requireMembership(session.userId, workspace_id)

        const db = getAdminClient()

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
            if (parent.name === '/') return buildPath(parent.parent_id)

            const prefix = buildPath(parent.parent_id)
            return prefix ? `${prefix} / ${parent.name}` : parent.name
        }

        const itemsWithPaths = folders.map((item) => {
            if (item.name === '/') {
                return { ...item, path: '', full_path: '/' }
            }
            const path = buildPath(item.parent_id)
            const full_path = path ? `${path} / ${item.name}` : item.name
            return { ...item, path, full_path }
        })

        // Deduplicate by full path
        const uniquePaths = new Map()
        itemsWithPaths.forEach(item => {
            if (!uniquePaths.has(item.full_path)) {
                uniquePaths.set(item.full_path, item)
            }
        })

        const result = Array.from(uniquePaths.values())
        // Root "/" sorts first, everything else alphabetically
        result.sort((a, b) => {
            if (a.full_path === '/') return -1
            if (b.full_path === '/') return 1
            return a.full_path.localeCompare(b.full_path)
        })

        return NextResponse.json(result)
    } catch (err) {
        if (err instanceof Response) return err
        console.error('[vault/folders]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
