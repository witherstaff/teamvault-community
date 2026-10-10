import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'
import { fileHistoryPurgeSchema } from '@/lib/validation'
import { deleteObject } from '@/lib/storage'
import { logAuditEvent } from '@/lib/audit'
import { z } from 'zod'

export async function POST(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const body = fileHistoryPurgeSchema.parse(await req.json())
        const { workspace_id, object_id, version_id } = body

        const membership = await requireMembership(session.userId, workspace_id)
        if (membership.role !== 'admin') {
            return NextResponse.json({ error: 'Admin only' }, { status: 403 })
        }

        const db = getAdminClient()

        const { data: actor } = await db.from('users').select('name, email').eq('id', session.userId).single()

        // Verify the parent file belongs to this workspace
        const { data: obj } = await db
            .from('vault_objects')
            .select('id, name, workspace_id')
            .eq('id', object_id)
            .eq('workspace_id', workspace_id)
            .single()

        if (!obj) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 })
        }

        const { data: version } = await db
            .from('file_versions')
            .select('id, version_number, storage_key, size_bytes')
            .eq('id', version_id)
            .eq('object_id', object_id)
            .single()

        if (!version) {
            return NextResponse.json({ error: 'Version not found' }, { status: 404 })
        }

        // Hard-delete storage object for this version
        if (version.storage_key) {
            await deleteObject(version.storage_key).catch(console.error)
        }

        // Decrement storage for the purged version
        if (version.size_bytes) {
            const { data: ws } = await db.from('workspaces').select('storage_used_bytes').eq('id', workspace_id).single()
            if (ws) {
                const newSize = Math.max(0, Number(ws.storage_used_bytes) - Number(version.size_bytes))
                await db.from('workspaces').update({ storage_used_bytes: newSize }).eq('id', workspace_id)
            }
        }

        await db.from('file_versions').delete().eq('id', version_id)

        logAuditEvent({
            workspaceId: workspace_id,
            actorUserId: session.userId,
            actorName: actor?.name,
            actorEmail: actor?.email,
            action: 'FILE_VERSION_PURGED',
            objectId: object_id,
            result: 'allowed',
            metadata: {
                file_name: obj.name,
                purged_version_number: version.version_number,
                size_bytes: version.size_bytes,
            },
            request: req,
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        console.error('[vault/file/history/purge]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
