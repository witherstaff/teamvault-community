import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { provisionWorkspace } from '@/lib/workspace-provisioning'
import { getPlan } from '@/lib/config'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const { name, planId } = await req.json()

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 })
        }

        const selectedPlan = getPlan(planId || 'team')
        const storageLimitBytes = selectedPlan.storageLimitBytes || 1099511627776 // 1 TB default

        const result = await provisionWorkspace({
            name,
            planId: selectedPlan.id,
            storageLimitBytes,
            userId: session.userId,
            verifiedDownloadsPerMonth: selectedPlan.verifiedDownloadsPerMonth,
            recycleBinRetentionDays: selectedPlan.recycleBinRetentionDays,
        })

        return NextResponse.json({ workspace_id: result.workspaceId, slug: result.slug })
    } catch (err) {
        if (err instanceof Response) return err
        console.error('[CREATE WORKSPACE]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
