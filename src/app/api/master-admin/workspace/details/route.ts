import { NextRequest, NextResponse } from 'next/server'
import { getTeamVaultSession } from '@/lib/auth'
import { isMasterAdmin } from '@/lib/config'
import { getAdminClient } from '@/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const session = await getTeamVaultSession(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isMasterAdmin(session.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const workspaceId = req.nextUrl.searchParams.get('workspaceId')
    if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

    const db = getAdminClient()

    const { data: members, error } = await db
        .from('memberships')
        .select('role, can_upload, status, created_at, users(id, email, name)')
        .eq('workspace_id', workspaceId)
        .order('role', { ascending: true })

    if (error) {
        console.error('[MASTER-ADMIN] Failed to load workspace members', error)
        return NextResponse.json({ error: 'Failed to load members' }, { status: 500 })
    }

    const users = (members ?? []).map((m: any) => ({
        id: m.users?.id ?? '',
        email: m.users?.email ?? '',
        name: m.users?.name ?? null,
        role: m.role,
        can_upload: m.can_upload,
        status: m.status,
        joined_at: m.created_at,
    }))

    return NextResponse.json({ users })
}
