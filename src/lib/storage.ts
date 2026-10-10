import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { resolveStorageConfig, type ResolvedStorageConfig } from '@/lib/storage-config'

/**
 * S3-compatible object storage client.
 *
 * Provider (Cloudflare R2, AWS S3, GCS, Wasabi, Backblaze B2, DigitalOcean
 * Spaces, MinIO, Ceph, IBM COS, or any custom S3 endpoint) is selected via
 * STORAGE_PROVIDER — see src/lib/storage-config.ts.
 *
 * The client is created lazily so `next build` does not require storage env vars.
 */

let cached: { client: S3Client; config: ResolvedStorageConfig } | null = null

function getStorage(): { client: S3Client; config: ResolvedStorageConfig } {
    if (cached) return cached

    const config = resolveStorageConfig()
    if (config.usingLegacyEnv) {
        console.warn(
            '[storage] Using legacy R2_* environment variables. ' +
            'Rename them to STORAGE_* (see .env.example); legacy names remain supported.'
        )
    }

    const client = new S3Client({
        region: config.region,
        endpoint: config.endpoint,
        credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
        },
        forcePathStyle: config.forcePathStyle,
        // Recent SDK versions add CRC32 checksums by default; many S3-compatible
        // providers reject them. Only send checksums when an operation requires it.
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_SUPPORTED',
    })

    cached = { client, config }
    return cached
}

/** The underlying S3 client (for advanced, server-only use). */
export function getStorageClient(): S3Client {
    return getStorage().client
}

/** The configured bucket name — stored on vault_objects.storage_bucket. */
export function getBucketName(): string {
    return getStorage().config.bucket
}

/** The configured provider identifier (e.g. "r2", "s3", "minio"). */
export function getStorageProvider(): ResolvedStorageConfig['provider'] {
    return getStorage().config.provider
}

/**
 * Build a structured, unguessable storage key.
 * Format: w/<workspaceId>/o/<objectId>/<random>/<filename>
 */
export function buildStorageKey(workspaceId: string, objectId: string, filename: string): string {
    const random = Math.random().toString(36).slice(2, 10)
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    return `w/${workspaceId}/o/${objectId}/${random}/${safe}`
}

/**
 * Generate a presigned PUT URL for uploading a file.
 * TTL: 900 seconds (15 min)
 */
export async function generateUploadUrl(
    key: string,
    mimeType: string,
    sizeBytes: number
): Promise<string> {
    const { client, config } = getStorage()
    const command = new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        // We omit ContentType and ContentLength during signing.
        // This allows the browser to send them natively without breaking the signature.
        ChecksumAlgorithm: undefined,
    })

    return getSignedUrl(client, command, {
        expiresIn: 900,
        signableHeaders: new Set(['host']),
    })
}

/**
 * Generate a presigned GET URL for downloading a file.
 * TTL: 120 seconds (2 min)
 */
export async function generateDownloadUrl(
    key: string,
    filename?: string,
    isAttachment: boolean = true,
    mimeType?: string | null
): Promise<string> {
    const { client, config } = getStorage()

    let finalMime = mimeType
    if (filename) {
        const lower = filename.toLowerCase()
        if (lower.endsWith('.pdf')) finalMime = 'application/pdf'
        else if (lower.endsWith('.epub')) finalMime = 'application/epub+zip'
        else if (lower.endsWith('.png')) finalMime = 'image/png'
        else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) finalMime = 'image/jpeg'
        else if (lower.endsWith('.svg')) finalMime = 'image/svg+xml'
    }

    const safeFilename = filename ? encodeURIComponent(filename).replace(/['()]/g, escape) : 'file'
    const fallbackFilename = filename ? filename.replace(/[^\x20-\x7E]/g, '').replace(/"/g, '\\"') : 'file'

    // Firefox has known parsing issues with inline dispositions containing filename* or spaces.
    // We use a strictly sanitized filename (only A-Z, 0-9, ., -) for inline viewing.
    const verySafeInlineFilename = filename ? filename.replace(/[^a-zA-Z0-9.-]/g, '_') : 'file'

    const disposition = isAttachment
        ? `attachment; filename="${fallbackFilename}"; filename*=UTF-8''${safeFilename}`
        : `inline; filename="${verySafeInlineFilename}"`

    const command = new GetObjectCommand({
        Bucket: config.bucket,
        Key: key,
        ResponseContentDisposition: disposition,
        ...(finalMime ? { ResponseContentType: finalMime } : {}),
    })
    return getSignedUrl(client, command, { expiresIn: 120 })
}

/**
 * Check if an object exists in storage (HEAD request).
 * Returns true if found, false if not.
 */
export async function headObject(key: string): Promise<boolean> {
    const { client, config } = getStorage()
    try {
        await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }))
        return true
    } catch {
        return false
    }
}

/**
 * Read an object's full contents into memory (server-side only).
 * Returns null if the object has no body.
 */
export async function getObjectBytes(key: string): Promise<Uint8Array | null> {
    const { client, config } = getStorage()
    const res = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }))
    if (!res.Body) return null
    return res.Body.transformToByteArray()
}

/**
 * Permanently delete an object from storage.
 */
export async function deleteObject(key: string): Promise<void> {
    const { client, config } = getStorage()
    await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }))
}
