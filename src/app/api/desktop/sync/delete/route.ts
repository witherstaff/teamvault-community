import { NextRequest, NextResponse } from 'next/server'
import { requireBearerSession } from '@/lib/desktop-auth'
import { requireMembership } from '@/lib/auth'
import { requireFolderAccess } from '@/lib/access'
import { getAdminClient } from '@/db'
import { logAuditEvent } from '@/lib/audit'

export async function POST(req: NextRequest) {
  try {
    const session = await requireBearerSession(req)
    const body = await req.json()
    const { workspaceId, objectId } = body

    if (!workspaceId || !objectId) {
      return NextResponse.json(
        { error: 'Missing workspaceId or objectId' },
        { status: 400 }
      )
    }

    const membership = await requireMembership(session.userId, workspaceId)
    const db = getAdminClient()

    const { data: obj, error: objError } = await db
      .from('vault_objects')
      .select('id, name, type, parent_id, workspace_id, is_deleted')
      .eq('id', objectId)
      .eq('workspace_id', workspaceId)
      .single()

    if (objError || !obj || obj.is_deleted) {
      return NextResponse.json(
        { error: 'Object not found' },
        { status: 404 }
      )
    }

    const checkObjectId = obj.parent_id || obj.id
    await requireFolderAccess(
      session.userId,
      workspaceId,
      checkObjectId,
      membership.role === 'admin'
    )

    if (obj.type === 'folder') {
      const { count } = await db
        .from('vault_objects')
        .select('id', { count: 'exact', head: true })
        .eq('parent_id', objectId)
        .eq('is_deleted', false)

      if (count && count > 0) {
        return NextResponse.json(
          { error: 'Folder must be empty before deletion' },
          { status: 400 }
        )
      }
    }

    const now = new Date().toISOString()
    const { error: deleteError } = await db
      .from('vault_objects')
      .update({ is_deleted: true, deleted_at: now, deleted_by: session.userId, updated_at: now })
      .eq('id', objectId)

    if (deleteError) {
      console.error('[DELETE] Database error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete object' },
        { status: 500 }
      )
    }

    logAuditEvent({
      workspaceId,
      actorUserId: session.userId,
      actorEmail: session.email,
      action: obj.type === 'folder' ? 'FOLDER_DELETED' : 'FILE_DELETED',
      objectId,
      result: 'allowed',
      metadata: { name: obj.name, type: obj.type },
      request: req,
    })

    return NextResponse.json({
      success: true,
      deletedAt: now,
    })
  } catch (error) {
    if (error instanceof NextResponse) return error
    console.error('[DELETE] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
