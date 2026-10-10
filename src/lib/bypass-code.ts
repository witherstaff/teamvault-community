/**
 * Geofence bypass-code utilities.
 *
 * Codes are short-lived (5 min), single-use, and stored as SHA-256 hashes.
 * A signed bypass-cookie token (HMAC-SHA256) is issued after successful
 * verification so subsequent middleware checks require no DB round-trip.
 */

import {
    GEOFENCE_BYPASS_CODE_TTL_SECONDS,
    GEOFENCE_BYPASS_CODE_LENGTH,
} from './config'

// ---------------------------------------------------------------------------
// Code generation + hashing
// ---------------------------------------------------------------------------

/** Unambiguous alphanumeric charset (no 0/O/1/I/l). */
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateBypassCode(): string {
    const buf = new Uint8Array(GEOFENCE_BYPASS_CODE_LENGTH)
    crypto.getRandomValues(buf)
    return Array.from(buf).map(b => CODE_CHARS[b % CODE_CHARS.length]).join('')
}

/** SHA-256 hex of the normalised (uppercase, trimmed) code. */
export async function hashBypassCode(code: string): Promise<string> {
    const data = new TextEncoder().encode(code.toUpperCase().trim())
    const buf = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ---------------------------------------------------------------------------
// Bypass cookie token (HMAC-SHA256 signed, no DB on verification)
// ---------------------------------------------------------------------------

// Uses AUTH0_SECRET (already required in the env) as the signing key.
const signingSecret = () => process.env.AUTH0_SECRET ?? 'teamvault-geo-bypass-secret'

function b64url(buf: ArrayBuffer | Uint8Array): string {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
    return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function b64urlDecode(s: string): Uint8Array<ArrayBuffer> {
    const padded = s.replace(/-/g, '+').replace(/_/g, '/') +
        '==='.slice(0, (4 - (s.length % 4)) % 4)
    const bytes = Uint8Array.from(atob(padded), c => c.charCodeAt(0))
    // Return a Uint8Array backed by a plain ArrayBuffer (not SharedArrayBuffer)
    // so TypeScript is happy with SubtleCrypto's BufferSource parameter.
    return new Uint8Array(bytes.buffer.slice(0) as ArrayBuffer)
}

/**
 * Create a signed bypass token to store in a cookie.
 * Payload: { w: workspaceId, u: userId, exp: unix-seconds }
 */
export async function createBypassCookieToken(
    workspaceId: string,
    userId: string,
): Promise<string> {
    const exp = Math.floor(Date.now() / 1000) + GEOFENCE_BYPASS_CODE_TTL_SECONDS
    const payload = b64url(new TextEncoder().encode(JSON.stringify({ w: workspaceId, u: userId, exp })))

    const key = await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(signingSecret()),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    )
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
    return `${payload}.${b64url(sig)}`
}

/**
 * Verify a bypass cookie token.
 * Returns true only when signature is valid, workspace + user match, and not expired.
 */
export async function verifyBypassCookieToken(
    token: string,
    workspaceId: string,
    userId: string,
): Promise<boolean> {
    try {
        const dot = token.lastIndexOf('.')
        if (dot < 1) return false

        const payload = token.slice(0, dot)
        const sigB64 = token.slice(dot + 1)

        const key = await crypto.subtle.importKey(
            'raw', new TextEncoder().encode(signingSecret()),
            { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
        )
        const valid = await crypto.subtle.verify(
            'HMAC', key, b64urlDecode(sigB64), new TextEncoder().encode(payload),
        )
        if (!valid) return false

        const data = JSON.parse(new TextDecoder().decode(b64urlDecode(payload)))
        if (data.w !== workspaceId || data.u !== userId) return false
        if (data.exp < Math.floor(Date.now() / 1000)) return false

        return true
    } catch {
        return false
    }
}

/**
 * The HttpOnly cookie name used to persist a verified bypass for a specific workspace.
 * Uses the first 12 hex chars of the workspace UUID (no hyphens) for brevity.
 */
export function bypassCookieName(workspaceId: string): string {
    return `_tv_gb_${workspaceId.replace(/-/g, '').slice(0, 12)}`
}

/**
 * The HttpOnly cookie name used to cache a "geo-ok" result for a workspace,
 * avoiding repeated DB + GeoIP calls on every request.
 */
export function geoOkCookieName(workspaceId: string): string {
    return `_tv_geo_ok_${workspaceId.replace(/-/g, '').slice(0, 12)}`
}
