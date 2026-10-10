/**
 * Storage configuration resolver.
 *
 * Builds an S3-compatible client configuration from environment variables.
 * Every supported provider speaks the S3 API, so a single @aws-sdk/client-s3
 * client is used for all of them — only endpoint / region / path-style differ.
 *
 * Environment variables:
 *   STORAGE_PROVIDER           r2 | s3 | gcs | wasabi | backblaze | digitalocean | minio | ceph | ibm | custom
 *   STORAGE_BUCKET_NAME        bucket (container / space) name
 *   STORAGE_ACCESS_KEY_ID      access key / HMAC key ID
 *   STORAGE_SECRET_ACCESS_KEY  secret key / HMAC secret
 *   STORAGE_ENDPOINT           optional — overrides the provider preset (required for minio | ceph | ibm | custom)
 *   STORAGE_REGION             optional — required for s3 | wasabi | backblaze | digitalocean | ibm | custom
 *   STORAGE_ACCOUNT_ID         r2 only — used to build the endpoint when STORAGE_ENDPOINT is blank
 *   STORAGE_FORCE_PATH_STYLE   optional "true" | "false" — overrides the provider preset
 *
 * Legacy support: if STORAGE_PROVIDER is unset and any R2_* variable is present,
 * the provider defaults to "r2" and R2_ENDPOINT / R2_ACCESS_KEY_ID /
 * R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME / R2_ACCOUNT_ID are used as fallbacks.
 * Legacy names are only read here — no other file should reference R2_*.
 */

export const STORAGE_PROVIDERS = [
    'r2',
    's3',
    'gcs',
    'wasabi',
    'backblaze',
    'digitalocean',
    'minio',
    'ceph',
    'ibm',
    'custom',
] as const

export type StorageProvider = (typeof STORAGE_PROVIDERS)[number]

export type ResolvedStorageConfig = {
    provider: StorageProvider
    endpoint: string | undefined // undefined = SDK default (AWS S3 only)
    region: string
    bucket: string
    accessKeyId: string
    secretAccessKey: string
    forcePathStyle: boolean
    usingLegacyEnv: boolean
}

type ProviderPreset = {
    label: string
    /** Default region when STORAGE_REGION is unset. null = region is required. */
    defaultRegion: string | null
    forcePathStyle: boolean
    /** Endpoint is required (no way to derive it). */
    endpointRequired: boolean
    /** Build an endpoint from region / account ID when STORAGE_ENDPOINT is blank. */
    buildEndpoint?: (opts: { region: string; accountId?: string }) => string | undefined
}

export const PROVIDER_PRESETS: Record<StorageProvider, ProviderPreset> = {
    r2: {
        label: 'Cloudflare R2',
        defaultRegion: 'auto',
        forcePathStyle: true,
        endpointRequired: false,
        buildEndpoint: ({ accountId }) =>
            accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined,
    },
    s3: {
        label: 'Amazon S3',
        defaultRegion: null,
        forcePathStyle: false,
        endpointRequired: false,
        // SDK derives the endpoint from the region
        buildEndpoint: () => undefined,
    },
    gcs: {
        label: 'Google Cloud Storage (S3 interoperability)',
        defaultRegion: 'auto',
        forcePathStyle: false,
        endpointRequired: false,
        buildEndpoint: () => 'https://storage.googleapis.com',
    },
    wasabi: {
        label: 'Wasabi',
        defaultRegion: null,
        forcePathStyle: false,
        endpointRequired: false,
        buildEndpoint: ({ region }) => `https://s3.${region}.wasabisys.com`,
    },
    backblaze: {
        label: 'Backblaze B2',
        defaultRegion: null,
        forcePathStyle: false,
        endpointRequired: false,
        buildEndpoint: ({ region }) => `https://s3.${region}.backblazeb2.com`,
    },
    digitalocean: {
        label: 'DigitalOcean Spaces',
        defaultRegion: null,
        forcePathStyle: false,
        endpointRequired: false,
        buildEndpoint: ({ region }) => `https://${region}.digitaloceanspaces.com`,
    },
    minio: {
        label: 'MinIO',
        defaultRegion: 'us-east-1',
        forcePathStyle: true,
        endpointRequired: true,
    },
    ceph: {
        label: 'Ceph RADOS Gateway',
        defaultRegion: 'default',
        forcePathStyle: true,
        endpointRequired: true,
    },
    ibm: {
        label: 'IBM Cloud Object Storage',
        defaultRegion: null,
        forcePathStyle: false,
        endpointRequired: true,
    },
    custom: {
        label: 'Custom S3-compatible',
        defaultRegion: null,
        forcePathStyle: true,
        endpointRequired: true,
    },
}

export class StorageConfigError extends Error {
    constructor(message: string) {
        super(`[storage] ${message}`)
        this.name = 'StorageConfigError'
    }
}

type Env = Record<string, string | undefined>

const LEGACY_KEYS = ['R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_ACCOUNT_ID']

function clean(v: string | undefined): string | undefined {
    const t = v?.trim()
    return t ? t : undefined
}

function parseBool(v: string | undefined): boolean | undefined {
    const t = clean(v)?.toLowerCase()
    if (t === undefined) return undefined
    if (['true', '1', 'yes'].includes(t)) return true
    if (['false', '0', 'no'].includes(t)) return false
    throw new StorageConfigError(`STORAGE_FORCE_PATH_STYLE must be "true" or "false" (got "${v}")`)
}

function isProvider(v: string): v is StorageProvider {
    return (STORAGE_PROVIDERS as readonly string[]).includes(v)
}

/**
 * Resolve storage configuration from environment variables.
 * Pure function — pass a custom env object for testing.
 */
export function resolveStorageConfig(env: Env = process.env): ResolvedStorageConfig {
    const hasLegacy = LEGACY_KEYS.some(k => clean(env[k]) !== undefined)
    const rawProvider = clean(env.STORAGE_PROVIDER)?.toLowerCase()

    let provider: StorageProvider
    if (rawProvider) {
        if (!isProvider(rawProvider)) {
            throw new StorageConfigError(
                `Unknown STORAGE_PROVIDER "${rawProvider}". Expected one of: ${STORAGE_PROVIDERS.join(', ')}`
            )
        }
        provider = rawProvider
    } else if (hasLegacy) {
        provider = 'r2'
    } else {
        throw new StorageConfigError(
            'STORAGE_PROVIDER is not set. Configure STORAGE_PROVIDER and STORAGE_* variables (see .env.example).'
        )
    }

    // Legacy R2_* fallbacks only apply when the provider is r2
    const allowLegacy = provider === 'r2'
    const pick = (key: string, legacyKey?: string): { value: string | undefined; legacy: boolean } => {
        const v = clean(env[key])
        if (v !== undefined) return { value: v, legacy: false }
        if (allowLegacy && legacyKey) {
            const lv = clean(env[legacyKey])
            if (lv !== undefined) return { value: lv, legacy: true }
        }
        return { value: undefined, legacy: false }
    }

    const bucket = pick('STORAGE_BUCKET_NAME', 'R2_BUCKET_NAME')
    const accessKeyId = pick('STORAGE_ACCESS_KEY_ID', 'R2_ACCESS_KEY_ID')
    const secretAccessKey = pick('STORAGE_SECRET_ACCESS_KEY', 'R2_SECRET_ACCESS_KEY')
    const endpointVar = pick('STORAGE_ENDPOINT', 'R2_ENDPOINT')
    const accountId = pick('STORAGE_ACCOUNT_ID', 'R2_ACCOUNT_ID')
    const regionVar = pick('STORAGE_REGION')

    const preset = PROVIDER_PRESETS[provider]
    const missing: string[] = []

    if (!bucket.value) missing.push('STORAGE_BUCKET_NAME')
    if (!accessKeyId.value) missing.push('STORAGE_ACCESS_KEY_ID')
    if (!secretAccessKey.value) missing.push('STORAGE_SECRET_ACCESS_KEY')

    const region = regionVar.value ?? preset.defaultRegion
    if (!region) missing.push('STORAGE_REGION')

    let endpoint = endpointVar.value
    if (!endpoint && preset.endpointRequired) missing.push('STORAGE_ENDPOINT')
    if (!endpoint && !preset.endpointRequired && region) {
        endpoint = preset.buildEndpoint?.({ region, accountId: accountId.value })
    }
    if (provider === 'r2' && !endpoint) missing.push('STORAGE_ENDPOINT or STORAGE_ACCOUNT_ID')

    if (missing.length > 0) {
        throw new StorageConfigError(
            `Missing required configuration for provider "${provider}" (${preset.label}): ${missing.join(', ')}`
        )
    }

    const forcePathStyle = parseBool(env.STORAGE_FORCE_PATH_STYLE) ?? preset.forcePathStyle

    const usingLegacyEnv = [bucket, accessKeyId, secretAccessKey, endpointVar, accountId].some(p => p.legacy)

    return {
        provider,
        endpoint,
        region: region!,
        bucket: bucket.value!,
        accessKeyId: accessKeyId.value!,
        secretAccessKey: secretAccessKey.value!,
        forcePathStyle,
        usingLegacyEnv,
    }
}
