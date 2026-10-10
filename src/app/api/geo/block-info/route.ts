import { NextRequest, NextResponse } from 'next/server'
import { getAuth0 } from '@/lib/auth0-client'
import { getAdminClient } from '@/db'
import { lookupGeoInfo } from '@/lib/geofence'

/**
 * GET /api/geo/block-info?workspace_id={id}
 *
 * Returns the caller's IP, geo info, and whether a bypass code can be requested.
 * Used by the /geo-blocked page to populate the block screen.
 */
export async function GET(req: NextRequest) {
    const workspaceId = req.nextUrl.searchParams.get('workspace_id')

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
        || req.headers.get('x-real-ip')
        || 'unknown'

    // Geo info is best-effort — resolve concurrently with session + workspace fetches
    const geoPromise = lookupGeoInfo(ip)

    let userEmail: string | null = null
    let bypassAllowed = false

    if (workspaceId) {
        try {
            const auth0 = getAuth0()
            const session = await auth0.getSession(req)
            if (session) {
                userEmail = session.user?.email ?? null
                if (userEmail) {
                    const db = getAdminClient()
                    const [userRes, wsRes] = await Promise.all([
                        db.from('users').select('id').eq('email', userEmail).single(),
                        db.from('workspaces')
                            .select('geo_bypass_allowed')
                            .eq('id', workspaceId)
                            .single(),
                    ])
                    if (userRes.data?.id) {
                        const memRes = await db.from('memberships')
                            .select('geo_bypass_allowed')
                            .eq('workspace_id', workspaceId)
                            .eq('user_id', userRes.data.id)
                            .single()

                        const wsBypass = !!(wsRes.data as any)?.geo_bypass_allowed
                        const memBypass = (memRes.data as any)?.geo_bypass_allowed

                        // Per-user setting overrides workspace default (null = inherit)
                        bypassAllowed = memBypass ?? wsBypass
                    }
                }
            }
        } catch { /* session unavailable — return no-bypass */ }
    }

    const geo = await geoPromise

    return NextResponse.json({
        ip: geo.ip,
        countryCode: geo.countryCode,
        countryName: geo.countryName,
        region: geo.region,
        city: geo.city,
        bypassAllowed,
        userEmail,
    })
}
