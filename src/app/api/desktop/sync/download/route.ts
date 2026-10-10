import { NextResponse, NextRequest } from 'next/server'
import { getAdminClient } from '@/db'
import { requireBearerSession } from '@/lib/desktop-auth'
import { requireMembership, getTeamVaultSession } from '@/lib/auth'
import { requireFolderAccess } from '@/lib/access'
import { generateDownloadUrl } from '@/lib/storage'
import { logAuditEvent } from '@/lib/audit'

export async function POST(req: NextRequest) {
    try {
        const session = await requireBearerSession(req)

        const body = await req.json()
        const { workspaceId, objectId } = body

        if (!workspaceId || !objectId) {
            return NextResponse.json({ error: 'Missing workspaceId or objectId' }, { status: 400 })
        }

        // 1. Verify membership
        const membership = await requireMembership(session.userId, workspaceId)
        const isAdmin = membership.role === 'admin'

        // 2. Query file and verify access
        const db = getAdminClient()
        const { data: file, error } = await db
            .from('vault_objects')
            .select('id, name, mime_type, storage_key, is_deleted')
            .eq('id', objectId)
            .eq('workspace_id', workspaceId)
            .single()

        if (error || !file) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 })
        }

        if (file.is_deleted) {
            return NextResponse.json({ error: 'File is deleted' }, { status: 404 })
        }

        await requireFolderAccess(session.userId, workspaceId, objectId, isAdmin)

        if (!file.storage_key) {
            return NextResponse.json({ error: 'File content missing' }, { status: 500 })
        }

        // 3. Generate presigned URL
        const downloadUrl = await generateDownloadUrl(file.storage_key, file.name, true, file.mime_type)

        // 4. Audit Log
        const clientOs = req.headers.get('x-client-os') || 'unknown'
        const systemName = req.headers.get('x-client-system-name') || 'unknown'

        logAuditEvent({
            workspaceId,
            actorUserId: session.userId,
            actorEmail: session.email,
            action: 'FILE_DOWNLOADED',
            objectId: file.id,
            result: 'allowed',
            metadata: {
                name: file.name,
                client: 'desktop_sync',
                os: clientOs,
                system_name: systemName
            },
            request: req
        })

        return NextResponse.json({ downloadUrl })

    } catch (error: any) {
        if (error.message === 'Unauthorized' || error.message === 'Forbidden' || error.message === 'Account disabled') {
            return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
        }
        console.error('[SYNC_DOWNLOAD] Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
