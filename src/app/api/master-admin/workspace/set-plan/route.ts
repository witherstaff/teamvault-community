import { NextRequest, NextResponse } from 'next/server'
import { getTeamVaultSession } from '@/lib/auth'
import { isMasterAdmin, getPlan, STORAGE_PLANS } from '@/lib/config'
import { getAdminClient } from '@/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    const session = await getTeamVaultSession(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isMasterAdmin(session.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { workspaceId, planId } = body

    if (!workspaceId) return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    if (!planId) return NextResponse.json({ error: 'planId is required' }, { status: 400 })

    const plan = getPlan(planId)
    if (!plan.internal) return NextResponse.json({ error: 'Only internal plans can be assigned here' }, { status: 400 })

    const db = getAdminClient()

    const { error } = await db
        .from('workspaces')
        .update({
            plan_id: plan.id,
            storage_limit_bytes: plan.storageLimitBytes ?? 107374182400,
            verified_downloads_per_month: plan.verifiedDownloadsPerMonth,
            recycle_bin_retention_days: plan.recycleBinRetentionDays,
        })
        .eq('id', workspaceId)

    if (error) {
        console.error('[MASTER-ADMIN] Failed to update plan', error)
        return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 })
    }

    console.log(`[MASTER-ADMIN] Workspace ${workspaceId} moved to plan ${plan.id} by ${session.email}`)
    return NextResponse.json({ ok: true })
}
