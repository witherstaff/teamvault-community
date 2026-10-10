import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { requireSameWorkspace } from '@/lib/access'
import { getAdminClient } from '@/db'
import { finalizeUploadSchema } from '@/lib/validation'
import { headObject, deleteObject, getBucketName } from '@/lib/storage'
import { logAuditEvent } from '@/lib/audit'
import { resolveFolderPath } from '@/lib/folder-path'
import { z } from 'zod'

export async function POST(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const body = finalizeUploadSchema.parse(await req.json())
        const { workspace_id, object_id, checksum_sha256, replaces_object_id } = body
        const membership = await requireMembership(session.userId, workspace_id)
        await requireSameWorkspace(object_id, workspace_id)

        const db = getAdminClient()

        // Fetch the provisional (newly uploaded) row
        const { data: obj, error: fetchErr } = await db
            .from('vault_objects')
            .select('storage_key, storage_bucket, created_by, name, size_bytes, mime_type, parent_id')
            .eq('id', object_id)
            .single()

        const { data: actor } = await db.from('users').select('name, email').eq('id', session.userId).single()

        if (fetchErr || !obj?.storage_key) {
            return NextResponse.json({ error: 'Object or storage key not found' }, { status: 404 })
        }

        if (obj.created_by !== session.userId && membership.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const exists = await headObject(obj.storage_key)
        if (!exists) {
            return NextResponse.json({ error: 'File not found in storage. Upload may have failed.' }, { status: 422 })
        }

        // --- Overwrite path: replaces_object_id was provided ---
        if (replaces_object_id) {
            const { data: old } = await db
                .from('vault_objects')
                .select('id, storage_key, storage_bucket, size_bytes, checksum_sha256, mime_type, created_by')
                .eq('id', replaces_object_id)
                .eq('workspace_id', workspace_id)
                .eq('is_deleted', false)
                .single()

            if (!old || !old.storage_key) {
                return NextResponse.json({ error: 'Target file to replace not found' }, { status: 404 })
            }

            const checksumMatch = old.checksum_sha256 && checksum_sha256 &&
                old.checksum_sha256 === checksum_sha256

            if (checksumMatch) {
                // Identical content — discard new upload, return original
                await deleteObject(obj.storage_key).catch(console.error)
                await db.from('vault_objects').delete().eq('id', object_id)

                const { data: unchanged } = await db
                    .from('vault_objects')
                    .select()
                    .eq('id', replaces_object_id)
                    .single()

                return NextResponse.json(unchanged)
            }

            // Content differs (or old checksum unknown) — snapshot old version, update old row in-place
            const { data: maxVersion } = await db
                .from('file_versions')
                .select('version_number')
                .eq('object_id', replaces_object_id)
                .order('version_number', { ascending: false })
                .limit(1)
                .maybeSingle()

            const nextVersionNumber = (maxVersion?.version_number ?? 0) + 1

            const versionMetadata: Record<string, unknown> = {}
            if (!old.checksum_sha256) versionMetadata.missing_checksum_warning = true

            await db.from('file_versions').insert({
                object_id: replaces_object_id,
                version_number: nextVersionNumber,
                storage_bucket: old.storage_bucket ?? getBucketName(),
                storage_key: old.storage_key,
                size_bytes: old.size_bytes ?? 0,
                checksum_sha256: old.checksum_sha256,
                mime_type: old.mime_type,
                uploaded_by: old.created_by,
            })

            // Old content is now a version — it stays counted in storage
            // Increment storage for the new content
            if (obj.size_bytes) {
                const { data: ws } = await db.from('workspaces').select('storage_used_bytes').eq('id', workspace_id).single()
                if (ws) {
                    await db.from('workspaces').update({
                        storage_used_bytes: Number(ws.storage_used_bytes) + Number(obj.size_bytes)
                    }).eq('id', workspace_id)
                }
            }

            // Update old row in-place with new content
            const { data: updated } = await db
                .from('vault_objects')
                .update({
                    storage_bucket: obj.storage_bucket ?? getBucketName(),
                    storage_key: obj.storage_key,
                    size_bytes: obj.size_bytes,
                    checksum_sha256: checksum_sha256 ?? null,
                    mime_type: obj.mime_type,
                })
                .eq('id', replaces_object_id)
                .select()
                .single()

            // Discard the provisional row — it was only a vehicle for the upload
            await db.from('vault_objects').delete().eq('id', object_id)

            const folder_path = await resolveFolderPath(obj.parent_id ?? null)
            logAuditEvent({
                workspaceId: workspace_id, actorUserId: session.userId, actorName: actor?.name, actorEmail: actor?.email,
                action: 'FILE_UPLOADED', objectId: replaces_object_id, result: 'allowed', request: req,
                metadata: {
                    file_name: obj.name,
                    folder_path,
                    version_created: nextVersionNumber,
                    ...(versionMetadata.missing_checksum_warning ? { missing_checksum_warning: true } : {}),
                }
            })

            return NextResponse.json(updated)
        }

        // --- New file path: no replaces_object_id ---
        const { data: updated } = await db
            .from('vault_objects')
            .update({ checksum_sha256: checksum_sha256 || null })
            .eq('id', object_id)
            .select()
            .single()

        if (obj.size_bytes) {
            const { data: ws } = await db.from('workspaces').select('storage_used_bytes').eq('id', workspace_id).single()
            if (ws) {
                const newSize = Number(ws.storage_used_bytes) + Number(obj.size_bytes)
                await db.from('workspaces').update({ storage_used_bytes: newSize }).eq('id', workspace_id)
            }
        }

        const folder_path = await resolveFolderPath(obj.parent_id ?? null)
        logAuditEvent({
            workspaceId: workspace_id, actorUserId: session.userId, actorName: actor?.name, actorEmail: actor?.email,
            action: 'FILE_UPLOADED', objectId: object_id, result: 'allowed', request: req,
            metadata: { file_name: obj.name, folder_path }
        })

        return NextResponse.json(updated)
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        console.error('[vault/file/finalize]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
