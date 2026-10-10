import { NextResponse, NextRequest } from 'next/server'
import { getAdminClient } from '@/db'
import { requireBearerSession } from '@/lib/desktop-auth'
import { checkFolderAccess } from '@/lib/access'
import { requireMembership } from '@/lib/auth'
import { VERIFIED_DOWNLOADS_FOLDER_NAMES } from '@/lib/config'

/**
 * GET /api/desktop/sync/tree?workspaceId=<id>&updatedAfter=<iso_string>
 * 
 * Returns the folder/file structure for the given workspace.
 * If `updatedAfter` is provided, returns only objects created/updated after that timestamp.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await requireBearerSession(req)

        const url = new URL(req.url)
        const workspaceId = url.searchParams.get('workspaceId')
        const updatedAfterStr = url.searchParams.get('updatedAfter')

        if (!workspaceId) {
            return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })
        }

        // 1. Verify membership
        const membership = await requireMembership(session.userId, workspaceId)
        const isAdmin = membership.role === 'admin'

        // 2. Query objects
        const db = getAdminClient()

        let query = db
            .from('vault_objects')
            .select('id, parent_id, type, name, size_bytes, mime_type, checksum_sha256, updated_at, is_deleted')
            .eq('workspace_id', workspaceId)
            .eq('is_deleted', false)

        if (updatedAfterStr) {
            const updatedAfter = new Date(updatedAfterStr)
            if (!isNaN(updatedAfter.getTime())) {
                query = query.gt('updated_at', updatedAfter.toISOString())
            }
        }

        const { data: objects, error } = await query

        if (error) {
            console.error('[SYNC_TREE] Database error:', error)
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
        }

        // 3. Filter out "Verified Downloads" and all its children.
        // We do this by discovering the ID(s) of the verified downloads folders,
        // then finding all descendants.
        let accessibleObjects = objects || []

        if (accessibleObjects.length > 0) {
            const verifiedFolderIds = new Set<string>()

            // First pass: find the top-level Verified Downloads folders
            for (const obj of accessibleObjects) {
                if (obj.type === 'folder' && VERIFIED_DOWNLOADS_FOLDER_NAMES.includes(obj.name.toLowerCase().trim())) {
                    verifiedFolderIds.add(obj.id)
                }
            }

            // Second pass: iteratively find all children of these folders
            let foundNewChildren = true
            while (foundNewChildren) {
                foundNewChildren = false
                for (const obj of accessibleObjects) {
                    if (obj.parent_id && verifiedFolderIds.has(obj.parent_id) && !verifiedFolderIds.has(obj.id)) {
                        verifiedFolderIds.add(obj.id)
                        foundNewChildren = true
                    }
                }
            }

            // Finally filter out all items that are Verified Downloads folders or their children
            accessibleObjects = accessibleObjects.filter(obj => !verifiedFolderIds.has(obj.id))
        }

        // 4. Filter for access (User must have access to each returned object)
        // Optimization: Admin sees everything. Regular users need checkFolderAccess.

        if (!isAdmin && accessibleObjects.length > 0) {
            const accessChecks = await Promise.all(
                accessibleObjects.map(obj => checkFolderAccess(session.userId, workspaceId, obj.id, isAdmin))
            )
            accessibleObjects = accessibleObjects.filter((_, i) => accessChecks[i])
        }

        return NextResponse.json({
            objects: accessibleObjects,
            canUpload: membership.can_upload
        })

    } catch (error: any) {
        if (error.message === 'Unauthorized' || error.message === 'Forbidden' || error.message === 'Account disabled') {
            return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
        }
        console.error('[SYNC_TREE] Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
