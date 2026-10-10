import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'

export async function GET(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const url = new URL(req.url)
        const workspace_id = url.searchParams.get('workspace_id')
        if (!workspace_id) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

        const membership = await requireMembership(session.userId, workspace_id)
        if (membership.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

        const db = getAdminClient()
        const { data, error } = await db
            .from('memberships')
            .select('user_id, role, can_upload, status, geo_country_override, geo_bypass_allowed, users(id, email, name, created_at)')
            .eq('workspace_id', workspace_id)
            .order('status', { ascending: true })

        if (error) {
            console.error('[admin/users/list]', error)
            return NextResponse.json({ error: 'Failed to load users' }, { status: 500 })
        }

        // Flatten the join into a simpler format
        const users = (data ?? []).map((m: Record<string, unknown>) => {
            const u = m.users as Record<string, unknown> | null
            return {
                id: u?.id ?? m.user_id,
                email: u?.email ?? 'unknown',
                name: u?.name ?? null,
                role: m.role,
                can_upload: m.can_upload,
                status: m.status,
                created_at: u?.created_at ?? null,
                geo_country_override: (m.geo_country_override as string[]) ?? [],
                geo_bypass_allowed: (m.geo_bypass_allowed as boolean | null) ?? null,
            }
        })

        return NextResponse.json(users)
    } catch (err) {
        if (err instanceof Response) return err
        console.error('[admin/users/list]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
