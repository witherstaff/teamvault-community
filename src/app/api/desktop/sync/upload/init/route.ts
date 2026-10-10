import { NextResponse, NextRequest } from 'next/server'
import { getAdminClient } from '@/db'
import { requireBearerSession } from '@/lib/desktop-auth'
import { requireMembership } from '@/lib/auth'
import { requireFolderAccess } from '@/lib/access'
import { buildStorageKey, generateUploadUrl } from '@/lib/storage'
import { VERIFIED_DOWNLOADS_FOLDER_NAMES } from '@/lib/config'

export async function POST(req: NextRequest) {
    try {
        const session = await requireBearerSession(req)

        const body = await req.json()
        const { workspaceId, parentId, name, sizeBytes, mimeType, checksumSha256 } = body

        if (!workspaceId || !name || typeof sizeBytes !== 'number') {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // 1. Verify membership
        const membership = await requireMembership(session.userId, workspaceId)
        if (!membership.can_upload) {
            return NextResponse.json({ error: 'Upload permission required' }, { status: 403 })
        }
        const isAdmin = membership.role === 'admin'

        // 2. Verify folder access if uploading to a specific folder
        const db = getAdminClient()
        if (parentId) {
            await requireFolderAccess(session.userId, workspaceId, parentId, isAdmin, 'cannot_upload_to_folder')

            // Check if destination is inside Verified Downloads
            let currentFolderId: string | null = parentId
            while (currentFolderId) {
                const { data: folder } = await db
                    .from('vault_objects')
                    .select('id, name, parent_id')
                    .eq('id', currentFolderId)
                    .single()

                if (!folder) break

                if (VERIFIED_DOWNLOADS_FOLDER_NAMES.includes(folder.name.toLowerCase().trim())) {
                    return NextResponse.json({
                        error: 'Sync uploads to Verified Downloads are not permitted because server-side processing is required.'
                    }, { status: 403 })
                }

                currentFolderId = folder.parent_id
            }
        }

        // 3. Check for an existing active file with the same name in the same folder
        //    If the client supplied a checksum and it matches, skip the upload entirely.
        let existingObjectId: string | null = null
        if (checksumSha256) {
            let dupQuery = db
                .from('vault_objects')
                .select('id, checksum_sha256, size_bytes')
                .eq('workspace_id', workspaceId)
                .eq('name', name)
                .eq('type', 'file')
                .eq('is_deleted', false)

            dupQuery = parentId ? dupQuery.eq('parent_id', parentId) : dupQuery.is('parent_id', null)

            const { data: existing } = await dupQuery.maybeSingle()

            if (existing) {
                if (existing.checksum_sha256 && existing.checksum_sha256 === checksumSha256) {
                    // Content is identical — no upload needed
                    return NextResponse.json({ alreadyCurrent: true, objectId: existing.id })
                }
                // Content differs — record existingObjectId so complete can snapshot a version
                existingObjectId = existing.id
            }
        }

        // 4. Check storage quota
        const { data: workspace, error: wsError } = await db
            .from('workspaces')
            .select('storage_limit_bytes, storage_used_bytes')
            .eq('id', workspaceId)
            .single()

        if (wsError || !workspace) {
            console.error('[SYNC_UPLOAD_INIT] Failed to fetch workspace:', wsError)
            return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
        }

        const availableBytes = workspace.storage_limit_bytes - workspace.storage_used_bytes
        if (sizeBytes > availableBytes) {
            return NextResponse.json({
                error: 'Storage quota exceeded',
                availableBytes,
                limitBytes: workspace.storage_limit_bytes,
                usedBytes: workspace.storage_used_bytes
            }, { status: 413 })
        }

        // 5. Generate a provisional object ID and presigned URL
        const objectId = crypto.randomUUID()
        const storageKey = buildStorageKey(workspaceId, objectId, name)
        const uploadUrl = await generateUploadUrl(storageKey, mimeType || 'application/octet-stream', sizeBytes)

        return NextResponse.json({
            uploadUrl,
            storageKey,
            // Legacy field for desktop clients built before the storage rename
            r2Key: storageKey,
            objectId,
            // Echoed back so complete can do an in-place update instead of insert
            ...(existingObjectId ? { existingObjectId } : {}),
        })

    } catch (error: any) {
        if (error.message === 'Unauthorized' || error.message === 'Forbidden' || error.message === 'Account disabled') {
            return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
        }
        console.error('[SYNC_UPLOAD_INIT] Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
