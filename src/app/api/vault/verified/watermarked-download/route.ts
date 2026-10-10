import { NextRequest, NextResponse } from 'next/server'
import { getObjectBytes } from '@/lib/storage'
import { checkVerifiedDownload } from '@/lib/verified-download'
import { watermarkPdf } from '@/lib/pdf-watermark'
import { getAdminClient } from '@/db'
import { createHash } from 'crypto'
import { z } from 'zod'

const querySchema = z.object({
    workspace_id: z.string().uuid(),
    object_id: z.string().uuid(),
    download_token: z.string().min(1),
    email: z.string().email(),
    ip: z.string(),
    session_id: z.string().optional(),
})

/**
 * GET /api/vault/verified/watermarked-download
 *
 * Called by the verified download page when watermark=true and the file is a PDF.
 * Re-checks all download rules, then fetches the PDF from storage, stamps a watermark
 * banner (email, timestamp, IP, filename, folder, session ID) on page 1, computes
 * a SHA-256 checksum of the watermarked PDF, logs everything, and streams the
 * modified bytes to the client.
 */
export async function GET(req: NextRequest) {
    try {
        const params = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams))
        const { workspace_id, object_id, download_token, email, ip, session_id } = params

        // Re-enforce all download rules (idempotent — prevents TOCTOU issues)
        const result = await checkVerifiedDownload(object_id, workspace_id, email, ip)

        if (!result.allowed) {
            return NextResponse.json({ error: result.reason }, { status: 403 })
        }

        if (!result.watermark) {
            // Shouldn't normally reach here, but guard anyway
            return NextResponse.json({ error: 'Watermark not required for this file' }, { status: 400 })
        }

        // Fetch raw PDF bytes from storage
        const pdfBytes = await getObjectBytes(result.storageKey)

        if (!pdfBytes) {
            return NextResponse.json({ error: 'File body missing from storage' }, { status: 502 })
        }

        // SHA-256 of the original (pre-watermark) file — this is the canonical file identity checksum
        const originalChecksumHex = createHash('sha256').update(pdfBytes).digest('hex')

        // Build watermark fields for the cover page
        const now = new Date()
        const timestamp = now.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC')
        const sessionLabel = session_id ?? download_token

        const watermarked = await watermarkPdf(pdfBytes, {
            workspaceName: req.nextUrl.searchParams.get('workspace_name') ?? '—',
            workspaceId: workspace_id,
            filename: result.filename,
            folderPath: result.folderPath,
            email,
            timestamp,
            ip,
            sessionId: sessionLabel,
            fileChecksum: originalChecksumHex,
        })

        // SHA-256 of the watermarked PDF (stored in log for tamper-evidence)
        const checksumHex = createHash('sha256').update(watermarked).digest('hex')

        // Log the allowed (watermarked) download
        const db = getAdminClient()
        await db.from('verified_download_log').insert({
            workspace_id,
            object_id,
            download_token,
            downloader_email: email,
            downloader_ip: ip,
            result: 'allowed',
            filename: result.filename,
            folder_path: result.folderPath,
            session_id: session_id ?? null,
            watermarked_checksum: checksumHex,
            file_checksum: originalChecksumHex,
        })

        // Build a safe Content-Disposition filename
        const safeName = result.filename.replace(/[^\w.\-]/g, '_')

        // Wrap in ReadableStream — unambiguously a valid BodyInit in all TypeScript targets
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(watermarked)
                controller.close()
            },
        })

        return new NextResponse(stream, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${safeName}"`,
                'Content-Length': watermarked.byteLength.toString(),
                'Cache-Control': 'no-store',
                'X-Watermark-Checksum': checksumHex,
            },
        })
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json({ error: err.issues }, { status: 400 })
        }
        console.error('[verified/watermarked-download]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
