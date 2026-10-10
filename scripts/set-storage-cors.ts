/**
 * Apply the browser-upload CORS policy to the configured storage bucket.
 *
 * Works with any S3-compatible provider selected via STORAGE_PROVIDER.
 * Run with: npx -y tsx scripts/set-storage-cors.ts
 *
 * Optional: STORAGE_CORS_ORIGINS=https://app.example.com,http://localhost:3000
 * (defaults to "*")
 *
 * Note: some providers manage CORS outside the S3 API (e.g. GCS uses
 * `gsutil cors set`, Backblaze B2 uses bucket CORS rules in its console).
 */
import 'dotenv/config'
import { config as loadEnv } from 'dotenv'
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from '@aws-sdk/client-s3'
import { resolveStorageConfig, PROVIDER_PRESETS } from '../src/lib/storage-config'

loadEnv({ path: '.env.local', override: true })

const cfg = resolveStorageConfig()

const client = new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    forcePathStyle: cfg.forcePathStyle,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_SUPPORTED',
})

const origins = (process.env.STORAGE_CORS_ORIGINS ?? '*')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

const corsRules = {
    CORSRules: [
        {
            AllowedOrigins: origins,
            AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
            AllowedHeaders: ['*'],
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3600,
        },
    ],
}

async function main() {
    console.log(`Provider: ${PROVIDER_PRESETS[cfg.provider].label} (${cfg.provider})`)
    console.log('Bucket:  ', cfg.bucket)
    console.log('Rules:   ', JSON.stringify(corsRules, null, 2))

    try {
        await client.send(new PutBucketCorsCommand({ Bucket: cfg.bucket, CORSConfiguration: corsRules }))
        console.log('✅ CORS policy set successfully!')
    } catch (err) {
        console.error('❌ Failed to set CORS:', (err as Error).message)
        process.exitCode = 1
    }

    try {
        const result = await client.send(new GetBucketCorsCommand({ Bucket: cfg.bucket }))
        console.log('\n--- Current CORS Policy ---')
        console.log(JSON.stringify(result.CORSRules, null, 2))
    } catch (err) {
        console.error('❌ Failed to read CORS:', (err as Error).message)
    }
}

main()
