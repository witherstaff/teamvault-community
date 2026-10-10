import { NextRequest, NextResponse } from 'next/server'
import { performEnvAudit } from '@/lib/env-audit'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    if (process.env.DISABLE_INSTALL_CHECK === 'true' || process.env.INSTALL_CHECK_ENABLED === 'false') {
        return NextResponse.json(
            { error: 'Install check has been disabled by the administrator.' },
            { status: 403 }
        )
    }

    // Install check is strictly for community variables and never exposes commercial vars
    const result = performEnvAudit('community', false)

    return NextResponse.json(result)
}
