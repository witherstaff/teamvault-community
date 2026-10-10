import { NextResponse, NextRequest } from 'next/server'
import { getAdminClient } from '@/db'
import { requireBearerSession } from '@/lib/desktop-auth'
import { requireMembership } from '@/lib/auth'
import { requireFolderAccess } from '@/lib/access'
import { logAuditEvent } from '@/lib/audit'
import { headObject, deleteObject, getBucketName } from '@/lib/storage'

export async function POST(req: NextRequest) {
    try {
        const session = await requireBearerSession(req)

        const body = await req.json()
        const {
            workspaceId, parentId, name, sizeBytes, mimeType,
            checksumSha256, objectId, existingObjectId,
        } = body
        // `r2Key` is accepted for older desktop clients that predate the rename
        const storageKey: string | undefined = body.storageKey ?? body.r2Key
        const storageBucket = getBucketName()

        if (!workspaceId || !name || typeof sizeBytes !== 'number' || !storageKey || !objectId || !storageBucket) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // 1. Verify membership & permissions again
        const membership = await requireMembership(session.userId, workspaceId)
        if (!membership.can_upload) {
            return NextResponse.json({ error: 'Upload permission required' }, { status: 403 })
        }
        const isAdmin = membership.role === 'admin'

        // 2. Verify folder access
        if (parentId) {
            await requireFolderAccess(session.userId, workspaceId, parentId, isAdmin, 'cannot_upload_to_folder')
        }

        // 3. Verify object exists in storage
        const exists = await headObject(storageKey)
        if (!exists) {
            return NextResponse.json({ error: 'File not found in storage. Upload might have failed or expired.' }, { status: 400 })
        }

        const db = getAdminClient()

        // 4. Resolve the existing file if existingObjectId was not supplied by init
        //    (fallback lookup in case the client didn't echo it)
        let resolvedExistingId: string | null = existingObjectId ?? null
        if (!resolvedExistingId) {
            let dupQuery = db
                .from('vault_objects')
                .select('id, checksum_sha256, storage_key, storage_bucket, size_bytes, mime_type')
                .eq('workspace_id', workspaceId)
                .eq('name', name)
                .eq('type', 'file')
                .eq('is_deleted', false)

            dupQuery = parentId ? dupQuery.eq('parent_id', parentId) : dupQuery.is('parent_id', null)

            const { data: existing } = await dupQuery.maybeSingle()
            if (existing) resolvedExistingId = existing.id
        }

        // 5. Handle overwrite — compare checksums and snapshot version if content changed
        if (resolvedExistingId) {
            const { data: existing } = await db
                .from('vault_objects')
                .select('id, checksum_sha256, storage_key, storage_bucket, size_bytes, mime_type')
                .eq('id', resolvedExistingId)
                .single()

            if (existing) {
                const checksumMatch = existing.checksum_sha256 && checksumSha256 &&
                    existing.checksum_sha256 === checksumSha256

                if (checksumMatch) {
                    // Identical content — discard the just-uploaded storage object and return existing record
                    await deleteObject(storageKey).catch(console.error)
                    const { data: existingRecord } = await db
                        .from('vault_objects')
                        .select()
                        .eq('id', resolvedExistingId)
                        .single()
                    return NextResponse.json({ file: existingRecord, unchanged: true })
                }

                // Content differs — snapshot old to file_versions, then update existing row in-place
                const { data: maxVersion } = await db
                    .from('file_versions')
                    .select('version_number')
                    .eq('object_id', resolvedExistingId)
                    .order('version_number', { ascending: false })
                    .limit(1)
                    .maybeSingle()

                const nextVersionNumber = (maxVersion?.version_number ?? 0) + 1

                await db.from('file_versions').insert({
                    object_id: resolvedExistingId,
                    version_number: nextVersionNumber,
                    storage_bucket: existing.storage_bucket ?? storageBucket,
                    storage_key: existing.storage_key!,
                    size_bytes: existing.size_bytes ?? 0,
                    checksum_sha256: existing.checksum_sha256,
                    mime_type: existing.mime_type,
                    uploaded_by: session.userId,
                })

                // Version now separately counts toward storage
                if (existing.size_bytes) {
                    await db.rpc('increment_workspace_storage', {
                        p_workspace_id: workspaceId,
                        p_bytes: existing.size_bytes,
                    })
                }

                // Update existing row with new content in-place
                const { data: updatedRecord, error: updateErr } = await db
                    .from('vault_objects')
                    .update({
                        storage_bucket: storageBucket,
                        storage_key: storageKey,
                        size_bytes: sizeBytes,
                        checksum_sha256: checksumSha256 ?? null,
                        mime_type: mimeType ?? existing.mime_type,
                    })
                    .eq('id', resolvedExistingId)
                    .select()
                    .single()

                if (updateErr || !updatedRecord) {
                    console.error('[SYNC_UPLOAD_COMPLETE] Update error:', updateErr)
                    return NextResponse.json({ error: 'Failed to update file record' }, { status: 500 })
                }

                // Increment storage for the new content
                await db.rpc('increment_workspace_storage', {
                    p_workspace_id: workspaceId,
                    p_bytes: sizeBytes,
                })

                const clientOs = req.headers.get('x-client-os') || 'unknown'
                const systemName = req.headers.get('x-client-system-name') || 'unknown'

                logAuditEvent({
                    workspaceId,
                    actorUserId: session.userId,
                    actorEmail: session.email,
                    action: 'FILE_UPLOADED',
                    objectId: resolvedExistingId,
                    result: 'allowed',
                    metadata: {
                        name,
                        size_bytes: sizeBytes,
                        parent_id: parentId,
                        version_created: nextVersionNumber,
                        client: 'desktop_sync',
                        os: clientOs,
                        system_name: systemName,
                    },
                    request: req,
                })

                return NextResponse.json({ file: updatedRecord })
            }
        }

        // 6. No existing file — re-check quota after confirming no duplicate to avoid races
        const { data: freshWorkspace } = await db
            .from('workspaces')
            .select('storage_limit_bytes, storage_used_bytes')
            .eq('id', workspaceId)
            .single()

        if (freshWorkspace) {
            const available = freshWorkspace.storage_limit_bytes - freshWorkspace.storage_used_bytes
            if (sizeBytes > available) {
                await deleteObject(storageKey).catch(console.error)
                return NextResponse.json({
                    error: 'Storage quota exceeded',
                    availableBytes: available,
                    limitBytes: freshWorkspace.storage_limit_bytes,
                    usedBytes: freshWorkspace.storage_used_bytes
                }, { status: 413 })
            }
        }

        // 7. Insert new record (truly new file)
        const { data: fileRecord, error: insertError } = await db
            .from('vault_objects')
            .insert({
                id: objectId,
                workspace_id: workspaceId,
                parent_id: parentId || null,
                type: 'file',
                name,
                size_bytes: sizeBytes,
                mime_type: mimeType,
                checksum_sha256: checksumSha256,
                storage_bucket: storageBucket,
                storage_key: storageKey,
                created_by: session.userId,
            })
            .select()
            .single()

        if (insertError || !fileRecord) {
            console.error('[SYNC_UPLOAD_COMPLETE] DB Insert Error:', insertError)
            return NextResponse.json({ error: 'Failed to record file in database' }, { status: 500 })
        }

        await db.rpc('increment_workspace_storage', {
            p_workspace_id: workspaceId,
            p_bytes: sizeBytes,
        })

        const clientOs = req.headers.get('x-client-os') || 'unknown'
        const systemName = req.headers.get('x-client-system-name') || 'unknown'

        logAuditEvent({
            workspaceId,
            actorUserId: session.userId,
            actorEmail: session.email,
            action: 'FILE_UPLOADED',
            objectId: fileRecord.id,
            result: 'allowed',
            metadata: {
                name,
                size_bytes: sizeBytes,
                parent_id: parentId,
                client: 'desktop_sync',
                os: clientOs,
                system_name: systemName,
            },
            request: req,
        })

        return NextResponse.json({ file: fileRecord })

    } catch (error: any) {
        if (error.message === 'Unauthorized' || error.message === 'Forbidden' || error.message === 'Account disabled') {
            return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
        }
        console.error('[SYNC_UPLOAD_COMPLETE] Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
