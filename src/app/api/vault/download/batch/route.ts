import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'
import { batchDownloadSchema } from '@/lib/validation'
import archiver from 'archiver'
import { logAuditEvent } from '@/lib/audit'
import { checkFolderAccess } from '@/lib/access'

export const maxDuration = 60

export async function POST(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const body = await req.json()
        const parsed = batchDownloadSchema.parse(body)
        const { workspace_id, object_ids } = parsed

        const membership = await requireMembership(session.userId, workspace_id)
        const isAdmin = membership.role === 'admin'
        const db = getAdminClient()

        // 1. Fetch metadata for all requested items to verify existence
        const { data: objects, error: objErr } = await db
            .from('vault_objects')
            .select('*')
            .eq('workspace_id', workspace_id)
            .in('id', object_ids)
            .is('deleted_at', null)

        if (objErr) return NextResponse.json({ error: objErr.message }, { status: 400 })
        if (!objects || objects.length === 0) return NextResponse.json({ error: 'No matching objects found' }, { status: 404 })

        // 3. Flatten folders & check permissions
        const filesToDownload: { id: string, storage_path: string, archive_path: string }[] = []

        // Recursive helper to crawl directories
        async function processObject(obj: any, currentPath: string) {
            // Verify access
            if (!isAdmin) {
                // Determine folder ID to check rules against
                const folderIdToCheck = obj.type === 'folder' ? obj.id : obj.parent_id
                const isAllowed = await checkFolderAccess(session.userId, workspace_id, folderIdToCheck, isAdmin)
                if (!isAllowed) throw new Error(`Access denied to ${obj.name}`)
            }

            const archivePath = currentPath ? `${currentPath}/${obj.name}` : obj.name

            if (obj.type === 'file') {
                if (obj.storage_path) {
                    filesToDownload.push({ id: obj.id, storage_path: obj.storage_path, archive_path: archivePath })
                }
            } else if (obj.type === 'folder') {
                // Fetch children
                const { data: children } = await db
                    .from('vault_objects')
                    .select('*')
                    .eq('workspace_id', workspace_id)
                    .eq('parent_id', obj.id)
                    .is('deleted_at', null)

                if (children) {
                    for (const child of children) {
                        await processObject(child, archivePath)
                    }
                }
            }
        }

        for (const obj of objects) {
            try {
                await processObject(obj, '')
            } catch (permitErr: any) {
                return NextResponse.json({ error: permitErr.message }, { status: 403 })
            }
        }

        if (filesToDownload.length === 0) {
            return NextResponse.json({ error: 'No files to zip.' }, { status: 400 })
        }

        // 4. Set up Archiver stream
        const stream = new TransformStream()
        const writer = stream.writable.getWriter()
        const archive = archiver('zip', { zlib: { level: 5 } }) // Level 5 compression for speed/size balance

        archive.on('data', (chunk) => writer.write(chunk))
        archive.on('end', () => writer.close())
        archive.on('error', (err) => {
            console.error('Archiver error:', err)
            writer.abort(err)
        })

            // 5. Append files to archiver asynchronously
            // We use an async IIFE so the response can be returned immediately
            ; (async () => {
                for (const file of filesToDownload) {
                    // We use Supabase storage standard download which returns a Blob
                    // and convert it into a NodeJS Readable/Buffer stream for Archiver
                    const { data, error } = await db.storage.from('vault').download(file.storage_path)

                    if (data && !error) {
                        const arrayBuffer = await data.arrayBuffer()
                        const buffer = Buffer.from(arrayBuffer)
                        archive.append(buffer, { name: file.archive_path })
                    } else {
                        console.error("Failed to download file from storage:", file.storage_path, error)
                    }
                }
                archive.finalize()
            })()

        // 6. Log the audit event
        const { data: actor } = await db.from('users').select('name, email').eq('id', session.userId).single()
        logAuditEvent({
            workspaceId: workspace_id,
            actorUserId: session.userId,
            actorName: actor?.name,
            actorEmail: actor?.email,
            action: 'FILE_DOWNLOADED',
            result: 'allowed',
            metadata: { file_count: filesToDownload.length, batch: true },
            request: req
        })

        // 7. Return the stream to the browser
        return new Response(stream.readable, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="TeamVault_Export_${new Date().toISOString().split('T')[0]}.zip"`,
            }
        })

    } catch (err: any) {
        if (err instanceof Response) return err
        console.error('Batch ZIP Error:', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
