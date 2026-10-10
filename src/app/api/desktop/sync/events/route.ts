import { NextRequest, NextResponse } from 'next/server'
import { requireBearerSession } from '@/lib/desktop-auth'
import { requireMembership } from '@/lib/auth'
import { logAuditEvent } from '@/lib/audit'

export async function POST(req: NextRequest) {
  try {
    const session = await requireBearerSession(req)
    const body = await req.json()
    const { workspaceId, eventType, metadata } = body

    if (!workspaceId || !eventType) {
      return NextResponse.json(
        { error: 'Missing workspaceId or eventType' },
        { status: 400 }
      )
    }

    const validEvents = ['SYNC_STARTED', 'SYNC_COMPLETED', 'SYNC_FAILED']
    if (!validEvents.includes(eventType)) {
      return NextResponse.json(
        { error: 'Invalid eventType' },
        { status: 400 }
      )
    }

    await requireMembership(session.userId, workspaceId)

    // Log to audit
    logAuditEvent({
      workspaceId,
      actorUserId: session.userId,
      actorEmail: session.email,
      action: eventType as any,
      result: eventType === 'SYNC_FAILED' ? 'error' : 'allowed',
      metadata: metadata || {},
      request: req,
    })

    return NextResponse.json({ logged: true })
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('[SYNC_EVENTS] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
