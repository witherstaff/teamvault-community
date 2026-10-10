import { NextRequest, NextResponse } from 'next/server'
import { requireBearerSession } from '@/lib/desktop-auth'
import { getAdminClient } from '@/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await requireBearerSession(req)
    const db = getAdminClient()

    // Get user's workspace memberships
    const { data: memberships, error } = await db
      .from('memberships')
      .select(`
        role,
        status,
        can_upload,
        workspace_id,
        workspaces (
          id,
          name,
          slug,
          storage_limit_bytes,
          storage_used_bytes
        )
      `)
      .eq('user_id', session.userId)
      .in('status', ['active', 'invited'])

    if (error) {
      console.error('[WORKSPACES] Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch workspaces' },
        { status: 500 }
      )
    }

    // Transform to desktop-friendly format
    const workspaces = (memberships || []).map((m: any) => {
      const ws = m.workspaces || {}

      return {
        id: m.workspace_id,
        name: ws.name || 'Unknown Workspace',
        slug: ws.slug || '',
        role: m.role,
        canUpload: m.can_upload,
        storage: {
          limitBytes: ws.storage_limit_bytes || 0,
          usedBytes: ws.storage_used_bytes || 0,
          availableBytes: (ws.storage_limit_bytes || 0) - (ws.storage_used_bytes || 0),
        },
      }
    })

    // Sort alphabetically by workspace name for consistent UI
    workspaces.sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json(workspaces)
  } catch (error: any) {
    if (error instanceof NextResponse) {
      return error
    }
    const errObj = {
      message: error?.message || 'Unknown Error',
      stack: error?.stack || ''
    }
    console.error('[WORKSPACES] Detailed error:', errObj)
    return NextResponse.json(
      { error: 'Internal server error', details: errObj },
      { status: 500 }
    )
  }
}
