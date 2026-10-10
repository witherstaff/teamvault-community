import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { getAdminClient } from '@/db'
import { hashBypassCode, createBypassCookieToken, bypassCookieName } from '@/lib/bypass-code'
import { logAuditEvent } from '@/lib/audit'
import { GEOFENCE_BYPASS_CODE_TTL_SECONDS, GEOFENCE_BYPASS_MAX_ATTEMPTS } from '@/lib/config'

/**
 * POST /api/geo/verify-bypass
 * Body: { workspace_id: string, code: string }
 *
 * Verifies the one-time bypass code.  On success:
 *   - Marks the code as used
 *   - Creates a signed bypass cookie token
 *   - Sets the cookie in the response (HttpOnly)
 *   - Returns { success: true }
 *
 * The client then redirects to the vault (return_to URL).
 * The code itself is never stored in audit logs.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const { workspace_id, code } = await req.json()

        if (!workspace_id || !code) {
            return NextResponse.json({ error: 'workspace_id and code required' }, { status: 400 })
        }

        const db = getAdminClient()
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
            || req.headers.get('x-real-ip')
            || 'unknown'

        const [userRes, activeCodeRes] = await Promise.all([
            db.from('users').select('id, email').eq('id', session.userId).single(),
            db.from('geofence_bypass_codes')
                .select('id, code_hash, expires_at, attempt_count')
                .eq('workspace_id', workspace_id)
                .eq('user_id', session.userId)
                .eq('used', false)
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false })
                .limit(1)
                .single(),
        ])

        const user = userRes.data
        const bypassRecord = activeCodeRes.data as {
            id: string
            code_hash: string
            expires_at: string
            attempt_count: number
        } | null

        // No active code found
        if (!bypassRecord) {
            logAuditEvent({
                workspaceId: workspace_id,
                actorUserId: session.userId,
                actorEmail: user?.email ?? null,
                action: 'GEO_BYPASS_FAIL',
                result: 'denied',
                metadata: { reason: 'expired', ip },
            })
            return NextResponse.json({ error: 'expired' }, { status: 400 })
        }

        // Max attempts exceeded
        if (bypassRecord.attempt_count >= GEOFENCE_BYPASS_MAX_ATTEMPTS) {
            await db.from('geofence_bypass_codes').update({ used: true }).eq('id', bypassRecord.id)
            logAuditEvent({
                workspaceId: workspace_id,
                actorUserId: session.userId,
                actorEmail: user?.email ?? null,
                action: 'GEO_BYPASS_FAIL',
                result: 'denied',
                metadata: { reason: 'locked', ip },
            })
            return NextResponse.json({ error: 'locked' }, { status: 429 })
        }

        // Hash submitted code and compare
        const submittedHash = await hashBypassCode(code)

        if (submittedHash !== bypassRecord.code_hash) {
            // Increment attempt counter
            await db.from('geofence_bypass_codes')
                .update({ attempt_count: bypassRecord.attempt_count + 1 })
                .eq('id', bypassRecord.id)

            logAuditEvent({
                workspaceId: workspace_id,
                actorUserId: session.userId,
                actorEmail: user?.email ?? null,
                action: 'GEO_BYPASS_FAIL',
                result: 'denied',
                metadata: { reason: 'invalid_code', ip, attempts: bypassRecord.attempt_count + 1 },
            })
            return NextResponse.json({ error: 'invalid' }, { status: 400 })
        }

        // ── Success ──────────────────────────────────────────────────────────
        // Mark code as used
        await db.from('geofence_bypass_codes').update({ used: true }).eq('id', bypassRecord.id)

        // Create signed bypass token
        const bypassToken = await createBypassCookieToken(workspace_id, session.userId)

        logAuditEvent({
            workspaceId: workspace_id,
            actorUserId: session.userId,
            actorEmail: user?.email ?? null,
            action: 'GEO_BYPASS_SUCCESS',
            result: 'allowed',
            metadata: { ip },
        })

        // Set HttpOnly bypass cookie and return success
        const res = NextResponse.json({ success: true })
        res.cookies.set(bypassCookieName(workspace_id), bypassToken, {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            maxAge: GEOFENCE_BYPASS_CODE_TTL_SECONDS,
        })
        return res
    } catch (err) {
        if (err instanceof Response) return err
        console.error('[geo/verify-bypass]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
