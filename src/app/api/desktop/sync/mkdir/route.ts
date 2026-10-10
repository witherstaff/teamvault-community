import { NextResponse, NextRequest } from 'next/server'
import { getAdminClient } from '@/db'
import { requireBearerSession } from '@/lib/desktop-auth'
import { requireMembership } from '@/lib/auth'
import { requireFolderAccess } from '@/lib/access'
import { logAuditEvent } from '@/lib/audit'
import { VERIFIED_DOWNLOADS_FOLDER_NAMES } from '@/lib/config'

export async function POST(req: NextRequest) {
    try {
        const session = await requireBearerSession(req)

        const body = await req.json()
        const { workspaceId, parentId, name } = body

        if (!workspaceId || !parentId || !name) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        if (VERIFIED_DOWNLOADS_FOLDER_NAMES.includes(name.toLowerCase().trim())) {
            return NextResponse.json({ error: 'Reserved directory name' }, { status: 403 })
        }

        // 1. Verify membership
        const membership = await requireMembership(session.userId, workspaceId)
        if (!membership.can_upload && membership.role !== 'admin') {
            return NextResponse.json({ error: 'Upload permission required' }, { status: 403 })
        }
        const isAdmin = membership.role === 'admin'

        // 2. Verify parent folder access
        const db = getAdminClient()
        await requireFolderAccess(session.userId, workspaceId, parentId, isAdmin, 'cannot_upload_to_folder')

        // 3. Prevent duplicate creation by checking if it already exists
        const { data: existing } = await db
            .from('vault_objects')
            .select('id')
            .eq('workspace_id', workspaceId)
            .eq('parent_id', parentId)
            .eq('type', 'folder')
            .eq('name', name)
            .eq('is_deleted', false)
            .maybeSingle()

        if (existing) {
            return NextResponse.json({ id: existing.id }, { status: 200 })
        }

        // 4. Create new folder
        const { data: newFolder, error } = await db
            .from('vault_objects')
            .insert({
                workspace_id: workspaceId,
                parent_id: parentId,
                type: 'folder',
                name: name,
                created_by: session.userId
            })
            .select('id')
            .single()

        if (error || !newFolder) {
            console.error('[SYNC_MKDIR] DB Insert Error:', error)
            return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 })
        }

        const clientOs = req.headers.get('x-client-os') || 'unknown'
        const systemName = req.headers.get('x-client-system-name') || 'unknown'

        logAuditEvent({
            workspaceId,
            actorUserId: session.userId,
            actorEmail: session.email,
            action: 'FOLDER_CREATED',
            objectId: newFolder.id,
            result: 'allowed',
            metadata: {
                folder_name: name,
                client: 'desktop_sync',
                os: clientOs,
                system_name: systemName
            },
            request: req
        })

        return NextResponse.json({ id: newFolder.id }, { status: 201 })

    } catch (error: any) {
        if (error.message === 'Unauthorized' || error.message === 'Forbidden' || error.message === 'Account disabled') {
            return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
        }
        console.error('[SYNC_MKDIR] Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
