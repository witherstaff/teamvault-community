import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'

/**
 * GET /api/admin/users/geo?workspace_id={id}&user_id={id}
 * Returns per-user geofencing overrides for a workspace member.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const workspaceId = req.nextUrl.searchParams.get('workspace_id')
        const targetUserId = req.nextUrl.searchParams.get('user_id')

        if (!workspaceId || !targetUserId) {
            return NextResponse.json({ error: 'workspace_id and user_id required' }, { status: 400 })
        }

        const membership = await requireMembership(session.userId, workspaceId)
        if (membership.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

        const db = getAdminClient()
        const { data, error } = await db
            .from('memberships')
            .select('geo_country_override, geo_bypass_allowed')
            .eq('workspace_id', workspaceId)
            .eq('user_id', targetUserId)
            .single()

        if (error || !data) return NextResponse.json({ error: 'Membership not found' }, { status: 404 })

        return NextResponse.json({
            geo_country_override: (data as any).geo_country_override ?? [],
            geo_bypass_allowed: (data as any).geo_bypass_allowed ?? null,
        })
    } catch (err) {
        if (err instanceof Response) return err
        console.error('[admin/users/geo GET]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

/**
 * PUT /api/admin/users/geo
 * Body: { workspace_id, user_id, geo_country_override?, geo_bypass_allowed? }
 *
 * geo_bypass_allowed: null = inherit workspace default, true/false = override
 */
export async function PUT(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const body = await req.json()
        const { workspace_id, user_id, geo_country_override, geo_bypass_allowed } = body

        if (!workspace_id || !user_id) {
            return NextResponse.json({ error: 'workspace_id and user_id required' }, { status: 400 })
        }

        const membership = await requireMembership(session.userId, workspace_id)
        if (membership.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

        const updates: Record<string, unknown> = {}

        if (Array.isArray(geo_country_override)) {
            updates.geo_country_override = [...new Set(
                (geo_country_override as string[])
                    .map(c => c.toUpperCase().trim())
                    .filter(c => /^[A-Z]{2}$/.test(c))
            )]
        }

        // Accept null (reset to workspace default), true, or false
        if (geo_bypass_allowed === null || typeof geo_bypass_allowed === 'boolean') {
            updates.geo_bypass_allowed = geo_bypass_allowed
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 })
        }

        const db = getAdminClient()
        const { error } = await db
            .from('memberships')
            .update(updates)
            .eq('workspace_id', workspace_id)
            .eq('user_id', user_id)

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        return NextResponse.json({ ok: true, updates })
    } catch (err) {
        if (err instanceof Response) return err
        console.error('[admin/users/geo PUT]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
