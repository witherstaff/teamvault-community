import { NextResponse, type NextRequest } from 'next/server'
import { getAuth0 } from '@/lib/auth0-client'
import { getAdminClient } from '@/db'
import { logAuditEvent } from '@/lib/audit'
import { extractLoginSecurityMeta } from '@/lib/login-security'
import { evaluateGeoAccess, type GeoInfo } from '@/lib/geofence'
import { geoOkCookieName } from '@/lib/bypass-code'

/**
 * Fire-and-forget: log an AUTH_LOGOUT audit event for each workspace the user
 * belongs to. Must be called BEFORE auth0.middleware() clears the session.
 */
async function logLogoutAudit(request: NextRequest, session: any) {
    try {
        const email = session.user?.email as string | undefined
        const sub = session.user?.sub as string | undefined
        const name = session.user?.name as string | undefined
        const sid = (session as any).internal?.sid as string | undefined
        if (!email) return

        const db = getAdminClient()
        const { data: user } = await db.from('users').select('id').eq('email', email).single()
        if (!user) return

        const { data: memberships } = await db
            .from('memberships')
            .select('workspace_id')
            .eq('user_id', user.id)

        if (!memberships?.length) return

        const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
            || request.headers.get('x-real-ip')
            || 'unknown'
        const ua = request.headers.get('user-agent') ?? ''

        for (const m of memberships) {
            logAuditEvent({
                workspaceId: m.workspace_id,
                actorUserId: user.id,
                actorName: name ?? null,
                actorEmail: email,
                action: 'AUTH_LOGOUT',
                result: 'allowed',
                metadata: {
                    session_id: sid ?? null,
                    ip,
                    ua_raw: ua,
                    auth_provider: sub?.split('|')[0] ?? null,
                },
            })
        }
    } catch (e) {
        console.error('[middleware][audit] Logout audit failed', e)
    }
}

/**
 * Fire-and-forget: log an AUTH_LOGIN audit event for each workspace the user
 * belongs to. Called from middleware where we have the full NextRequest context.
 */
async function logLoginAudit(request: NextRequest, session: any) {
    try {
        const email = session.user?.email as string | undefined
        const sub = session.user?.sub as string | undefined
        const name = session.user?.name as string | undefined
        if (!email) return

        const [securityMeta, db] = await Promise.all([
            extractLoginSecurityMeta(request, sub),
            Promise.resolve(getAdminClient()),
        ])

        const { data: user } = await db.from('users').select('id').eq('email', email).single()
        if (!user) return

        const { data: memberships } = await db
            .from('memberships')
            .select('workspace_id')
            .eq('user_id', user.id)

        if (!memberships?.length) return

        for (const m of memberships) {
            logAuditEvent({
                workspaceId: m.workspace_id,
                actorUserId: user.id,
                actorName: name ?? null,
                actorEmail: email,
                action: 'AUTH_LOGIN',
                result: 'allowed',
                metadata: securityMeta,
            })
        }
    } catch (e) {
        console.error('[middleware][audit] Login audit failed', e)
    }
}

/**
 * Fire-and-forget: log a GEO_BLOCK audit event.
 */
async function logGeoBlockAudit(
    actorEmail: string,
    userId: string,
    workspaceId: string,
    geoInfo: GeoInfo | undefined,
) {
    try {
        logAuditEvent({
            workspaceId,
            actorUserId: userId,
            actorEmail,
            action: 'GEO_BLOCK',
            result: 'denied',
            metadata: {
                ip: geoInfo?.ip ?? 'unknown',
                country_code: geoInfo?.countryCode ?? null,
                country_name: geoInfo?.countryName ?? null,
                region: geoInfo?.region ?? null,
                city: geoInfo?.city ?? null,
            },
        })
    } catch (e) {
        console.error('[middleware][audit] GEO_BLOCK audit failed', e)
    }
}

// UUID pattern for workspaceId extraction from /vault/{uuid}/...
const VAULT_WS_RE = /^\/vault\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i

export async function middleware(request: NextRequest) {
    const auth0 = getAuth0()
    const { pathname } = request.nextUrl

    // Intercept logout: read session before Auth0 clears it, then audit.
    if (pathname === '/auth/logout') {
        const session = await auth0.getSession(request)
        if (session) {
            void logLogoutAudit(request, session)
        }
        const response = await auth0.middleware(request)
        // Clear the login-tracking cookie so the next login is re-audited.
        response.cookies.delete('_tv_ls')
        return response
    }

    // Protect vault routes and detect fresh logins in one pass.
    if (pathname === '/vault' || pathname.startsWith('/vault/') || pathname === '/master-admin') {
        const session = await auth0.getSession(request)
        if (!session) {
            const returnTo = pathname + request.nextUrl.search
            const loginUrl = new URL('/auth/login', request.nextUrl.origin)
            loginUrl.searchParams.set('returnTo', returnTo)
            return NextResponse.redirect(loginUrl)
        }

        // ── Geofence check ───────────────────────────────────────────────────
        // Only applies to workspace-specific paths (/vault/{uuid}/...).
        const wsMatch = VAULT_WS_RE.exec(pathname)
        const urlWorkspaceId = wsMatch?.[1]
        const userEmail = session.user?.email as string | undefined

        let geoBlockData: { userId: string; geoInfo?: GeoInfo } | null = null
        let cacheGeoOk = false

        if (urlWorkspaceId && userEmail) {
            const geoResult = await evaluateGeoAccess(request, userEmail, urlWorkspaceId)

            if (!geoResult.pass) {
                // Log the block (fire-and-forget, non-blocking)
                if (geoResult.userId) {
                    void logGeoBlockAudit(userEmail, geoResult.userId, urlWorkspaceId, geoResult.geoInfo)
                }
                const returnTo = encodeURIComponent(pathname + request.nextUrl.search)
                const blockUrl = new URL('/geo-blocked', request.nextUrl.origin)
                blockUrl.searchParams.set('workspace_id', urlWorkspaceId)
                blockUrl.searchParams.set('return_to', returnTo)
                return NextResponse.redirect(blockUrl)
            }

            cacheGeoOk = geoResult.cacheGeoOk
        }

        // Detect a fresh session using the Auth0 internal session ID.
        const sid = (session as any).internal?.sid as string | undefined
        const loggedSid = request.cookies.get('_tv_ls')?.value
        const isNewSession = sid && loggedSid !== sid

        if (isNewSession) {
            void logLoginAudit(request, session)
        }

        // Let Auth0 middleware handle session refresh, CSRF, etc.
        const response = await auth0.middleware(request)

        if (isNewSession) {
            response.cookies.set('_tv_ls', sid!, {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
            })
        }

        // Cache the geo-allowed result so subsequent requests skip the DB + GeoIP call.
        if (cacheGeoOk && urlWorkspaceId) {
            response.cookies.set(geoOkCookieName(urlWorkspaceId), 'allowed', {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                // No maxAge — session-scoped, cleared on browser close.
            })
        }

        return response
    }

    // Skip Auth0 middleware for API routes and the unauthenticated installation check page
    if (pathname.startsWith('/api/') || pathname === '/install-check' || pathname.startsWith('/install-check/')) {
        return NextResponse.next()
    }

    return auth0.middleware(request)
}

export const config = {
    matcher: [
        // Skip Next.js internals, static assets, and public files
        '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|images/|Downloads/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff2?|ttf|otf|map)).*)',
    ],
}
