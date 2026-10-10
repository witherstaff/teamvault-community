import { NextRequest, NextResponse } from 'next/server'
import { requireBearerSession } from '@/lib/desktop-auth'
import { getAdminClient } from '@/db'
import { logAuditEvent } from '@/lib/audit'
import { z } from 'zod'

const schema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1).max(100),
  platform: z.enum(['windows', 'darwin', 'linux']),
  hostname: z.string().min(1).max(255),
})

export async function POST(req: NextRequest) {
  try {
    const session = await requireBearerSession(req)
    const body = await req.json()

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { clientId, name, platform, hostname } = parsed.data
    const db = getAdminClient()

    // Upsert device — update name/hostname/last_seen on re-registration
    const { data: device, error } = await db
      .from('devices')
      .upsert(
        {
          user_id: session.userId,
          client_id: clientId,
          name,
          platform,
          hostname,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'client_id' }
      )
      .select('id, name, created_at')
      .single()

    if (error) {
      console.error('[DEVICE_REGISTER] DB error:', error)
      return NextResponse.json({ error: 'Failed to register device' }, { status: 500 })
    }

    logAuditEvent({
      workspaceId: null as any,
      actorUserId: session.userId,
      actorEmail: session.email,
      action: 'DEVICE_REGISTERED',
      result: 'allowed',
      metadata: { deviceId: device.id, clientId, name, platform, hostname },
      request: req,
    })

    return NextResponse.json({
      deviceId: device.id,
      name: device.name,
      registeredAt: device.created_at,
    })
  } catch (error) {
    if (error instanceof NextResponse) return error
    console.error('[DEVICE_REGISTER] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
