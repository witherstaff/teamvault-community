import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { requireFolderAccess, requireSameWorkspace } from '@/lib/access'
import { getAdminClient } from '@/db'
import { createUploadSchema } from '@/lib/validation'
import { buildStorageKey, generateUploadUrl, getBucketName } from '@/lib/storage'
import { logAuditEvent } from '@/lib/audit'
import { getPlan, VERIFIED_DOWNLOADS_ALLOWED_EXTENSIONS, isAllowedInVerifiedDownloads, isVerifiedDownloadsFolder } from '@/lib/config'
import { resolveUniqueName } from '@/lib/verified-rename'
import { z } from 'zod'

export async function POST(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const body = createUploadSchema.parse(await req.json())
        const { workspace_id, parent_id, mime_type, size_bytes, replaces_object_id } = body
        let { filename } = body
        const membership = await requireMembership(session.userId, workspace_id)

        const db = getAdminClient()
        const { data: actor } = await db.from('users').select('name, email').eq('id', session.userId).single()

        if (!membership.can_upload && membership.role !== 'admin') {
            logAuditEvent({ workspaceId: workspace_id, actorUserId: session.userId, actorName: actor?.name, actorEmail: actor?.email, action: 'FILE_UPLOADED', result: 'denied', metadata: { reason: 'upload_disabled' }, request: req })
            return NextResponse.json({ error: 'Upload not enabled for your account' }, { status: 403 })
        }

        await requireSameWorkspace(parent_id, workspace_id)
        await requireFolderAccess(session.userId, workspace_id, parent_id, membership.role === 'admin', 'no_acl_match')

        // Validate replaces_object_id belongs to same workspace/folder if provided
        if (replaces_object_id) {
            const { data: target } = await db
                .from('vault_objects')
                .select('id, workspace_id, parent_id, type, is_deleted')
                .eq('id', replaces_object_id)
                .single()
            if (!target || target.is_deleted || target.type !== 'file' ||
                target.workspace_id !== workspace_id || target.parent_id !== parent_id) {
                return NextResponse.json({ error: 'Invalid replaces_object_id' }, { status: 400 })
            }
        }

        // Check whether this folder (or any ancestor) is "Verified Downloads"
        const isInVerifiedDownloads = await (async () => {
            let folderId: string | null = parent_id
            while (folderId) {
                const { data: folder } = await db
                    .from('vault_objects')
                    .select('id, name, parent_id')
                    .eq('id', folderId)
                    .single() as { data: { id: string; name: string; parent_id: string | null } | null }
                if (!folder) break
                console.log('[create-upload] ancestry check folder:', folder.name)
                if (isVerifiedDownloadsFolder(folder.name)) return true
                folderId = folder.parent_id ?? null
            }
            return false
        })()

        if (isInVerifiedDownloads && !isAllowedInVerifiedDownloads(filename)) {
            const allowed = VERIFIED_DOWNLOADS_ALLOWED_EXTENSIONS.join(', ')
            return NextResponse.json(
                { error: `Only ${allowed} files are allowed in the Verified Downloads folder.` },
                { status: 415 }
            )
        }

        if (isInVerifiedDownloads) {
            filename = await resolveUniqueName(parent_id, workspace_id, filename)
        }

        // Check storage limits
        const { data: ws, error: wsErr } = await db
            .from('workspaces')
            .select('plan_id, storage_used_bytes')
            .eq('id', workspace_id)
            .single()

        if (wsErr || !ws) throw new Error('Workspace not found')

        const plan = getPlan(ws.plan_id)
        if (plan.storageLimitBytes !== null && (ws.storage_used_bytes + size_bytes) > plan.storageLimitBytes) {
            logAuditEvent({
                workspaceId: workspace_id, actorUserId: session.userId, actorName: actor?.name, actorEmail: actor?.email,
                action: 'FILE_UPLOADED', result: 'denied',
                metadata: { reason: 'storage_limit_exceeded', limit: plan.storageLimitBytes, attempted_size: size_bytes },
                request: req
            })
            return NextResponse.json({ error: 'Workspace storage limit exceeded' }, { status: 402 })
        }

        // Create a provisional vault_objects row for the new upload
        const { data: obj, error: insertErr } = await db
            .from('vault_objects')
            .insert({
                workspace_id,
                parent_id,
                type: 'file',
                name: filename,
                mime_type,
                size_bytes,
                created_by: session.userId,
                storage_bucket: getBucketName(),
            })
            .select('id')
            .single()

        if (insertErr || !obj) throw insertErr

        const storage_key = buildStorageKey(workspace_id, obj.id, filename)
        await db.from('vault_objects').update({ storage_key }).eq('id', obj.id)

        const upload_url = await generateUploadUrl(storage_key, mime_type, size_bytes)

        return NextResponse.json({
            object_id: obj.id,
            storage_key,
            upload_url,
            resolved_filename: filename,
            // Echo back so finalize knows what to replace
            ...(replaces_object_id ? { replaces_object_id } : {}),
        }, { status: 201 })
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        console.error('[vault/file/create-upload]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
