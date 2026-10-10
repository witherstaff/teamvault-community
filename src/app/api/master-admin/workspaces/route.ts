import { NextRequest, NextResponse } from 'next/server'
import { getTeamVaultSession } from '@/lib/auth'
import { isMasterAdmin } from '@/lib/config'
import { getAdminClient } from '@/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const session = await getTeamVaultSession(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isMasterAdmin(session.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const db = getAdminClient()
    const { data, error } = await db
        .from('workspaces')
        .select('id, name, plan_id, storage_used_bytes, storage_limit_bytes, created_at')
        .order('name', { ascending: true })

    if (error) {
        console.error('[MASTER-ADMIN] Failed to list workspaces', error)
        return NextResponse.json({ error: 'Failed to load workspaces' }, { status: 500 })
    }

    return NextResponse.json(data)
}
