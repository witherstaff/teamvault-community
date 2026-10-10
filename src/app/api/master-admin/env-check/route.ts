import { NextRequest, NextResponse } from 'next/server'
import { getTeamVaultSession } from '@/lib/auth'
import { isMasterAdmin } from '@/lib/config'
import { performEnvAudit } from '@/lib/env-audit'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const session = await getTeamVaultSession(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isMasterAdmin(session.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const isCommercial =
        process.env.NEXT_PUBLIC_COMMERCIAL_MODE === 'true' ||
        process.env.COMMERCIAL_MODE === 'true'

    const url = new URL(req.url)
    const scope = isCommercial ? (url.searchParams.get('scope') || 'all') : 'community'
    const result = performEnvAudit(scope, isCommercial)

    return NextResponse.json(result)
}
