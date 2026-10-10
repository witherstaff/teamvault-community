import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { requireFolderAccess, requireSameWorkspace } from '@/lib/access'
import { getAdminClient } from '@/db'
import { downloadLinkSchema } from '@/lib/validation'
import { generateDownloadUrl } from '@/lib/storage'
import { logAuditEvent } from '@/lib/audit'
import { isVerifiedDownloadsFolder } from '@/lib/config'
import { resolveFolderPath } from '@/lib/folder-path'
import { z } from 'zod'
import { randomBytes, randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const body = downloadLinkSchema.parse(await req.json())
        const { workspace_id, object_id, attachment } = body
        const membership = await requireMembership(session.userId, workspace_id)
        await requireSameWorkspace(object_id, workspace_id)

        const db = getAdminClient()
        const { data: obj, error } = await db
            .from('vault_objects')
            .select('storage_key, parent_id, type, name, is_deleted, mime_type')
            .eq('id', object_id)
            .single()

        if (error || !obj || obj.is_deleted) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 })
        }
        if (obj.type !== 'file') {
            return NextResponse.json({ error: 'Object is not a file' }, { status: 400 })
        }
        if (!obj.storage_key) {
            return NextResponse.json({ error: 'File not yet uploaded' }, { status: 422 })
        }

        // Check folder access via the file's parent
        await requireFolderAccess(
            session.userId, workspace_id,
            obj.parent_id!, membership.role === 'admin', 'no_acl_match'
        )

        const [download_url, folder_path, actor] = await Promise.all([
            generateDownloadUrl(obj.storage_key, obj.name, attachment, obj.mime_type),
            resolveFolderPath(obj.parent_id ?? null),
            db.from('users').select('name, email').eq('id', session.userId).single().then(r => r.data),
        ])

        logAuditEvent({
            workspaceId: workspace_id, actorUserId: session.userId, actorName: actor?.name, actorEmail: actor?.email,
            action: attachment ? 'FILE_DOWNLOADED' : 'FILE_VIEWED', objectId: object_id, result: 'allowed',
            metadata: { filename: obj.name, folder_path }, request: req,
        })

        // Log to verified_download_log if this file is inside a Verified Downloads folder
        if (obj.parent_id && actor?.email) {
            const pathSegments: string[] = []
            let folderId: string | null = obj.parent_id
            let inVerified = false
            while (folderId) {
                const { data: folder } = await db
                    .from('vault_objects')
                    .select('id, name, parent_id')
                    .eq('id', folderId)
                    .single() as { data: { id: string; name: string; parent_id: string | null } | null }
                if (!folder) break
                if (folder.name !== '/') pathSegments.unshift(folder.name)
                if (isVerifiedDownloadsFolder(folder.name)) { inVerified = true; break }
                folderId = folder.parent_id ?? null
            }
            if (inVerified) {
                const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? req.headers.get('x-real-ip') ?? 'unknown'
                const folderPath = pathSegments.join(' / ') || null
                await db.from('verified_download_log').insert({
                    workspace_id,
                    object_id,
                    download_token: randomBytes(12).toString('base64url'),
                    downloader_email: actor.email,
                    downloader_ip: ip,
                    result: 'allowed',
                    filename: obj.name,
                    folder_path: folderPath,
                    session_id: randomUUID(),
                })
            }
        }

        return NextResponse.json({ download_url, expires_in_seconds: 120 })
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        console.error('[vault/file/download-link]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

