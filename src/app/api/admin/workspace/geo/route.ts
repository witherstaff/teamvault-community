import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'

/**
 * GET /api/admin/workspace/geo?workspace_id={id}
 * Returns the workspace geofencing settings.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const workspaceId = req.nextUrl.searchParams.get('workspace_id')
        if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

        const membership = await requireMembership(session.userId, workspaceId)
        if (membership.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

        const db = getAdminClient()
        const { data, error } = await db
            .from('workspaces')
            .select('geo_enabled, geo_allowed_countries, geo_bypass_allowed')
            .eq('id', workspaceId)
            .single()

        if (error || !data) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

        return NextResponse.json({
            geo_enabled: (data as any).geo_enabled ?? false,
            geo_allowed_countries: (data as any).geo_allowed_countries ?? [],
            geo_bypass_allowed: (data as any).geo_bypass_allowed ?? false,
        })
    } catch (err) {
        if (err instanceof Response) return err
        console.error('[admin/workspace/geo GET]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

/**
 * PUT /api/admin/workspace/geo
 * Body: { workspace_id, geo_enabled?, geo_allowed_countries?, geo_bypass_allowed? }
 * Updates workspace geofencing settings.
 */
export async function PUT(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const body = await req.json()
        const { workspace_id, geo_enabled, geo_allowed_countries, geo_bypass_allowed } = body

        if (!workspace_id) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

        const membership = await requireMembership(session.userId, workspace_id)
        if (membership.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

        // Build update object from only provided fields
        const updates: Record<string, unknown> = {}
        if (typeof geo_enabled === 'boolean') updates.geo_enabled = geo_enabled
        if (Array.isArray(geo_allowed_countries)) {
            // Normalise to uppercase, deduplicate, filter valid 2-letter codes
            updates.geo_allowed_countries = [...new Set(
                (geo_allowed_countries as string[])
                    .map(c => c.toUpperCase().trim())
                    .filter(c => /^[A-Z]{2}$/.test(c))
            )]
        }
        if (typeof geo_bypass_allowed === 'boolean') updates.geo_bypass_allowed = geo_bypass_allowed

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 })
        }

        const db = getAdminClient()
        const { error } = await db.from('workspaces').update(updates).eq('id', workspace_id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        return NextResponse.json({ ok: true, updates })
    } catch (err) {
        if (err instanceof Response) return err
        console.error('[admin/workspace/geo PUT]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
