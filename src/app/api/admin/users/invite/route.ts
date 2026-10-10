import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'
import { inviteUserSchema } from '@/lib/validation'
import { logAuditEvent } from '@/lib/audit'
import { z } from 'zod'

export async function POST(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const body = inviteUserSchema.parse(await req.json())
        const { workspace_id, email, role, can_upload } = body
        const membership = await requireMembership(session.userId, workspace_id)
        if (membership.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

        const db = getAdminClient()

        // Check if user already exists and has a membership in this workspace
        const { data: existingUser } = await db
            .from('users')
            .select('id')
            .eq('email', email)
            .single()

        if (existingUser) {
            const { data: existingMembership } = await db
                .from('memberships')
                .select('status')
                .eq('workspace_id', workspace_id)
                .eq('user_id', existingUser.id)
                .single()

            if (existingMembership) {
                return NextResponse.json(
                    { error: `This email has already been ${existingMembership.status === 'invited' ? 'invited' : 'added'}.` },
                    { status: 409 }
                )
            }
        }

        // Upsert user row (create if new, or get existing)
        const { data: user, error: userErr } = await db
            .from('users')
            .upsert({ email }, { onConflict: 'email', ignoreDuplicates: false })
            .select('id')
            .single()
        if (userErr || !user) {
            console.error('userErr:', userErr)
            return NextResponse.json({ error: 'Could not create user' }, { status: 500 })
        }

        // Create membership (invited status)
        const { data: mem, error: memErr } = await db
            .from('memberships')
            .insert({ workspace_id, user_id: user.id, role, can_upload, status: 'invited' })
            .select()
            .single()
        if (memErr) {
            console.error('memErr:', memErr)
            return NextResponse.json({ error: memErr.message }, { status: 400 })
        }
        const { data: actor } = await db.from('users').select('name, email').eq('id', session.userId).single()
        logAuditEvent({ workspaceId: workspace_id, actorUserId: session.userId, actorName: actor?.name, actorEmail: actor?.email, action: 'USER_INVITED', targetUserId: user.id, result: 'allowed', metadata: { email, role, can_upload }, request: req })

        // Dispatch invite email via Resend (using native fetch to avoid Vercel bundler issues)
        if (process.env.RESEND_API_KEY) {
            try {
                const { data: workspace } = await db.from('workspaces').select('name').eq('id', workspace_id).single();
                const workspaceName = workspace?.name || 'a workspace';
                const inviterName = actor?.name || actor?.email || 'An admin';

                await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        from: process.env.EMAIL_FROM_INVITES || 'TeamVault Invites <invites@teamvault.cloud>',
                        to: email,
                        subject: `You have been invited to join ${workspaceName} on TeamVault`,
                        html: `
                            <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
                                <h2>Welcome to TeamVault!</h2>
                                <p><strong>${inviterName}</strong> has invited you to join the <strong>${workspaceName}</strong> workspace.</p>
                                <p>To access your files and collaborate with your team, please sign in to TeamVault.</p>
                                <div style="margin: 30px 0;">
                                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://teamvault.cloud'}" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Sign In to TeamVault</a>
                                </div>
                                <p style="font-size: 0.875rem; color: #666;">If you didn't expect this invitation, you can safely ignore this email.</p>
                            </div>
                        `
                    })
                });
            } catch (emailErr) {
                console.error('Failed to send invite email:', emailErr);
                // We don't fail the overall request since the user was securely added to the database.
            }
        }

        return NextResponse.json({ user: { id: user.id, email }, membership: mem }, { status: 201 })
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        console.error('Catch err:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

