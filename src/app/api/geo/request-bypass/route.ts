import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { getAdminClient } from '@/db'
import { generateBypassCode, hashBypassCode } from '@/lib/bypass-code'
import { logAuditEvent } from '@/lib/audit'
import { GEOFENCE_BYPASS_CODE_TTL_SECONDS } from '@/lib/config'

/**
 * POST /api/geo/request-bypass
 * Body: { workspace_id: string }
 *
 * Generates a one-time bypass code, stores the hash in the DB, and emails
 * the plain code to the authenticated user. The plain code is NEVER logged.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const { workspace_id } = await req.json()

        if (!workspace_id) {
            return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
        }

        const db = getAdminClient()

        // Verify membership exists and bypass is allowed
        const [userRes, wsRes] = await Promise.all([
            db.from('users').select('id, email, name').eq('id', session.userId).single(),
            db.from('workspaces')
                .select('id, name, geo_bypass_allowed')
                .eq('id', workspace_id)
                .single(),
        ])

        const user = userRes.data
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        const ws = wsRes.data as any
        if (!ws) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

        const memRes = await db.from('memberships')
            .select('geo_bypass_allowed')
            .eq('workspace_id', workspace_id)
            .eq('user_id', session.userId)
            .single()

        const memBypass = (memRes.data as any)?.geo_bypass_allowed
        const canBypass: boolean = memBypass ?? ws.geo_bypass_allowed ?? false

        if (!canBypass) {
            return NextResponse.json({ error: 'Bypass codes are not enabled for your account' }, { status: 403 })
        }

        // Invalidate any existing unused codes for this user+workspace
        await db.from('geofence_bypass_codes')
            .update({ used: true })
            .eq('workspace_id', workspace_id)
            .eq('user_id', session.userId)
            .eq('used', false)

        // Generate new code
        const plainCode = generateBypassCode()
        const codeHash = await hashBypassCode(plainCode)
        const expiresAt = new Date(Date.now() + GEOFENCE_BYPASS_CODE_TTL_SECONDS * 1000).toISOString()

        await db.from('geofence_bypass_codes').insert({
            workspace_id,
            user_id: session.userId,
            code_hash: codeHash,
            expires_at: expiresAt,
        })

        // Audit: log that a code was SENT — do NOT log the code itself
        logAuditEvent({
            workspaceId: workspace_id,
            actorUserId: session.userId,
            actorEmail: user.email,
            action: 'GEO_BYPASS_SENT',
            result: 'allowed',
            metadata: {
                // Code deliberately omitted
                recipient_email: user.email,
                expires_at: expiresAt,
            },
        })

        // Send the bypass code via email (Resend)
        if (process.env.RESEND_API_KEY) {
            try {
                await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        from: process.env.EMAIL_FROM_SECURITY || 'TeamVault Security <security@teamvault.cloud>',
                        to: user.email,
                        subject: `Your TeamVault access code for ${ws.name}`,
                        html: `
                            <div style="font-family:sans-serif;line-height:1.6;color:#333;max-width:480px">
                                <h2 style="margin-bottom:0.25rem">TeamVault Access Code</h2>
                                <p style="margin-top:0.25rem;color:#555">
                                    You requested a one-time bypass code to access the
                                    <strong>${ws.name}</strong> workspace from a restricted location.
                                </p>
                                <div style="background:#f3f4f6;border-radius:8px;padding:1.5rem;text-align:center;margin:1.5rem 0">
                                    <p style="margin:0 0 0.5rem 0;font-size:0.875rem;color:#6b7280">Your access code</p>
                                    <p style="margin:0;font-size:2rem;font-family:monospace;font-weight:700;letter-spacing:0.25em;color:#111">
                                        ${plainCode}
                                    </p>
                                </div>
                                <p style="font-size:0.875rem;color:#6b7280">
                                    This code expires in <strong>5 minutes</strong> and can only be used once.
                                    Do not share it with anyone.
                                </p>
                                <p style="font-size:0.8125rem;color:#9ca3af">
                                    If you did not request this code, please contact your administrator immediately.
                                </p>
                            </div>
                        `,
                    }),
                })
            } catch (emailErr) {
                console.error('[geo/request-bypass] Failed to send email:', emailErr)
                // Do not fail the request — code is in DB, user can retry
            }
        } else {
            // Development fallback — log to console only (never in prod)
            console.warn(`[geo/request-bypass] RESEND_API_KEY not set. Code for ${user.email}: [REDACTED — check DB]`)
        }

        return NextResponse.json({ sent: true })
    } catch (err) {
        if (err instanceof Response) return err
        console.error('[geo/request-bypass]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
