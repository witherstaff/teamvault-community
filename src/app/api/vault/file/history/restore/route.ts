import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'
import { fileHistoryRestoreSchema } from '@/lib/validation'
import { logAuditEvent } from '@/lib/audit'
import { getBucketName } from '@/lib/storage'
import { z } from 'zod'

export async function POST(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const body = fileHistoryRestoreSchema.parse(await req.json())
        const { workspace_id, object_id, version_id } = body

        const membership = await requireMembership(session.userId, workspace_id)
        if (membership.role !== 'admin') {
            return NextResponse.json({ error: 'Admin only' }, { status: 403 })
        }

        const db = getAdminClient()

        const { data: actor } = await db.from('users').select('name, email').eq('id', session.userId).single()

        // Fetch current live file
        const { data: current } = await db
            .from('vault_objects')
            .select('id, name, workspace_id, type, storage_key, storage_bucket, size_bytes, checksum_sha256, mime_type, created_by, is_deleted')
            .eq('id', object_id)
            .eq('workspace_id', workspace_id)
            .single()

        if (!current || current.type !== 'file' || current.is_deleted) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 })
        }

        // Fetch the target version
        const { data: version } = await db
            .from('file_versions')
            .select('id, version_number, storage_key, storage_bucket, size_bytes, checksum_sha256, mime_type, uploaded_by')
            .eq('id', version_id)
            .eq('object_id', object_id)
            .single()

        if (!version) {
            return NextResponse.json({ error: 'Version not found' }, { status: 404 })
        }

        // Snapshot current content as a new version (storage-neutral: old version promoted, current becomes version)
        const { data: maxVersion } = await db
            .from('file_versions')
            .select('version_number')
            .eq('object_id', object_id)
            .order('version_number', { ascending: false })
            .limit(1)
            .maybeSingle()

        const nextVersionNumber = (maxVersion?.version_number ?? 0) + 1

        await db.from('file_versions').insert({
            object_id,
            version_number: nextVersionNumber,
            storage_bucket: current.storage_bucket ?? getBucketName(),
            storage_key: current.storage_key!,
            size_bytes: current.size_bytes ?? 0,
            checksum_sha256: current.checksum_sha256,
            mime_type: current.mime_type,
            uploaded_by: current.created_by,
        })

        // Promote the target version to current (delete its version row, update live row)
        await db.from('file_versions').delete().eq('id', version_id)

        const { data: updated } = await db
            .from('vault_objects')
            .update({
                storage_bucket: version.storage_bucket,
                storage_key: version.storage_key,
                size_bytes: version.size_bytes,
                checksum_sha256: version.checksum_sha256,
                mime_type: version.mime_type,
            })
            .eq('id', object_id)
            .select()
            .single()

        // Storage is neutral: current becomes a version (stays counted), promoted version is now current (stays counted)

        logAuditEvent({
            workspaceId: workspace_id,
            actorUserId: session.userId,
            actorName: actor?.name,
            actorEmail: actor?.email,
            action: 'FILE_VERSION_RESTORED',
            objectId: object_id,
            result: 'allowed',
            metadata: {
                file_name: current.name,
                restored_version_number: version.version_number,
                new_version_number: nextVersionNumber,
            },
            request: req,
        })

        return NextResponse.json({ success: true, file: updated })
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        console.error('[vault/file/history/restore]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
