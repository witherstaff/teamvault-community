import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'
import { syncAdminGroup } from '@/lib/groups'

export async function GET(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const url = new URL(req.url)
        const workspace_id = url.searchParams.get('workspace_id')
        if (!workspace_id) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

        const membership = await requireMembership(session.userId, workspace_id)
        if (membership.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

        // 1. Sync the Admin system group
        await syncAdminGroup(workspace_id).catch(err => console.error('[admin/groups/list] Sync Error:', err))

        const db = getAdminClient()
        const { data, error } = await db
            .from('groups')
            .select('id, name, is_system, created_at')
            .eq('workspace_id', workspace_id)
            .order('is_system', { ascending: false }) // Show system groups first
            .order('name', { ascending: true })

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json(data ?? [])
    } catch (err) {
        if (err instanceof Response) return err
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
