import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'
import { getPlan, STORAGE_PLANS } from '@/lib/config'
import { z } from 'zod'

const schema = z.object({ workspace_id: z.string().uuid() })

/**
 * GET /api/admin/verified-log/monthly-stats
 *
 * Returns the number of allowed verified downloads this calendar month
 * and the workspace plan's monthly limit.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const { workspace_id } = schema.parse(Object.fromEntries(req.nextUrl.searchParams))
        const membership = await requireMembership(session.userId, workspace_id)
        if (membership.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

        const db = getAdminClient()

        // Count allowed downloads this calendar month
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

        const { count } = await db
            .from('verified_download_log')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', workspace_id)
            .eq('result', 'allowed')
            .gte('created_at', monthStart)

        // Fetch the workspace plan_id
        const { data: workspace } = await db
            .from('workspaces')
            .select('plan_id')
            .eq('id', workspace_id)
            .single()

        const plan = getPlan(workspace?.plan_id ?? 'team')

        return NextResponse.json({
            used: count ?? 0,
            limit: plan.verifiedDownloadsPerMonth,
            plan_id: plan.id,
            plan_name: plan.name,
            month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        })
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        console.error('[admin/verified-log/monthly-stats]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
