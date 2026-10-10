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
    const { workspaceId, objectId, newParentId, newName } = body

    if (!workspaceId || !objectId || (!newParentId && !newName)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const membership = await requireMembership(session.userId, workspaceId)
    const db = getAdminClient()

    // Get object details
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

    // Check access to source folder
    const sourceCheckId = obj.parent_id || obj.id
    await requireFolderAccess(
      session.userId,
      workspaceId,
      sourceCheckId,
      membership.role === 'admin'
    )

    // Check access to destination folder if moving
    if (newParentId && newParentId !== obj.parent_id) {
      await requireFolderAccess(
        session.userId,
        workspaceId,
        newParentId,
        membership.role === 'admin'
      )
    }

    // Check for name conflicts in destination
    const finalParentId = newParentId || obj.parent_id
    const finalName = newName || obj.name

    const { data: existing } = await db
      .from('vault_objects')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('parent_id', finalParentId)
      .eq('name', finalName)
      .eq('is_deleted', false)
      .neq('id', objectId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Object with same name already exists in destination' },
        { status: 409 }
      )
    }

    // Update object
    const updates: any = { updated_at: new Date().toISOString() }
    if (newParentId !== undefined) updates.parent_id = newParentId
    if (newName) updates.name = newName

    const { data: updated, error: updateError } = await db
      .from('vault_objects')
      .update(updates)
      .eq('id', objectId)
      .select()
      .single()

    if (updateError || !updated) {
      console.error('[MOVE] Database error:', updateError)
      return NextResponse.json(
        { error: 'Failed to move/rename object' },
        { status: 500 }
      )
    }

    // Log audit event
    const action = newParentId !== undefined && newName ? 'OBJECT_MOVED'
      : newName ? 'OBJECT_RENAMED'
      : 'OBJECT_MOVED'

    logAuditEvent({
      workspaceId,
      actorUserId: session.userId,
      actorEmail: session.email,
      action,
      objectId,
      result: 'allowed',
      metadata: {
        oldName: obj.name,
        newName: newName || obj.name,
        oldParentId: obj.parent_id,
        newParentId: newParentId || obj.parent_id,
      },
      request: req,
    })

    return NextResponse.json({ object: updated })
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('[MOVE] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
