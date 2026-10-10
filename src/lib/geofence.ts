/**
 * Geofencing — country-based access control for workspace vault routes.
 *
 * Evaluation order (first match wins):
 *  1. Global kill-switch (GEOFENCING_ENABLED = false)  → allow
 *  2. Geo-ok cache cookie present                       → allow (fast path)
 *  3. Workspace geo_enabled = false                     → allow + cache
 *  4. Admin role + GEOFENCING_ADMIN_IMMUNE = true       → allow + cache
 *  5. No countries configured                           → allow + cache
 *  6. GeoIP lookup → country in workspace allowlist     → allow + cache
 *  7. Country in user's per-membership override         → allow + cache
 *  8. Valid bypass-cookie token                         → allow (no cache)
 *  9. Otherwise                                         → block
 */

import type { NextRequest } from 'next/server'
import { getAdminClient } from '@/db'
import { GEOFENCING_ENABLED, GEOFENCING_ADMIN_IMMUNE } from './config'
import { verifyBypassCookieToken, bypassCookieName, geoOkCookieName } from './bypass-code'

// ---------------------------------------------------------------------------
// GeoInfo type (also exported for API routes)
// ---------------------------------------------------------------------------

export interface GeoInfo {
    ip: string
    countryCode: string | null
    countryName: string | null
    region: string | null
    city: string | null
    isp: string | null
}

// ---------------------------------------------------------------------------
// GeoIP lookup (ipapi.co, 2-second timeout, best-effort)
// ---------------------------------------------------------------------------

const PRIVATE_IP = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|localhost)/

export async function lookupGeoInfo(ip: string): Promise<GeoInfo> {
    const empty: GeoInfo = { ip, countryCode: null, countryName: null, region: null, city: null, isp: null }
    if (!ip || ip === 'unknown' || PRIVATE_IP.test(ip)) return empty
    try {
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), 2000)
        const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
            signal: ctrl.signal,
            headers: { Accept: 'application/json', 'User-Agent': 'TeamVault-Geofence/1.0' },
        })
        clearTimeout(timer)
        if (!res.ok) return empty
        const data = (await res.json()) as Record<string, unknown>
        if (data.error) return empty
        return {
            ip,
            countryCode: (data.country_code as string) ?? null,
            countryName: (data.country_name as string) ?? null,
            region: (data.region as string) ?? null,
            city: (data.city as string) ?? null,
            isp: (data.org as string) ?? null,
        }
    } catch {
        return empty
    }
}

// ---------------------------------------------------------------------------
// Main evaluation function (called from middleware)
// ---------------------------------------------------------------------------

export interface GeoAccessResult {
    pass: boolean
    /** Internal user ID (empty string on cache-hit path). */
    userId: string
    /** Whether the middleware should set the geo-ok cache cookie. */
    cacheGeoOk: boolean
    /** Present when a GeoIP lookup was performed. */
    geoInfo?: GeoInfo
    /** Whether this user is allowed to request bypass codes. */
    bypassAllowed?: boolean
}

/**
 * Evaluate whether the authenticated user should be allowed through the
 * geofence for the given workspace.  Called from middleware for vault routes.
 */
export async function evaluateGeoAccess(
    request: NextRequest,
    email: string,
    workspaceId: string,
): Promise<GeoAccessResult> {
    // ── 1. Global kill-switch ────────────────────────────────────────────────
    if (!GEOFENCING_ENABLED) {
        return { pass: true, userId: '', cacheGeoOk: true }
    }

    // ── 2. Geo-ok cache cookie (fast path, no DB) ────────────────────────────
    const geoOkCookie = request.cookies.get(geoOkCookieName(workspaceId))?.value
    if (geoOkCookie === 'allowed') {
        return { pass: true, userId: '', cacheGeoOk: false }
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
        || request.headers.get('x-real-ip')
        || 'unknown'

    const db = getAdminClient()

    // ── Fetch user + workspace settings in parallel ──────────────────────────
    const [userRes, wsRes] = await Promise.all([
        db.from('users').select('id').eq('email', email).single(),
        db.from('workspaces')
            .select('geo_enabled, geo_allowed_countries, geo_bypass_allowed')
            .eq('id', workspaceId)
            .single(),
    ])

    const userId = userRes.data?.id ?? ''
    if (!userId) return { pass: true, userId: '', cacheGeoOk: false }

    const ws = wsRes.data as {
        geo_enabled: boolean
        geo_allowed_countries: string[]
        geo_bypass_allowed: boolean
    } | null

    // ── 3. Workspace geo disabled ────────────────────────────────────────────
    if (!ws?.geo_enabled) {
        return { pass: true, userId, cacheGeoOk: true }
    }

    const allowedCountries: string[] = ws.geo_allowed_countries ?? []

    // ── Fetch membership (role + overrides) ─────────────────────────────────
    const memRes = await db.from('memberships')
        .select('role, geo_country_override, geo_bypass_allowed')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .single()
    const mem = memRes.data as {
        role: string
        geo_country_override: string[]
        geo_bypass_allowed: boolean | null
    } | null

    // ── 4. Admin immunity ────────────────────────────────────────────────────
    if (GEOFENCING_ADMIN_IMMUNE && mem?.role === 'admin') {
        return { pass: true, userId, cacheGeoOk: true }
    }

    // ── 5. No countries configured → allow all ───────────────────────────────
    if (allowedCountries.length === 0) {
        return { pass: true, userId, cacheGeoOk: true }
    }

    // ── 6 & 7. GeoIP lookup + allowlist checks ───────────────────────────────
    const geoInfo = await lookupGeoInfo(ip)

    // Private/unknown IP (e.g. local dev) → allow
    if (!geoInfo.countryCode) {
        return { pass: true, userId, cacheGeoOk: true, geoInfo }
    }

    const cc = geoInfo.countryCode.toUpperCase()

    if (allowedCountries.some(c => c.toUpperCase() === cc)) {
        return { pass: true, userId, cacheGeoOk: true, geoInfo }
    }

    const userOverride: string[] = (mem?.geo_country_override as string[]) ?? []
    if (userOverride.some(c => c.toUpperCase() === cc)) {
        return { pass: true, userId, cacheGeoOk: true, geoInfo }
    }

    // ── Resolve bypass permission ────────────────────────────────────────────
    // Per-user setting takes precedence; falls back to workspace default.
    const bypassAllowed: boolean = mem?.geo_bypass_allowed ?? ws.geo_bypass_allowed ?? false

    // ── 8. Bypass cookie ─────────────────────────────────────────────────────
    const bypassToken = request.cookies.get(bypassCookieName(workspaceId))?.value
    if (bypassToken) {
        try {
            const valid = await verifyBypassCookieToken(bypassToken, workspaceId, userId)
            if (valid) {
                return { pass: true, userId, cacheGeoOk: false, geoInfo, bypassAllowed }
            }
        } catch { /* malformed token */ }
    }

    // ── 9. Blocked ───────────────────────────────────────────────────────────
    return { pass: false, userId, cacheGeoOk: false, geoInfo, bypassAllowed }
}
