/**
 * Generates TeamVault_R2_Presigned_URL_Walkthrough.pdf using pdf-lib.
 * Run with: node scripts/generate-r2-walkthrough.mjs
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT = resolve(__dirname, '../TeamVault_R2_Presigned_URL_Walkthrough.pdf')

// Colours
const BLACK  = rgb(0.08, 0.08, 0.08)
const GREY   = rgb(0.35, 0.35, 0.35)
const LIGHT  = rgb(0.55, 0.55, 0.55)
const ACCENT = rgb(0.18, 0.38, 0.78)
const CODEFG = rgb(0.12, 0.12, 0.12)
const CODEBG = rgb(0.95, 0.96, 0.98)
const HEADBG = rgb(0.18, 0.38, 0.78)
const HEADFG = rgb(1, 1, 1)
const ROWALT = rgb(0.96, 0.97, 1.0)
const BORDER = rgb(0.82, 0.84, 0.90)
const WARNBG = rgb(1.0, 0.97, 0.89)
const WARNBR = rgb(0.85, 0.65, 0.20)
const INFOBG = rgb(0.92, 0.96, 1.0)
const INFOBR = rgb(0.50, 0.72, 0.95)

const PAGE_W = 595
const PAGE_H = 842
const ML = 52
const MR = 52
const MT = 52
const MB = 52
const CONTENT_W = PAGE_W - ML - MR

let pdfDoc, pages, currentPage, y, fonts

function newPage() {
    currentPage = pdfDoc.addPage([PAGE_W, PAGE_H])
    pages.push(currentPage)
    y = PAGE_H - MT
    return currentPage
}

function ensureSpace(needed) {
    if (y - needed < MB + 20) newPage()
}

const REPLACEMENTS = {
    '\u2014': '--', '\u2013': '-', '\u2018': "'", '\u2019': "'",
    '\u201C': '"',  '\u201D': '"', '\u2022': '*', '\u2190': '<--',
    '\u2192': '-->', '\u2194': '<->', '\u25B6': '>', '\u2713': 'v',
    '\u00E9': 'e',  '\u00F3': 'o', '\u2264': '<=', '\u2265': '>=',
}
function sanitise(text) {
    let out = text
    for (const [from, to] of Object.entries(REPLACEMENTS)) out = out.replaceAll(from, to)
    return out.replace(/[^\x00-\xFF]/g, '?')
}

function drawText(text, { x = ML, size = 10, font, color = BLACK } = {}) {
    text = sanitise(text)
    currentPage.drawText(text, { x, y, size, font: font || fonts.regular, color })
}

function wrapText(text, font, size, maxWidth) {
    const words = text.split(' ')
    const lines = []
    let line = ''
    for (const word of words) {
        const test = line ? line + ' ' + word : word
        if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
            lines.push(line)
            line = word
        } else {
            line = test
        }
    }
    if (line) lines.push(line)
    return lines
}

function paragraph(text, { size = 10, font, color = BLACK, indent = 0, lineGap = 5 } = {}) {
    const f = font || fonts.regular
    const lines = wrapText(text, f, size, CONTENT_W - indent)
    const lineH = size + lineGap
    ensureSpace(lines.length * lineH + 4)
    for (const line of lines) {
        drawText(line, { x: ML + indent, size, font: f, color })
        y -= lineH
    }
}

function h1(text) {
    ensureSpace(42)
    y -= 14
    currentPage.drawRectangle({ x: ML, y: y - 4, width: CONTENT_W, height: 26, color: HEADBG })
    drawText(text, { size: 15, font: fonts.bold, color: HEADFG, x: ML + 8 })
    y -= 28
}

function h2(text) {
    ensureSpace(30)
    y -= 10
    drawText(text, { size: 12, font: fonts.bold, color: ACCENT })
    y -= 16
    currentPage.drawLine({ start: { x: ML, y }, end: { x: ML + CONTENT_W, y }, thickness: 0.8, color: ACCENT })
    y -= 6
}

function h3(text) {
    ensureSpace(22)
    y -= 6
    drawText(text, { size: 10.5, font: fonts.bold, color: BLACK })
    y -= 15
}

function bullet(text, { indent = 10, size = 9.5, color = BLACK } = {}) {
    const f = fonts.regular
    const lineH = size + 4.5
    const textW = CONTENT_W - indent - 12
    const lines = wrapText(text, f, size, textW)
    ensureSpace(lines.length * lineH + 2)
    drawText('*', { x: ML + indent, size, font: f, color: ACCENT })
    for (const line of lines) {
        drawText(line, { x: ML + indent + 12, size, font: f, color })
        y -= lineH
    }
}

function numberedItem(n, text, { indent = 10, size = 9.5 } = {}) {
    const f = fonts.regular
    const lineH = size + 4.5
    const label = `${n}.`
    const textW = CONTENT_W - indent - 20
    const lines = wrapText(text, f, size, textW)
    ensureSpace(lines.length * lineH + 2)
    drawText(label, { x: ML + indent, size, font: fonts.bold, color: ACCENT })
    for (const line of lines) {
        drawText(line, { x: ML + indent + 20, size, font: f, color: BLACK })
        y -= lineH
    }
}

function codeBlock(lines) {
    const size = 8
    const lineH = size + 4
    const pad = 8
    const blockH = lines.length * lineH + pad * 2
    ensureSpace(blockH + 10)
    y -= 4
    currentPage.drawRectangle({ x: ML, y: y - blockH + pad, width: CONTENT_W, height: blockH, color: CODEBG, borderColor: BORDER, borderWidth: 0.5 })
    y -= pad
    for (const line of lines) {
        drawText(line.replace(/\t/g, '    '), { x: ML + pad, size, font: fonts.mono, color: CODEFG })
        y -= lineH
    }
    y -= pad + 4
}

function callout(text, { bg = INFOBG, border = INFOBR, label = 'NOTE' } = {}) {
    const f = fonts.regular
    const size = 9
    const lineH = size + 4
    const pad = 8
    const textW = CONTENT_W - pad * 2 - 4
    const lines = wrapText(text, f, size, textW)
    const blockH = lines.length * lineH + pad * 2
    ensureSpace(blockH + 10)
    y -= 4
    currentPage.drawRectangle({ x: ML, y: y - blockH + pad, width: CONTENT_W, height: blockH, color: bg, borderColor: border, borderWidth: 1 })
    currentPage.drawRectangle({ x: ML, y: y - blockH + pad, width: 4, height: blockH, color: border })
    y -= pad
    drawText(label + ': ' + lines[0], { x: ML + pad + 6, size, font: fonts.bold, color: CODEFG })
    y -= lineH
    for (let i = 1; i < lines.length; i++) {
        drawText(lines[i], { x: ML + pad + 6, size, font: f, color: CODEFG })
        y -= lineH
    }
    y -= pad + 4
}

function table(headers, rows, colWidths) {
    const totalW = colWidths ? colWidths.reduce((a, b) => a + b, 0) : CONTENT_W
    const scale = CONTENT_W / totalW
    const scaledWidths = colWidths ? colWidths.map(w => w * scale) : headers.map(() => CONTENT_W / headers.length)
    const rowH = 18
    const pad = 5
    const size = 8.5
    ensureSpace((rows.length + 1) * rowH + 8)
    y -= 4

    let xOff = ML
    for (let c = 0; c < headers.length; c++) {
        currentPage.drawRectangle({ x: xOff, y: y - rowH + 4, width: scaledWidths[c], height: rowH, color: HEADBG })
        drawText(headers[c], { x: xOff + pad, size, font: fonts.bold, color: HEADFG })
        xOff += scaledWidths[c]
    }
    y -= rowH

    for (let r = 0; r < rows.length; r++) {
        const bg = r % 2 === 0 ? rgb(1,1,1) : ROWALT
        xOff = ML
        for (let c = 0; c < rows[r].length; c++) {
            currentPage.drawRectangle({ x: xOff, y: y - rowH + 4, width: scaledWidths[c], height: rowH, color: bg, borderColor: BORDER, borderWidth: 0.3 })
            drawText(rows[r][c], { x: xOff + pad, size, font: fonts.regular, color: BLACK })
            xOff += scaledWidths[c]
        }
        y -= rowH
    }
    y -= 8
}

function space(n = 8) { y -= n }

function pageNumber() {
    for (let i = 0; i < pages.length; i++) {
        const pg = pages[i]
        const text = `Page ${i + 1} of ${pages.length}`
        const w = fonts.regular.widthOfTextAtSize(text, 8)
        pg.drawText(text, { x: PAGE_W - MR - w, y: MB - 16, size: 8, font: fonts.regular, color: LIGHT })
        pg.drawText('TeamVault -- Internal Technical Reference', { x: ML, y: MB - 16, size: 8, font: fonts.regular, color: LIGHT })
        pg.drawLine({ start: { x: ML, y: MB - 4 }, end: { x: PAGE_W - MR, y: MB - 4 }, thickness: 0.5, color: BORDER })
    }
}

// ── Build document ─────────────────────────────────────────────────────────
async function main() {
    pdfDoc = await PDFDocument.create()
    pages = []

    pdfDoc.setTitle('TeamVault R2 Presigned URL Walkthrough')
    pdfDoc.setAuthor('TeamVault')
    pdfDoc.setSubject('R2 Presigned URL Access Control')
    pdfDoc.setCreator('TeamVault Document Generator')

    fonts = {
        regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
        bold:    await pdfDoc.embedFont(StandardFonts.HelveticaBold),
        italic:  await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
        mono:    await pdfDoc.embedFont(StandardFonts.Courier),
    }

    // ── Cover ──────────────────────────────────────────────────────────────
    newPage()
    currentPage.drawRectangle({ x: 0, y: PAGE_H - 180, width: PAGE_W, height: 180, color: HEADBG })
    y = PAGE_H - 60
    drawText('TeamVault', { x: ML, size: 28, font: fonts.bold, color: HEADFG })
    y -= 36
    drawText('R2 Presigned URL Access Control', { x: ML, size: 20, font: fonts.bold, color: HEADFG })
    y -= 26
    drawText('A technical walkthrough of token creation, lifetimes, and enforcement', { x: ML, size: 11, font: fonts.regular, color: rgb(0.8, 0.88, 1.0) })

    y = PAGE_H - 220
    paragraph('This document explains how TeamVault creates short-lived, cryptographically signed access tokens for Cloudflare R2 storage. It covers what a presigned URL is, how it is created, what security properties it carries, and how the full upload and download lifecycle works -- including the server-side permission checks that gate every token.', { size: 10.5, color: GREY })
    space(10)
    paragraph('Date: April 2026', { size: 9, color: LIGHT })

    // ── Section 1 ──────────────────────────────────────────────────────────
    newPage()
    h1('1. What is a Presigned URL?')
    paragraph('A presigned URL is a time-limited, self-contained HTTP URL that grants temporary access to a specific object in cloud storage -- without requiring the recipient to have their own storage credentials. The access rights are baked into the URL itself using a cryptographic signature.')
    space(6)
    paragraph('In TeamVault, presigned URLs are the only way a browser ever reads or writes files. The TeamVault web server acts purely as an authority that decides whether to issue a token -- it never proxies the file bytes. This keeps bandwidth costs at zero and latency to a minimum.')
    space(8)

    h2('1.1 How the Signature Works')
    paragraph('Cloudflare R2 is S3-compatible. Presigned URLs use the AWS Signature Version 4 (SigV4) algorithm:')
    space(4)
    numberedItem(1, 'A canonical request string is assembled -- HTTP method, URL path, query parameters, and selected headers.')
    numberedItem(2, 'The canonical request is hashed with SHA-256.')
    numberedItem(3, 'That hash is signed using HMAC-SHA256 with a key derived from the R2 Secret Access Key plus a date-scoped signing key.')
    numberedItem(4, 'The resulting signature, access key ID, expiry, and scope are appended as query parameters.')
    space(6)
    codeBlock([
        'Example presigned GET URL (truncated):',
        '',
        'https://<account>.r2.cloudflarestorage.com/<bucket>/w/<wsId>/o/<objId>/<rand>/report.pdf',
        '  ?X-Amz-Algorithm=AWS4-HMAC-SHA256',
        '  &X-Amz-Credential=<accessKeyId>%2F20260409%2Fauto%2Fs3%2Faws4_request',
        '  &X-Amz-Date=20260409T120000Z',
        '  &X-Amz-Expires=120',
        '  &X-Amz-SignedHeaders=host',
        '  &X-Amz-Signature=<64-hex-chars>',
    ])
    space(4)
    paragraph('R2 verifies the signature on every request. If even one character of the URL has been altered, or if the clock has passed the expiry time, R2 returns 403 Forbidden. No session cookie, no API key, no TeamVault involvement -- R2 does the enforcement itself.')

    callout('The R2 Secret Access Key never leaves the TeamVault server. It is stored in an environment variable (R2_SECRET_ACCESS_KEY). The presigned URL contains only a signature derived from it -- the key itself cannot be recovered from the URL.', { label: 'SECURITY' })

    // ── Section 2 ──────────────────────────────────────────────────────────
    h1('2. The R2 Client Setup')
    paragraph('A single S3Client instance is created once per server process in src/lib/r2.ts. It holds the long-lived R2 service account credentials and is used exclusively on the server to sign URLs -- it never runs in the browser.')
    space(4)
    codeBlock([
        '// src/lib/r2.ts',
        '',
        'const r2Client = new S3Client({',
        "    region: 'auto',",
        '    endpoint: process.env.R2_ENDPOINT,      // https://<accountId>.r2.cloudflarestorage.com',
        '    credentials: {',
        '        accessKeyId:     process.env.R2_ACCESS_KEY_ID,',
        '        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,',
        '    },',
        '    forcePathStyle: true,   // Required for R2 account-level endpoints',
        '})',
    ])
    space(4)
    paragraph('forcePathStyle: true is required because R2 uses path-style URLs (account.r2.cloudflarestorage.com/bucket/key) rather than the virtual-hosted style that AWS S3 uses (bucket.s3.amazonaws.com/key). Without this flag, the AWS SDK would construct the wrong URL and the signature would not match.')

    // ── Section 3 ──────────────────────────────────────────────────────────
    h1('3. The R2 Key Structure')
    paragraph('Every file stored in R2 has a structured key that provides workspace isolation and makes paths unguessable:')
    space(4)
    codeBlock([
        'Format:  w/<workspaceId>/o/<objectId>/<random>/<filename>',
        '',
        'Example: w/a1b2c3.../o/f4e5d6.../x7y8z9/quarterly-report.pdf',
    ])
    space(6)

    table(
        ['Segment', 'Value', 'Purpose'],
        [
            ['w/<workspaceId>', 'UUID of workspace', 'Namespace isolation between tenants'],
            ['o/<objectId>',    'UUID of vault_objects row', 'Ties R2 object to database record'],
            ['<random>',        '8 random alphanumeric chars', 'Makes path unguessable even if IDs are known'],
            ['<filename>',      'Sanitised original filename', 'Preserves filename for download headers'],
        ],
        [120, 160, 210]
    )

    callout('The random segment means that even if an attacker knows the workspace ID and object ID, they cannot construct the R2 key by guessing. A correct presigned URL requires knowing the full key, which is only held in the database column vault_objects.r2_key.', { label: 'SECURITY' })

    // ── Section 4 ──────────────────────────────────────────────────────────
    newPage()
    h1('4. Upload Token -- Create and Use')

    h2('4.1 Token Creation (15-minute TTL)')
    paragraph('When a user selects a file to upload, the browser calls the create-upload API endpoint. After all permission checks pass, the server calls generateUploadUrl():')
    space(4)
    codeBlock([
        '// src/lib/r2.ts',
        '',
        'export async function generateUploadUrl(key, mimeType, sizeBytes): Promise<string> {',
        '    const command = new PutObjectCommand({',
        '        Bucket: BUCKET,',
        '        Key: key,',
        '    })',
        '    return getSignedUrl(r2Client, command, {',
        '        expiresIn: 900,                      // 15 minutes',
        '        signableHeaders: new Set(["host"])',
        '    })',
        '}',
    ])
    space(4)
    paragraph('The resulting URL authorises exactly one thing: a single HTTP PUT to that specific key in that specific bucket. It cannot be used to GET, DELETE, or access any other path. It expires after 900 seconds regardless of whether it was used.')

    h2('4.2 Server Permission Checks Before Issuing')
    paragraph('The token is only generated after the following chain of checks in src/app/api/vault/file/create-upload/route.ts:')
    space(4)
    numberedItem(1, 'requireSession() -- validates the Auth0 session cookie. Unauthenticated requests are rejected with 401.')
    numberedItem(2, 'requireMembership(userId, workspaceId) -- confirms the user has an active membership in this workspace. Invited-but-not-yet-active and disabled users are rejected with 403.')
    numberedItem(3, 'Upload permission check -- membership.can_upload must be true (or user must be admin). Upload-disabled members are rejected with 403.')
    numberedItem(4, 'requireSameWorkspace(parentFolderId) -- confirms the target folder belongs to this workspace. Cross-workspace writes are rejected with 403.')
    numberedItem(5, 'requireFolderAccess() -- checks folder-level ACLs. If explicit access rules exist and the user is not in any matching group, rejected with 403.')
    numberedItem(6, 'Storage quota check -- workspace storage_used_bytes + upload size must not exceed plan limit. Rejected with 402 if exceeded.')
    space(4)
    callout('Only after all six checks pass does the server create the vault_objects row and call generateUploadUrl(). The presigned URL is never generated speculatively.', { label: 'NOTE' })

    h2('4.3 Upload Flow (Browser to R2 Direct)')
    space(4)
    codeBlock([
        'Browser                         TeamVault Server              Cloudflare R2',
        '  |                                    |                            |',
        '  |-- POST /api/vault/file/            |                            |',
        '  |   create-upload                    |                            |',
        '  |   { workspace_id, parent_id,       |                            |',
        '  |     filename, size, mime } ------->|                            |',
        '  |                                    |-- Auth + ACL checks        |',
        '  |                                    |-- Create vault_objects row |',
        '  |                                    |-- Sign PUT URL (15 min) -->|',
        '  |<-- { object_id, upload_url } ------|                            |',
        '  |                                    |                            |',
        '  |-- PUT upload_url (file bytes) --------------------------->|    |',
        '  |<-- 200 OK ------------------------------------------------|    |',
        '  |                                    |                            |',
        '  |-- POST /api/vault/file/finalize    |                            |',
        '  |   { object_id, checksum } -------->|                            |',
        '  |                                    |-- HEAD key (verify exists) |',
        '  |                                    |-- Update checksum in DB    |',
        '  |                                    |-- Increment storage quota  |',
        '  |<-- 200 OK { vault_object } --------|                            |',
    ])
    space(4)
    paragraph('The TeamVault server is not in the upload data path. File bytes travel directly from the browser to R2. The finalize step is a mandatory second call that confirms the upload actually completed -- the server HEAD-checks the R2 object and rejects the finalize if nothing is there.')

    // ── Section 5 ──────────────────────────────────────────────────────────
    newPage()
    h1('5. Download Token -- Create and Use')

    h2('5.1 Token Creation (2-minute TTL)')
    paragraph('Download URLs are much shorter-lived than upload URLs. The browser requests one immediately before needing it -- not in advance.')
    space(4)
    codeBlock([
        '// src/lib/r2.ts',
        '',
        'export async function generateDownloadUrl(',
        '    key: string,',
        '    filename?: string,',
        '    isAttachment: boolean = true,',
        '    mimeType?: string | null',
        '): Promise<string> {',
        '    const command = new GetObjectCommand({',
        '        Bucket: BUCKET,',
        '        Key: key,',
        '        ResponseContentDisposition: disposition,  // attachment or inline',
        '        ResponseContentType: finalMime,',
        '    })',
        '    return getSignedUrl(r2Client, command, { expiresIn: 120 })  // 2 minutes',
        '}',
    ])
    space(4)

    table(
        ['Parameter', 'Value', 'Effect'],
        [
            ['expiresIn', '120 seconds', 'URL becomes invalid after 2 minutes'],
            ['isAttachment = true', 'Content-Disposition: attachment', 'Browser saves the file to disk'],
            ['isAttachment = false', 'Content-Disposition: inline', 'Browser renders file in-tab (PDF, image, etc.)'],
            ['ResponseContentType', 'Detected from filename', 'Overrides MIME so browser renders correctly'],
        ],
        [100, 160, 230]
    )

    h2('5.2 Server Permission Checks Before Issuing')
    paragraph('src/app/api/vault/file/download-link/route.ts runs these checks before signing a GET URL:')
    space(4)
    numberedItem(1, 'requireSession() -- validates Auth0 session. Unauthenticated = 401.')
    numberedItem(2, 'Input validation -- workspace_id and object_id are validated as UUIDs via Zod schema.')
    numberedItem(3, 'requireSameWorkspace() -- object must belong to the requested workspace. Prevents cross-tenant URL generation.')
    numberedItem(4, 'Object lookup -- vault_objects row must exist, not be deleted (is_deleted = false), be type = file, and have an r2_key.')
    numberedItem(5, "requireFolderAccess() -- checks ACLs on the file's parent folder. The user must have view access.")
    numberedItem(6, 'Audit event logged -- FILE_DOWNLOADED or FILE_VIEWED written to audit_events with filename, folder path, actor identity, IP hash, and UA hash.')
    space(4)

    h2('5.3 Download Flow (Browser from R2 Direct)')
    space(4)
    codeBlock([
        'Browser                         TeamVault Server              Cloudflare R2',
        '  |                                    |                            |',
        '  |-- POST /api/vault/file/            |                            |',
        '  |   download-link                    |                            |',
        '  |   { workspace_id, object_id,       |                            |',
        '  |     attachment: true } ----------->|                            |',
        '  |                                    |-- Auth + ACL checks        |',
        '  |                                    |-- Log audit event          |',
        '  |                                    |-- Sign GET URL (2 min) --->|',
        '  |<-- { download_url,                 |                            |',
        '  |      expires_in_seconds: 120 } ----|                            |',
        '  |                                    |                            |',
        '  |-- GET download_url ---------------------------------------->|  |',
        '  |<-- file bytes --------------------------------------------|  |',
    ])

    callout('The 2-minute TTL means that even if a download URL were intercepted (e.g. in a proxy log), it would be useless within 120 seconds. There is no way to refresh or extend it -- a new POST to download-link is required each time.', { label: 'SECURITY' })

    // ── Section 6 ──────────────────────────────────────────────────────────
    newPage()
    h1('6. Inline Viewing vs. Download')
    paragraph('The same download-link endpoint serves both cases. The difference is the attachment parameter in the request body:')
    space(6)

    table(
        ['Caller', 'attachment value', 'Audit action logged', 'Browser behaviour'],
        [
            ['File list Download button', 'true', 'FILE_DOWNLOADED', 'Save file dialog'],
            ['FileViewerModal (preview)', 'false', 'FILE_VIEWED', 'Render in modal iframe'],
            ['Desktop sync client', 'true', 'FILE_DOWNLOADED', 'Write to local disk'],
        ],
        [130, 90, 130, 140]
    )
    space(6)

    paragraph('For inline viewing the Content-Disposition is set to inline with a sanitised filename (only A-Z, 0-9, dots, hyphens). This is necessary because Firefox has known parsing bugs with inline dispositions containing spaces or RFC 5987 encoded filenames.')

    h2('6.1 Copy Link (Sharing with Team Members)')
    paragraph('The FileViewerModal also has a "Copy Link" button. This copies a vault URL of the form:')
    space(4)
    codeBlock(['https://app.teamvault.io/vault/<workspaceId>?viewFile=<objectId>'])
    space(4)
    paragraph('This is NOT a presigned R2 URL -- it is a link to the TeamVault application. When the recipient opens it, their browser performs the full Auth0 login + ACL check + download-link flow to get their own presigned URL. If they do not have permission to the folder, they see an access denied message. The audit log records a FILE_LINK_COPIED event at share time, and a separate FILE_VIEWED event when the recipient actually opens it.')

    // ── Section 7 ──────────────────────────────────────────────────────────
    h1('7. What the Signature Protects Against')
    space(4)
    table(
        ['Attack', 'How presigned URLs prevent it'],
        [
            ['Unauthenticated direct R2 access', 'R2 bucket is private. No request succeeds without a valid signature.'],
            ['URL guessing / enumeration', 'The random segment in the key path (e.g. x7y8z9) makes keys unguessable.'],
            ['Replay after expiry', 'R2 rejects any request where the current time exceeds X-Amz-Expires.'],
            ['URL tampering', 'Changing any query parameter or path character invalidates the SigV4 HMAC.'],
            ['Cross-bucket access', 'Bucket name is embedded in the signed scope. Wrong bucket = invalid sig.'],
            ['Method escalation', 'A PUT-signed URL cannot be used for GET and vice versa -- method is in the canonical request.'],
            ['Sharing outside TeamVault auth', 'R2 enforces the URL independently but the URL was only issued after TeamVault ACL checks. The URL is scoped to one file for 2 minutes.'],
        ],
        [175, 315]
    )

    // ── Section 8 ──────────────────────────────────────────────────────────
    h1('8. TTL Comparison and Rationale')
    space(4)
    table(
        ['Token type', 'TTL', 'Rationale'],
        [
            ['Upload URL', '900 s (15 min)', 'Large files can take minutes to upload on slow connections. 15 min gives headroom without leaving a long window for interception.'],
            ['Download URL', '120 s (2 min)', 'Download starts immediately. Short TTL limits exposure if a URL leaks into a log or referrer header.'],
            ['Verified download', '120 s (2 min)', 'Same as download; additionally gated by per-rule expiry, email allowlist, and download count limits.'],
            ['Desktop sync download', '120 s (2 min)', 'Desktop client requests a fresh URL immediately before each file transfer.'],
        ],
        [100, 90, 300]
    )
    space(6)
    callout('No presigned URL is stored in the database. They are generated on demand and used once. If a download is interrupted, the user requests a new one. There is no mechanism to revoke a presigned URL before its TTL -- expiry is the only revocation mechanism.', { label: 'IMPORTANT', bg: WARNBG, border: WARNBR })

    // ── Section 9 ──────────────────────────────────────────────────────────
    newPage()
    h1('9. Verified Downloads -- Extended Access Control')
    paragraph('For files in a Verified Downloads folder, an additional rule layer sits on top of the standard presigned URL flow. Rules are stored in the verified_download_rules table and can restrict access further:')
    space(4)
    bullet('expires_at -- hard cutoff date after which the rule is void regardless of TTL')
    bullet('max_downloads -- integer cap on total allowed downloads for this file')
    bullet('allowed_emails -- PostgreSQL array; only listed email addresses may download')
    bullet('allowed_ips -- PostgreSQL array; only listed CIDR ranges may download')
    bullet('watermark -- if true, a PDF cover page is prepended with downloader identity before the URL is signed')
    bullet('is_revoked -- boolean flag; admin can cut off access instantly')
    space(6)
    paragraph('Every download attempt (allowed or denied) is written to verified_download_log with the downloader email, IP, result, filename, folder path, a unique session ID, and checksums of both the original and watermarked file. The presigned URL for a verified download is still only valid for 120 seconds -- the rules add an application-level gate on top.')

    // ── Section 10 ─────────────────────────────────────────────────────────
    h1('10. Environment Variables Required')
    space(4)
    codeBlock([
        '# Cloudflare R2 credentials (server-side only, never sent to browser)',
        'R2_ACCOUNT_ID=<your cloudflare account id>',
        'R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com',
        'R2_ACCESS_KEY_ID=<r2 api token access key>',
        'R2_SECRET_ACCESS_KEY=<r2 api token secret key>',
        'R2_BUCKET_NAME=<bucket name>',
    ])
    space(6)
    paragraph('The R2 API token should be scoped to Object Read and Write on the single TeamVault bucket only -- not account-wide. This limits blast radius if credentials are ever compromised.')

    callout('CORS must be configured on the R2 bucket to allow browsers to PUT and GET directly. Run: node scripts/set-r2-cors.mjs to apply the correct CORS policy. Without this, browser uploads will fail with a CORS error even though the presigned URL is valid.', { label: 'SETUP', bg: WARNBG, border: WARNBR })

    // ── Section 11 ─────────────────────────────────────────────────────────
    h1('11. Key Files Reference')
    space(4)
    table(
        ['File', 'Role'],
        [
            ['src/lib/r2.ts', 'S3Client setup, buildR2Key, generateUploadUrl, generateDownloadUrl, headObject, deleteR2Object'],
            ['src/app/api/vault/file/create-upload/route.ts', 'Auth + ACL + quota checks, creates vault_objects row, returns upload URL'],
            ['src/app/api/vault/file/finalize/route.ts', 'Verifies upload completed via HEAD, updates checksum, increments storage quota'],
            ['src/app/api/vault/file/download-link/route.ts', 'Auth + ACL checks, logs audit event with folder path, returns download URL'],
            ['src/app/api/vault/file/copy-link/route.ts', 'Logs FILE_LINK_COPIED audit event when user copies a sharing URL'],
            ['src/lib/verified-download.ts', 'Enforces email/IP/expiry/count rules for Verified Downloads folder'],
            ['scripts/set-r2-cors.mjs', 'Configures CORS policy on the R2 bucket for browser direct uploads'],
        ],
        [195, 295]
    )

    pageNumber()

    const bytes = await pdfDoc.save()
    writeFileSync(OUTPUT, bytes)
    console.log(`Written: ${OUTPUT}`)
}

main().catch(err => { console.error(err); process.exit(1) })
