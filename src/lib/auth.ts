import { getAuth0 } from '@/lib/auth0-client'
import { getAdminClient } from '@/db'
import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export { getAuth0 }

export type TeamVaultSession = {
    userId: string
    email: string
}

/**
 * Get the current Auth0 session and resolve the internal TeamVault user.
 * Returns null if not authenticated.
 */
export async function getTeamVaultSession(req?: NextRequest, res?: NextResponse): Promise<TeamVaultSession | null> {
    // Calling cookies() opts the Route Handler into dynamic rendering
    // and ensures that Next.js makes cookies available to the Auth0 SDK
    cookies()

    const session = req ? await getAuth0().getSession(req) : await getAuth0().getSession()
    if (!session?.user) return null

    const db = getAdminClient()
    const sub = session.user.sub as string
    const email = session.user.email as string
    const [provider] = sub.split('|')

    const { data: existingUser } = await db
        .from('users')
        .select('id')
        .eq('email', email)
        .single()

    if (!existingUser) {
        // Auto-provision user on first login
        console.log(`[AUTH] Auto-provisioning new user: ${email}`)
        const name = (session.user.name as string) || (session.user.nickname as string) || null

        const { data: newUser, error: insertError } = await db
            .from('users')
            .insert({
                email,
                name,
                auth_provider: provider,
                auth_subject: sub
            })
            .select('id')
            .single()

        if (insertError || !newUser) {
            console.error('[DEBUG] Failed to provision new user:', insertError)
            return null
        }

        return { userId: newUser.id, email }
    }

    // User exists (invited), safely link their Auth0 identity and update name
    const name = (session.user.name as string) || (session.user.nickname as string) || null
    const { data: user, error } = await db
        .from('users')
        .update({ name, auth_provider: provider, auth_subject: sub })
        .eq('id', existingUser.id)
        .select('id')
        .single()

    if (error || !user) {
        console.error('[DEBUG] getTeamVaultSession Supabase Error:', error, 'User:', user)
        return null
    }
    return { userId: user.id, email }
}

/**
 * Require a valid session — returns session or throws a 401 NextResponse.
 */
export async function requireSession(req?: NextRequest, res?: NextResponse): Promise<TeamVaultSession> {
    const session = await getTeamVaultSession(req, res)
    if (!session) {
        throw NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return session
}

export type Membership = {
    role: 'admin' | 'user'
    can_upload: boolean
    status: 'invited' | 'active' | 'disabled'
}

/**
 * Require an active workspace membership.
 * Throws a 403 NextResponse if not active.
 */
export async function requireMembership(
    userId: string,
    workspaceId: string
): Promise<Membership> {
    const db = getAdminClient()
    const { data, error } = await db
        .from('memberships')
        .select('role, can_upload, status')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .single()

    if (error || !data) {
        throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (data.status === 'disabled') {
        throw NextResponse.json({ error: 'Account disabled' }, { status: 403 })
    }

    // Auto-activate invited users on first login
    if (data.status === 'invited') {
        await db
            .from('memberships')
            .update({ status: 'active' })
            .eq('workspace_id', workspaceId)
            .eq('user_id', userId)
        data.status = 'active'
    }

    return data as Membership
}
