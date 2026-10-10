/**
 * Login security metadata extraction.
 * Used by middleware to enrich AUTH_LOGIN audit events.
 *
 * GeoIP uses ipapi.co (free tier: 1 000 req/day, HTTPS).
 * The lookup is best-effort — a 2 s timeout prevents it from blocking the
 * session-save callback. If it fails, geo fields are simply omitted.
 */

export interface LoginSecurityMeta {
    // Allow structural assignability to Record<string, unknown>
    [key: string]: unknown
    // Session
    session_id: string
    // Auth
    auth_method: string
    auth_provider: string
    // Network
    ip: string
    forwarded_ips: string | null
    // GeoIP (best-effort)
    geo_country: string | null
    geo_region: string | null
    geo_city: string | null
    geo_isp: string | null
    // Device
    ua_raw: string
    ua_browser: string
    ua_os: string
    ua_device: string
}

// ---------------------------------------------------------------------------
// Auth provider detection
// ---------------------------------------------------------------------------
function parseAuthProvider(sub: string | undefined): { auth_method: string; auth_provider: string } {
    if (!sub) return { auth_method: 'Unknown', auth_provider: 'unknown' }
    const prefix = sub.split('|')[0]
    const map: Record<string, string> = {
        'google-oauth2': 'OAuth — Google',
        'github': 'OAuth — GitHub',
        'facebook': 'OAuth — Facebook',
        'twitter': 'OAuth — Twitter / X',
        'twitter2': 'OAuth — Twitter / X',
        'microsoft': 'OAuth — Microsoft',
        'windowslive': 'OAuth — Microsoft Live',
        'waad': 'SSO — Azure AD / Entra',
        'samlp': 'SSO — SAML',
        'oidc': 'SSO — OIDC',
        'auth0': 'Email / Password',
        'sms': 'Passwordless — SMS',
        'email': 'Passwordless — Email',
    }
    return {
        auth_method: map[prefix] ?? `Unknown (${prefix})`,
        auth_provider: prefix,
    }
}

// ---------------------------------------------------------------------------
// User-agent parser (no external dependency; handles the most common clients)
// ---------------------------------------------------------------------------
function parseUserAgent(ua: string): { ua_browser: string; ua_os: string; ua_device: string } {
    if (!ua) return { ua_browser: 'Unknown', ua_os: 'Unknown', ua_device: 'Unknown' }

    // Device type
    let ua_device = 'Desktop'
    if (/\b(Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini)\b/i.test(ua)) {
        ua_device = 'Mobile'
    } else if (/\b(Tablet|iPad|Kindle|Silk)\b/i.test(ua) ||
        /Android(?!.*Mobile)/i.test(ua)) {
        ua_device = 'Tablet'
    }

    // Browser (most-specific first to avoid Chrome/Safari false-positives)
    let ua_browser = 'Unknown'
    const browsers: [RegExp, string][] = [
        [/Edg\/(\d+\.\d+)/, 'Edge'],
        [/OPR\/(\d+\.\d+)/, 'Opera'],
        [/SamsungBrowser\/(\d+\.\d+)/, 'Samsung Browser'],
        [/UCBrowser\/(\d+\.\d+)/, 'UC Browser'],
        [/YaBrowser\/(\d+\.\d+)/, 'Yandex Browser'],
        [/Firefox\/(\d+\.\d+)/, 'Firefox'],
        [/Chrome\/(\d+\.\d+)/, 'Chrome'],
        [/Version\/(\d+\.\d+).+Safari/, 'Safari'],
        [/MSIE\s(\d+\.\d+)/, 'IE'],
        [/Trident.+rv:(\d+\.\d+)/, 'IE'],
        [/curl\/(\d+\.\d+)/, 'curl'],
    ]
    for (const [re, name] of browsers) {
        const m = ua.match(re)
        if (m) { ua_browser = `${name} ${m[1]}`; break }
    }

    // OS
    let ua_os = 'Unknown'
    if (/Windows NT 10\.0/.test(ua)) ua_os = 'Windows 10 / 11'
    else if (/Windows NT 6\.3/.test(ua)) ua_os = 'Windows 8.1'
    else if (/Windows NT 6\.2/.test(ua)) ua_os = 'Windows 8'
    else if (/Windows NT 6\.1/.test(ua)) ua_os = 'Windows 7'
    else if (/Windows/.test(ua)) ua_os = 'Windows'
    else if (/CrOS/.test(ua)) ua_os = 'ChromeOS'
    else if (/iPhone OS ([\d_]+)/.test(ua)) {
        ua_os = `iOS ${ua.match(/iPhone OS ([\d_]+)/)![1].replace(/_/g, '.')}`
    } else if (/iPad.*OS ([\d_]+)/.test(ua)) {
        ua_os = `iPadOS ${ua.match(/OS ([\d_]+)/)![1].replace(/_/g, '.')}`
    } else if (/Mac OS X ([\d_]+)/.test(ua)) {
        ua_os = `macOS ${ua.match(/Mac OS X ([\d_]+)/)![1].replace(/_/g, '.')}`
    } else if (/Android ([\d.]+)/.test(ua)) {
        ua_os = `Android ${ua.match(/Android ([\d.]+)/)![1]}`
    } else if (/Linux/.test(ua)) {
        ua_os = 'Linux'
    }

    return { ua_browser, ua_os, ua_device }
}

// ---------------------------------------------------------------------------
// GeoIP via ipapi.co (best-effort, 2 s timeout)
// ---------------------------------------------------------------------------
const PRIVATE_RANGES = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|localhost)/

async function lookupGeo(ip: string): Promise<{
    geo_country: string | null
    geo_region: string | null
    geo_city: string | null
    geo_isp: string | null
}> {
    const empty = { geo_country: null, geo_region: null, geo_city: null, geo_isp: null }
    if (!ip || ip === 'unknown' || PRIVATE_RANGES.test(ip)) return empty
    try {
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), 2000)
        const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
            signal: ctrl.signal,
            headers: { 'Accept': 'application/json', 'User-Agent': 'TeamVault-AuditLog/1.0' },
        })
        clearTimeout(timer)
        if (!res.ok) return empty
        const data = await res.json() as Record<string, unknown>
        if (data.error) return empty
        return {
            geo_country: (data.country_name as string) ?? null,
            geo_region: (data.region as string) ?? null,
            geo_city: (data.city as string) ?? null,
            geo_isp: (data.org as string) ?? null,
        }
    } catch {
        return empty
    }
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------
export async function extractLoginSecurityMeta(
    req: { headers: { get(name: string): string | null } },
    userSub: string | undefined,
): Promise<LoginSecurityMeta> {
    const ua = req.headers.get('user-agent') ?? ''
    const xForwardedFor = req.headers.get('x-forwarded-for') ?? ''
    const xRealIp = req.headers.get('x-real-ip') ?? ''

    const ip = xForwardedFor.split(',')[0].trim() || xRealIp || 'unknown'
    const forwarded_ips = xForwardedFor.trim() || null

    const { auth_method, auth_provider } = parseAuthProvider(userSub)
    const { ua_browser, ua_os, ua_device } = parseUserAgent(ua)
    const geo = await lookupGeo(ip)

    return {
        session_id: crypto.randomUUID(),
        auth_method,
        auth_provider,
        ip,
        forwarded_ips,
        ...geo,
        ua_raw: ua,
        ua_browser,
        ua_os,
        ua_device,
    }
}
