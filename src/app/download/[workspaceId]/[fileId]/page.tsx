import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { randomUUID } from 'crypto'
import { getAdminClient } from '@/db'
import { checkVerifiedDownload, generateVerifiedDownloadUrl } from '@/lib/verified-download'
import { getAuth0 } from '@/lib/auth0-client'

const REASON_MESSAGES: Record<string, { title: string; body: string }> = {
    revoked: { title: 'Access Revoked', body: 'The owner has revoked access to this file.' },
    expired: { title: 'Link Expired', body: 'This download link has expired. Please request a new one.' },
    max_downloads: { title: 'Download Limit Reached', body: 'This file has reached its maximum number of downloads.' },
    email: { title: 'Access Restricted', body: 'Your email address is not on the allowed list for this file.' },
    ip: { title: 'Access Restricted', body: 'Your IP address is not authorised to download this file.' },
    no_rules: { title: 'Not Available', body: 'This file has no active distribution settings.' },
    not_found: { title: 'File Not Found', body: 'This file does not exist or has been deleted.' },
}

function DeniedPage({ reason }: { reason: string }) {
    const msg = REASON_MESSAGES[reason] ?? { title: 'Access Denied', body: 'You are not authorised to download this file.' }
    return (
        <html lang="en">
            <head>
                <title>{msg.title} — TeamVault</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <style>{`
                    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: system-ui, -apple-system, sans-serif; background: #0f1117; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem; }
                    .card { background: #1a1f2e; border: 1px solid #2d3448; border-radius: 12px; padding: 2.5rem; max-width: 420px; width: 100%; text-align: center; }
                    .icon { font-size: 3rem; margin-bottom: 1rem; }
                    h1 { font-size: 1.375rem; font-weight: 700; margin-bottom: 0.625rem; color: #f8fafc; }
                    p { font-size: 0.9375rem; color: #94a3b8; line-height: 1.6; }
                    .brand { margin-top: 2rem; font-size: 0.75rem; color: #475569; letter-spacing: 0.05em; text-transform: uppercase; }
                `}</style>
            </head>
            <body>
                <div className="card">
                    <div className="icon">🔒</div>
                    <h1>{msg.title}</h1>
                    <p>{msg.body}</p>
                    <p className="brand">TeamVault · Verified Downloads</p>
                </div>
            </body>
        </html>
    )
}

export default async function VerifiedDownloadPage({
    params,
    searchParams,
}: {
    params: Promise<{ workspaceId: string; fileId: string }>
    searchParams: Promise<{ downloadToken?: string }>
}) {
    const { workspaceId, fileId } = await params
    const { downloadToken = '' } = await searchParams

    // A token must be present
    if (!downloadToken) return <DeniedPage reason="not_found" />

    // Require Auth0 authentication
    const session = await getAuth0().getSession()
    if (!session?.user?.email) {
        const callbackUrl = encodeURIComponent(`/download/${workspaceId}/${fileId}?downloadToken=${downloadToken}`)
        redirect(`/auth/login?returnTo=${callbackUrl}`)
    }

    const downloaderEmail = session.user.email as string

    // Resolve the real client IP from Vercel / Next.js forwarded headers
    const reqHeaders = await headers()
    const downloaderIp =
        reqHeaders.get('x-forwarded-for')?.split(',')[0].trim() ??
        reqHeaders.get('x-real-ip') ??
        'unknown'

    const result = await checkVerifiedDownload(fileId, workspaceId, downloaderEmail, downloaderIp)

    // Unique session ID for this download attempt — shared with the watermark & log
    const sessionId = randomUUID()

    // Determine whether this will be served by the watermark route.
    // If so, SKIP logging here — the watermark route logs the single definitive row
    // (including file_checksum and watermarked_checksum). Logging here too would create
    // a duplicate row that is missing those fields.
    const isPdf =
        result.allowed &&
        (result.mimeType === 'application/pdf' || result.filename.toLowerCase().endsWith('.pdf'))
    const willWatermark = result.allowed && result.watermark && isPdf

    const db = getAdminClient()
    if (!willWatermark) {
        // Log denied attempts and non-watermarked allowed downloads
        await db.from('verified_download_log').insert({
            workspace_id: workspaceId,
            object_id: fileId,
            download_token: downloadToken,
            downloader_email: downloaderEmail,
            downloader_ip: downloaderIp,
            result: result.allowed ? 'allowed' : result.reason,
            filename: result.allowed ? result.filename : undefined,
            folder_path: result.allowed ? result.folderPath : undefined,
            session_id: sessionId,
        })
    }

    if (!result.allowed) {
        return <DeniedPage reason={result.reason} />
    }

    if (willWatermark) {
        const watermarkUrl = new URL('/api/vault/verified/watermarked-download', 'http://localhost')
        watermarkUrl.searchParams.set('workspace_id', workspaceId)
        watermarkUrl.searchParams.set('object_id', fileId)
        watermarkUrl.searchParams.set('download_token', downloadToken)
        watermarkUrl.searchParams.set('email', downloaderEmail)
        watermarkUrl.searchParams.set('ip', downloaderIp)
        watermarkUrl.searchParams.set('session_id', sessionId)
        watermarkUrl.searchParams.set('workspace_name', result.workspaceName)
        redirect(`/api/vault/verified/watermarked-download?${watermarkUrl.searchParams.toString()}`)
    }

    // Non-watermarked (or non-PDF) — direct presigned redirect as before
    const downloadUrl = await generateVerifiedDownloadUrl(result.storageKey, result.filename, result.mimeType)
    redirect(downloadUrl)
}

