/**
 * Storage connectivity check for the configured S3-compatible provider.
 *
 * Performs: PUT → HEAD → presigned GET (fetch) → DELETE, and optionally lists buckets.
 * Run with: npx -y tsx scripts/check-storage.ts [--list-buckets]
 */
import 'dotenv/config'
import { config as loadEnv } from 'dotenv'
import {
    S3Client,
    PutObjectCommand,
    HeadObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    ListBucketsCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { resolveStorageConfig, PROVIDER_PRESETS } from '../src/lib/storage-config'

loadEnv({ path: '.env.local', override: true })

async function main() {
    const cfg = resolveStorageConfig()
    console.log(`Provider:       ${PROVIDER_PRESETS[cfg.provider].label} (${cfg.provider})`)
    console.log(`Endpoint:       ${cfg.endpoint ?? '(SDK default)'}`)
    console.log(`Region:         ${cfg.region}`)
    console.log(`Bucket:         ${cfg.bucket}`)
    console.log(`Path style:     ${cfg.forcePathStyle}`)
    if (cfg.usingLegacyEnv) console.log('⚠  Using legacy R2_* variables — consider renaming to STORAGE_*')
    console.log()

    const client = new S3Client({
        region: cfg.region,
        endpoint: cfg.endpoint,
        credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
        forcePathStyle: cfg.forcePathStyle,
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_SUPPORTED',
    })

    if (process.argv.includes('--list-buckets')) {
        try {
            const res = await client.send(new ListBucketsCommand({}))
            console.log('Buckets:')
            for (const b of res.Buckets ?? []) console.log(`  - ${b.Name}  (created: ${b.CreationDate})`)
            console.log()
        } catch (err) {
            console.warn('⚠  ListBuckets failed (often not permitted for bucket-scoped keys):', (err as Error).message)
        }
    }

    const key = `_teamvault_conntest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const body = 'teamvault-storage-check'

    const step = async (name: string, fn: () => Promise<void>) => {
        try {
            await fn()
            console.log(`✅ ${name}`)
        } catch (err) {
            console.error(`❌ ${name}: ${(err as Error).message}`)
            throw err
        }
    }

    try {
        await step('PUT object', async () => {
            await client.send(new PutObjectCommand({ Bucket: cfg.bucket, Key: key, Body: body }))
        })
        await step('HEAD object', async () => {
            await client.send(new HeadObjectCommand({ Bucket: cfg.bucket, Key: key }))
        })
        await step('Presigned GET with Content-Disposition override', async () => {
            const url = await getSignedUrl(
                client,
                new GetObjectCommand({
                    Bucket: cfg.bucket,
                    Key: key,
                    ResponseContentDisposition: 'attachment; filename="check.txt"',
                }),
                { expiresIn: 60 }
            )
            const res = await fetch(url)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const text = await res.text()
            if (text !== body) throw new Error('Body mismatch')
            const cd = res.headers.get('content-disposition')
            if (!cd?.includes('check.txt')) {
                console.warn('   ⚠  Provider ignored response-content-disposition; downloads will use the storage key as filename')
            }
        })
    } finally {
        await step('DELETE object', async () => {
            await client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }))
        }).catch(() => { process.exitCode = 1 })
    }

    console.log('\nStorage check complete.')
}

main().catch(() => { process.exitCode = 1 })
