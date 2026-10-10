import { STORAGE_PROVIDERS } from '@/lib/storage-config'

export type EnvVarRequirement = 'required' | 'conditional' | 'optional'
export type EnvVarStatus = 'configured' | 'missing' | 'placeholder' | 'optional_missing'

export type EnvVarDefinition = {
    name: string
    category:
        | 'Authentication (Auth0)'
        | 'Database (Supabase)'
        | 'Object Storage (S3-Compatible)'
        | 'App & Security'
        | 'Email Service (Resend)'
        | 'Commercial Billing (Stripe)'
        | 'Autonomous Agents & Web3'
    service: string
    requirement: EnvVarRequirement
    isSecret: boolean
    description: string
    whyNeeded: string
    signUpUrl: string
    signUpLabel: string
    howToGet: string
    example: string
    conditionReason?: (env: NodeJS.ProcessEnv) => { isRequired: boolean; reason: string }
}

export const PLACEHOLDER_PATTERNS = [
    /^<.*>$/,
    /your[-_]/i,
    /YOUR_/,
    /example\.com/i,
    /yourdomain\.com/i,
    /yourcompany\.com/i,
    /your-tenant/i,
    /your-project/i,
    /your-32-char/i,
    /0xYour/i,
    /your-bucket/i,
]

export function isPlaceholder(val: string): boolean {
    const trimmed = val.trim()
    return PLACEHOLDER_PATTERNS.some(p => p.test(trimmed))
}

export function maskValue(name: string, val: string | undefined, isSecret: boolean): string | undefined {
    if (!val) return undefined
    const trimmed = val.trim()
    if (!isSecret) {
        if (trimmed.length > 50) {
            return `${trimmed.slice(0, 30)}...${trimmed.slice(-10)}`
        }
        return trimmed
    }

    if (trimmed.length <= 8) {
        return `●●●●●●●● (${trimmed.length} chars)`
    }

    const prefixes = ['sk_test_', 'sk_live_', 'whsec_', 're_', 'pk_test_', 'pk_live_']
    for (const prefix of prefixes) {
        if (trimmed.startsWith(prefix)) {
            return `${prefix}••••${trimmed.slice(-4)} (${trimmed.length} chars)`
        }
    }

    return `••••••••••••${trimmed.slice(-4)} (${trimmed.length} chars)`
}

/**
 * Community Edition Environment Variables (Self-Hosted Base)
 * Strictly excludes any Stripe or Autonomous Agent variables.
 */
export const COMMUNITY_ENV_DEFINITIONS: EnvVarDefinition[] = [
    // ── 1. Authentication (Auth0) ──────────────────────────────────
    {
        name: 'AUTH0_SECRET',
        category: 'Authentication (Auth0)',
        service: 'Auth0',
        requirement: 'required',
        isSecret: true,
        description: '32-byte secret used by the Next.js Auth0 SDK to encrypt session cookies.',
        whyNeeded: 'Required for secure user authentication sessions and cookie tampering prevention.',
        signUpUrl: 'https://auth0.com',
        signUpLabel: 'Auth0 Console',
        howToGet: 'Generate locally via terminal: openssl rand -hex 32 or node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))".',
        example: '4a8f9c1b2e3d4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a',
    },
    {
        name: 'AUTH0_DOMAIN',
        category: 'Authentication (Auth0)',
        service: 'Auth0',
        requirement: 'required',
        isSecret: false,
        description: 'Auth0 tenant domain hostname.',
        whyNeeded: 'Directs the application to your Auth0 identity provider tenant for login, logout, and token exchange.',
        signUpUrl: 'https://manage.auth0.com',
        signUpLabel: 'Auth0 Dashboard',
        howToGet: 'In Auth0 Dashboard > Applications > Applications > [Your App] > Settings > Basic Information > Domain.',
        example: 'your-tenant.us.auth0.com',
    },
    {
        name: 'AUTH0_CLIENT_ID',
        category: 'Authentication (Auth0)',
        service: 'Auth0',
        requirement: 'required',
        isSecret: false,
        description: 'Unique public client identifier for your Auth0 Regular Web Application.',
        whyNeeded: 'Identifies the TeamVault web app during OAuth 2.0 / OIDC authentication handshakes.',
        signUpUrl: 'https://manage.auth0.com',
        signUpLabel: 'Auth0 Applications',
        howToGet: 'In Auth0 Dashboard > Applications > Applications > [Your App] > Settings > Basic Information > Client ID.',
        example: '0a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P',
    },
    {
        name: 'AUTH0_CLIENT_SECRET',
        category: 'Authentication (Auth0)',
        service: 'Auth0',
        requirement: 'required',
        isSecret: true,
        description: 'Confidential client secret for your Auth0 Regular Web Application.',
        whyNeeded: 'Allows the Next.js server to securely exchange authorization codes for identity tokens with Auth0.',
        signUpUrl: 'https://manage.auth0.com',
        signUpLabel: 'Auth0 Applications',
        howToGet: 'In Auth0 Dashboard > Applications > Applications > [Your App] > Settings > Basic Information > Client Secret.',
        example: 'zYxWvUtSrQpOnMlKjIhGfEdCbA9876543210',
    },
    {
        name: 'APP_BASE_URL',
        category: 'Authentication (Auth0)',
        service: 'Auth0 / Next.js',
        requirement: 'required',
        isSecret: false,
        description: 'Root origin of your application where Auth0 redirects users after login.',
        whyNeeded: 'Used by Auth0 SDK to construct redirect URIs (e.g. /auth/callback). Must match the Allowed Callback URLs in Auth0.',
        signUpUrl: 'https://manage.auth0.com',
        signUpLabel: 'Auth0 URL Settings',
        howToGet: 'Set to http://localhost:3000 for local development, or your production URL (e.g. https://vault.example.com).',
        example: 'http://localhost:3000',
    },
    {
        name: 'AUTH0_AUDIENCE',
        category: 'Authentication (Auth0)',
        service: 'Auth0',
        requirement: 'optional',
        isSecret: false,
        description: 'API Identifier for TeamVault API (used for Desktop App and JWT verification).',
        whyNeeded: 'Required if connecting the Electron desktop sync client or issuing bearer API tokens.',
        signUpUrl: 'https://manage.auth0.com',
        signUpLabel: 'Auth0 APIs',
        howToGet: 'In Auth0 Dashboard > Applications > APIs > Create API (Identifier: https://api.teamvault.com).',
        example: 'https://api.teamvault.com',
    },
    {
        name: 'AUTH0_ISSUER_BASE_URL',
        category: 'Authentication (Auth0)',
        service: 'Auth0',
        requirement: 'optional',
        isSecret: false,
        description: 'Canonical issuer URL of your Auth0 tenant for desktop client JWT validation.',
        whyNeeded: 'Used by desktop bearer token middleware to verify JWT signatures against your Auth0 tenant.',
        signUpUrl: 'https://manage.auth0.com',
        signUpLabel: 'Auth0 APIs',
        howToGet: 'Defaults to https://${AUTH0_DOMAIN}. Found in Auth0 Dashboard > Applications > APIs > [Your API] > Issuer URL.',
        example: 'https://your-tenant.us.auth0.com',
    },

    // ── 2. Database (Supabase) ─────────────────────────────────────
    {
        name: 'NEXT_PUBLIC_SUPABASE_URL',
        category: 'Database (Supabase)',
        service: 'Supabase',
        requirement: 'required',
        isSecret: false,
        description: 'REST API & database URL for your Supabase project.',
        whyNeeded: 'Allows both browser client and server runtime to connect to PostgreSQL database tables.',
        signUpUrl: 'https://supabase.com',
        signUpLabel: 'Supabase Console',
        howToGet: 'In Supabase Dashboard > Project Settings > API > Project URL.',
        example: 'https://xyzprojectref.supabase.co',
    },
    {
        name: 'SUPABASE_SECRET_KEY',
        category: 'Database (Supabase)',
        service: 'Supabase',
        requirement: 'conditional',
        isSecret: true,
        description: 'Master secret key for server-side operations (starts with sb_secret_...). Replaces legacy service_role key.',
        whyNeeded: 'Required for all server runtime operations, bypassing Row Level Security. Supabase is deprecating legacy JWT service_role keys by end of 2026.',
        signUpUrl: 'https://supabase.com',
        signUpLabel: 'Supabase API Keys',
        howToGet: 'In Supabase Dashboard > Project Settings > API Keys > Secret Key (starts with sb_secret_...). Never expose to the browser.',
        example: 'sb_secret_mY7x89K1...',
        conditionReason: (env) => {
            const hasLegacy = !!(env.SUPABASE_SERVICE_ROLE_KEY && env.SUPABASE_SERVICE_ROLE_KEY.trim() && !isPlaceholder(env.SUPABASE_SERVICE_ROLE_KEY))
            return {
                isRequired: !hasLegacy,
                reason: hasLegacy
                    ? 'Satisfied by legacy SUPABASE_SERVICE_ROLE_KEY (deprecated by Supabase late 2026).'
                    : 'Required master secret key for database operations (starts with sb_secret_...).',
            }
        },
    },
    {
        name: 'SUPABASE_SERVICE_ROLE_KEY',
        category: 'Database (Supabase)',
        service: 'Supabase',
        requirement: 'conditional',
        isSecret: true,
        description: 'Legacy service_role key (JWT format, deprecated by Supabase late 2026).',
        whyNeeded: 'Legacy fallback for existing projects. New deployments should configure SUPABASE_SECRET_KEY instead.',
        signUpUrl: 'https://supabase.com',
        signUpLabel: 'Supabase API Keys',
        howToGet: 'Found in legacy Supabase API settings. If creating a new project, use SUPABASE_SECRET_KEY (sb_secret_...) instead.',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        conditionReason: (env) => {
            const hasModern = !!(env.SUPABASE_SECRET_KEY && env.SUPABASE_SECRET_KEY.trim() && !isPlaceholder(env.SUPABASE_SECRET_KEY))
            return {
                isRequired: false,
                reason: hasModern
                    ? 'Supabase Secret Key is already configured. Legacy service_role key is deprecated.'
                    : 'Optional legacy alternative to SUPABASE_SECRET_KEY (deprecated end of 2026).',
            }
        },
    },
    {
        name: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
        category: 'Database (Supabase)',
        service: 'Supabase',
        requirement: 'conditional',
        isSecret: true,
        description: 'Public publishable API key for client-side queries (starts with sb_publishable_...).',
        whyNeeded: 'Required by browser components for public database interactions. Replaces legacy anon key.',
        signUpUrl: 'https://supabase.com',
        signUpLabel: 'Supabase API Keys',
        howToGet: 'In Supabase Dashboard > Project Settings > API Keys > Publishable Key (starts with sb_publishable_...).',
        example: 'sb_publishable_a1b2c3d4...',
        conditionReason: (env) => {
            const hasLegacy = !!(env.NEXT_PUBLIC_SUPABASE_ANON_KEY && env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim() && !isPlaceholder(env.NEXT_PUBLIC_SUPABASE_ANON_KEY))
            return {
                isRequired: !hasLegacy,
                reason: hasLegacy
                    ? 'Satisfied by legacy NEXT_PUBLIC_SUPABASE_ANON_KEY (deprecated by Supabase late 2026).'
                    : 'Required public client key for Supabase interaction (starts with sb_publishable_...).',
            }
        },
    },
    {
        name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        category: 'Database (Supabase)',
        service: 'Supabase',
        requirement: 'conditional',
        isSecret: true,
        description: 'Legacy anonymous public API key (JWT format, deprecated by Supabase late 2026).',
        whyNeeded: 'Legacy fallback for existing projects. New deployments should use NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY instead.',
        signUpUrl: 'https://supabase.com',
        signUpLabel: 'Supabase API Keys',
        howToGet: 'Found in legacy Supabase API settings. If creating a new project, use NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY instead.',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        conditionReason: (env) => {
            const hasModern = !!(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.trim() && !isPlaceholder(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY))
            return {
                isRequired: false,
                reason: hasModern
                    ? 'Publishable key is already configured. Legacy anon key is deprecated.'
                    : 'Optional legacy alternative to NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (deprecated end of 2026).',
            }
        },
    },

    // ── 3. Object Storage (S3-Compatible) ──────────────────────────
    {
        name: 'STORAGE_PROVIDER',
        category: 'Object Storage (S3-Compatible)',
        service: 'S3-Compatible Storage',
        requirement: 'required',
        isSecret: false,
        description: 'Active storage provider driver ID.',
        whyNeeded: `Configures S3 client endpoint conventions. Supported: ${STORAGE_PROVIDERS.join(', ')}.`,
        signUpUrl: 'https://dash.cloudflare.com',
        signUpLabel: 'Cloudflare R2 (Recommended)',
        howToGet: 'Select your provider: r2, s3, gcs, wasabi, backblaze, digitalocean, minio, ceph, ibm, or custom.',
        example: 'r2',
    },
    {
        name: 'STORAGE_BUCKET_NAME',
        category: 'Object Storage (S3-Compatible)',
        service: 'S3-Compatible Storage',
        requirement: 'required',
        isSecret: false,
        description: 'Target bucket / space / container name for storing files and versions.',
        whyNeeded: 'Specifies the bucket where files, chunks, and watermarked downloads are stored.',
        signUpUrl: 'https://dash.cloudflare.com',
        signUpLabel: 'Storage Console',
        howToGet: 'Create a bucket in your storage provider dashboard (e.g. Cloudflare Dashboard > R2 > Create bucket).',
        example: 'teamvault-files',
    },
    {
        name: 'STORAGE_ACCESS_KEY_ID',
        category: 'Object Storage (S3-Compatible)',
        service: 'S3-Compatible Storage',
        requirement: 'required',
        isSecret: true,
        description: 'S3 API Key ID or HMAC Access Key with read/write permissions.',
        whyNeeded: 'Used by AWS SDK to sign presigned PUT/GET URLs and execute bucket operations.',
        signUpUrl: 'https://dash.cloudflare.com',
        signUpLabel: 'Storage API Credentials',
        howToGet: 'In your storage provider dashboard > Manage API Tokens / Credentials > Create token with Object Read & Write permissions.',
        example: '7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
    },
    {
        name: 'STORAGE_SECRET_ACCESS_KEY',
        category: 'Object Storage (S3-Compatible)',
        service: 'S3-Compatible Storage',
        requirement: 'required',
        isSecret: true,
        description: 'S3 API Secret Key or HMAC Secret.',
        whyNeeded: 'Used by AWS SDK to calculate cryptographic HMAC-SHA256 signatures for storage requests.',
        signUpUrl: 'https://dash.cloudflare.com',
        signUpLabel: 'Storage API Credentials',
        howToGet: 'Generated alongside STORAGE_ACCESS_KEY_ID when creating your S3 API credentials. Save immediately as it is only shown once.',
        example: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
    },
    {
        name: 'STORAGE_ACCOUNT_ID',
        category: 'Object Storage (S3-Compatible)',
        service: 'Cloudflare R2',
        requirement: 'conditional',
        isSecret: false,
        description: 'Cloudflare Account ID (constructs https://<id>.r2.cloudflarestorage.com).',
        whyNeeded: 'Required when STORAGE_PROVIDER=r2 to automatically construct the Cloudflare R2 endpoint URL.',
        signUpUrl: 'https://dash.cloudflare.com',
        signUpLabel: 'Cloudflare Dashboard',
        howToGet: 'In Cloudflare Dashboard > right sidebar of Account Overview or inside any R2 bucket overview.',
        example: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
        conditionReason: (env) => {
            const p = (env.STORAGE_PROVIDER || '').trim().toLowerCase()
            const isR2 = p === 'r2' || (!p && !env.STORAGE_ENDPOINT)
            return {
                isRequired: isR2 && !env.STORAGE_ENDPOINT && !env.R2_ENDPOINT,
                reason: 'Required when using Cloudflare R2 without an explicit STORAGE_ENDPOINT.',
            }
        },
    },
    {
        name: 'STORAGE_REGION',
        category: 'Object Storage (S3-Compatible)',
        service: 'S3-Compatible Storage',
        requirement: 'conditional',
        isSecret: false,
        description: 'Storage bucket region (e.g. us-east-1, nyc3, us-west-004).',
        whyNeeded: 'Required for AWS S3, Wasabi, Backblaze B2, DigitalOcean Spaces, IBM COS, and Custom providers.',
        signUpUrl: 'https://aws.amazon.com/s3/',
        signUpLabel: 'S3 Console',
        howToGet: 'Found in your bucket properties (e.g. us-east-1 for AWS, nyc3 for DigitalOcean, us-west-004 for Backblaze).',
        example: 'us-east-1',
        conditionReason: (env) => {
            const p = (env.STORAGE_PROVIDER || '').trim().toLowerCase()
            const needsRegion = ['s3', 'wasabi', 'backblaze', 'digitalocean', 'ibm', 'custom'].includes(p)
            return {
                isRequired: needsRegion,
                reason: `Required for ${p || 'the selected'} provider to construct the S3 endpoint and signature scope.`,
            }
        },
    },
    {
        name: 'STORAGE_ENDPOINT',
        category: 'Object Storage (S3-Compatible)',
        service: 'S3-Compatible Storage',
        requirement: 'conditional',
        isSecret: false,
        description: 'Custom S3 API endpoint URL (overrides default preset).',
        whyNeeded: 'Required for MinIO, Ceph RADOS Gateway, IBM COS, and Custom providers.',
        signUpUrl: 'https://min.io',
        signUpLabel: 'MinIO Documentation',
        howToGet: 'Set to your self-hosted MinIO/Ceph host (e.g. http://localhost:9000 or https://s3.company.internal).',
        example: 'http://localhost:9000',
        conditionReason: (env) => {
            const p = (env.STORAGE_PROVIDER || '').trim().toLowerCase()
            const needsEndpoint = ['minio', 'ceph', 'ibm', 'custom'].includes(p)
            return {
                isRequired: needsEndpoint,
                reason: `Required for self-hosted / custom provider "${p || 'custom'}" because endpoint cannot be auto-derived.`,
            }
        },
    },
    {
        name: 'STORAGE_FORCE_PATH_STYLE',
        category: 'Object Storage (S3-Compatible)',
        service: 'S3-Compatible Storage',
        requirement: 'optional',
        isSecret: false,
        description: 'Force path-style URLs (endpoint/bucket/key) instead of virtual-hosted (bucket.endpoint/key).',
        whyNeeded: 'Required by MinIO, Ceph, and custom S3 gateways without wildcard DNS.',
        signUpUrl: 'https://min.io',
        signUpLabel: 'Path Style Docs',
        howToGet: 'Set to "true" or "false". Defaults to true for r2, minio, ceph, custom.',
        example: 'true',
    },

    // ── 4. App & Security ──────────────────────────────────────────
    {
        name: 'NEXT_PUBLIC_APP_URL',
        category: 'App & Security',
        service: 'TeamVault App',
        requirement: 'required',
        isSecret: false,
        description: 'Public canonical base URL of your TeamVault instance.',
        whyNeeded: 'Used across client components, link generation, email bypass links, and sitemaps.',
        signUpUrl: 'https://teamvault.cloud',
        signUpLabel: 'App Documentation',
        howToGet: 'Set to http://localhost:3000 locally, or https://yourdomain.com in production.',
        example: 'http://localhost:3000',
    },
    {
        name: 'NEXT_PUBLIC_DEFAULT_WORKSPACE_ID',
        category: 'App & Security',
        service: 'TeamVault App',
        requirement: 'required',
        isSecret: false,
        description: 'Default root workspace UUID.',
        whyNeeded: 'Directs users to the default workspace when hitting the root route /.',
        signUpUrl: 'https://supabase.com',
        signUpLabel: 'Supabase Table Editor',
        howToGet: 'Obtain from your Supabase workspaces table after running the initial seed or creating your first workspace.',
        example: '11111111-2222-3333-4444-555555555555',
    },
    {
        name: 'MASTER_ADMIN_EMAILS',
        category: 'App & Security',
        service: 'TeamVault App',
        requirement: 'required',
        isSecret: true,
        description: 'Comma-separated email addresses authorized for /master-admin access.',
        whyNeeded: 'Controls who can access the service console, manage all workspaces, and view this environment audit.',
        signUpUrl: 'https://teamvault.cloud',
        signUpLabel: 'Admin Guide',
        howToGet: 'List your admin email(s) separated by commas (case-insensitive).',
        example: 'admin@yourcompany.com,devops@yourcompany.com',
    },
    {
        name: 'INTERNAL_CRON_SECRET',
        category: 'App & Security',
        service: 'TeamVault App',
        requirement: 'optional',
        isSecret: true,
        description: 'Bearer authentication secret for internal cron maintenance endpoints.',
        whyNeeded: 'Protects /api/internal/recycle-bin/cleanup from unauthorized triggers by external actors.',
        signUpUrl: 'https://teamvault.cloud',
        signUpLabel: 'Cron Security',
        howToGet: 'Generate via terminal: openssl rand -hex 24.',
        example: '9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c',
    },

    // ── 5. Email Service (Resend - Optional/Recommended for Community) ─
    {
        name: 'RESEND_API_KEY',
        category: 'Email Service (Resend)',
        service: 'Resend',
        requirement: 'optional',
        isSecret: true,
        description: 'Resend API key for sending transactional emails.',
        whyNeeded: 'Optional in Community Edition: required only if sending workspace invitations or geofence bypass codes via email.',
        signUpUrl: 'https://resend.com/api-keys',
        signUpLabel: 'Resend API Keys',
        howToGet: 'In Resend Dashboard > API Keys > Create API Key (Full Access or Sending Access).',
        example: 're_123456789_abcdefg',
    },
    {
        name: 'EMAIL_FROM_INVITES',
        category: 'Email Service (Resend)',
        service: 'Resend',
        requirement: 'optional',
        isSecret: false,
        description: 'From email header for workspace invitation emails.',
        whyNeeded: 'Sender display and domain for outgoing user invitations.',
        signUpUrl: 'https://resend.com/domains',
        signUpLabel: 'Resend Domains',
        howToGet: 'Use an email address matching your verified domain in Resend.',
        example: 'TeamVault Invites <invites@yourdomain.com>',
    },
    {
        name: 'EMAIL_FROM_SECURITY',
        category: 'Email Service (Resend)',
        service: 'Resend',
        requirement: 'optional',
        isSecret: false,
        description: 'From email header for geofence bypass codes and security alerts.',
        whyNeeded: 'Sender display and domain for security-related OTP codes.',
        signUpUrl: 'https://resend.com/domains',
        signUpLabel: 'Resend Domains',
        howToGet: 'Use an email address matching your verified domain in Resend.',
        example: 'TeamVault Security <security@yourdomain.com>',
    },
]
