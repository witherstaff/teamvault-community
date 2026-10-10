import { createRemoteJWKSet, jwtVerify } from 'jose';
import { NextResponse, NextRequest } from 'next/server';
import { getAdminClient } from '@/db';
import { TeamVaultSession } from './auth';

// Auth0 Configuration
const AUTH0_DOMAIN = process.env.AUTH0_ISSUER_BASE_URL;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || 'https://api.teamvault.com'; // Adjust with actual audience

if (!AUTH0_DOMAIN) {
    console.warn('[AUTH] Missing AUTH0_ISSUER_BASE_URL. Desktop auth may fail.');
}

let jwksClient: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJWKS() {
    if (!jwksClient) {
        const domain = AUTH0_DOMAIN ? (AUTH0_DOMAIN.startsWith('http') ? AUTH0_DOMAIN : `https://${AUTH0_DOMAIN}`) : 'https://auth.placeholder.com';
        jwksClient = createRemoteJWKSet(new URL(`${domain}/.well-known/jwks.json`));
    }
    return jwksClient;
}

/**
 * Validates a Bearer token from the Authorization header against the Auth0 JWKS.
 * Resolves the TeamVault session similarly to getTeamVaultSession.
 */
export async function getBearerSession(req: NextRequest): Promise<TeamVaultSession | null> {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }

        const token = authHeader.split(' ')[1];

        // Verify the JWT
        const { payload } = await jwtVerify(token, getJWKS(), {
            issuer: AUTH0_DOMAIN ? `${AUTH0_DOMAIN}/` : undefined,
            algorithms: ['RS256'],
            // audience: AUTH0_AUDIENCE, // Uncomment if audience checking is needed based on tenant config
        });

        if (!payload.sub) {
            console.error('[AUTH] JWT missing sub claim');
            return null;
        }

        const sub = payload.sub;
        // Auth0 Access Tokens might not always contain the email.
        // Usually, for an API, you rely on custom claims added via Auth0 Actions, 
        // or you query the Auth0 Management API if the DB doesn't have the user yet.
        // Standard Auth0 access tokens don't include profile info by default.
        // Assuming your Auth0 tenant is configured to add email namespace to the access token:
        let email = (payload[`${AUTH0_AUDIENCE}/email`] as string) || (payload.email as string) || '';
        let name = (payload[`${AUTH0_AUDIENCE}/name`] as string) || (payload.name as string) || null;

        // M2M Test Token Support
        if (!email && payload.gty === 'client-credentials') {
            email = payload.sub + '@machine.local';
            name = 'M2M Test Machine';
        }

        const [provider] = sub.split('|');

        if (!email) {
            console.warn('[AUTH] JWT missing email claim. Is Auth0 Action configured to add email to Access Token?');
            // If the user already exists we can still find them by sub.
        }

        const db = getAdminClient();

        // Find existing user by sub first, then by email
        let { data: existingUser } = await db
            .from('users')
            .select('id, email')
            .eq('auth_subject', sub)
            .single();

        if (!existingUser && email) {
            const { data: userByEmail } = await db
                .from('users')
                .select('id, email')
                .eq('email', email)
                .single();
            existingUser = userByEmail;
        }

        if (!existingUser) {
            if (!email) {
                console.error('[AUTH] Cannot auto-provision user without email claim in token.');
                return null;
            }

            console.log(`[AUTH] Auto-provisioning new user (Bearer Token): ${email}`);

            const { data: newUser, error: insertError } = await db
                .from('users')
                .insert({
                    email,
                    name,
                    auth_provider: provider,
                    auth_subject: sub
                })
                .select('id, email')
                .single();

            if (insertError || !newUser) {
                console.error('[DEBUG] Failed to provision new user:', insertError);
                return null;
            }

            return { userId: newUser.id, email: newUser.email };
        }

        // Link existing identity
        const { data: user, error } = await db
            .from('users')
            .update({
                name: name || undefined, // only update if name is present
                auth_provider: provider,
                auth_subject: sub
            })
            .eq('id', existingUser.id)
            .select('id, email')
            .single();

        if (error || !user) {
            console.error('[DEBUG] getBearerSession Supabase Error:', error);
            return null;
        }

        return { userId: user.id, email: user.email };

    } catch (e: any) {
        console.error('[AUTH] Bearer Token Validation Failed:', e.message || e);
        return null;
    }
}

/**
 * Require a valid bearer session — returns session or throws a 401 NextResponse.
 */
export async function requireBearerSession(req: NextRequest): Promise<TeamVaultSession> {
    const session = await getBearerSession(req);
    if (!session) {
        throw NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return session;
}
