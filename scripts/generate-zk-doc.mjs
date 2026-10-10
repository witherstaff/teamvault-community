/**
 * Generates TeamVault_ZeroKnowledge_Design.pdf using pdf-lib.
 * Run with: node scripts/generate-zk-doc.mjs
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT = resolve(__dirname, '../TeamVault_ZeroKnowledge_Design.pdf')

// ── Colours ────────────────────────────────────────────────────────────────
const BLACK   = rgb(0.08, 0.08, 0.08)
const GREY    = rgb(0.35, 0.35, 0.35)
const LIGHT   = rgb(0.55, 0.55, 0.55)
const ACCENT  = rgb(0.18, 0.38, 0.78)   // blue
const CODEFG  = rgb(0.15, 0.15, 0.15)
const CODEBG  = rgb(0.95, 0.96, 0.98)
const HEADBG  = rgb(0.18, 0.38, 0.78)
const HEADFG  = rgb(1, 1, 1)
const ROWALT  = rgb(0.96, 0.97, 1.0)
const BORDER  = rgb(0.82, 0.84, 0.90)

// ── Page layout ────────────────────────────────────────────────────────────
const PAGE_W = 595          // A4 points
const PAGE_H = 842
const ML = 52               // margin left
const MR = 52               // margin right
const MT = 52               // margin top
const MB = 52               // margin bottom
const CONTENT_W = PAGE_W - ML - MR

// ── Layout state ───────────────────────────────────────────────────────────
let pdfDoc, pages, currentPage, y, fonts

function newPage() {
    currentPage = pdfDoc.addPage([PAGE_W, PAGE_H])
    pages.push(currentPage)
    y = PAGE_H - MT
    return currentPage
}

function ensureSpace(needed) {
    if (y - needed < MB) newPage()
}

// Sanitise to WinAnsi (Latin-1 + common extras) — replace anything outside
// that range with a close ASCII equivalent so pdf-lib never throws.
const REPLACEMENTS = {
    '\u2014': '--', '\u2013': '-', '\u2018': "'", '\u2019': "'",
    '\u201C': '"',  '\u201D': '"', '\u2022': '*', '\u2190': '<--',
    '\u2192': '-->', '\u2194': '<->', '\u25B6': '>','\u2713': 'v',
    '\u00E9': 'e',  '\u00F3': 'o',
}
function sanitise(text) {
    let out = text
    for (const [from, to] of Object.entries(REPLACEMENTS)) out = out.replaceAll(from, to)
    // Drop anything still outside Latin-1
    return out.replace(/[^\x00-\xFF]/g, '?')
}

// ── Text helpers ───────────────────────────────────────────────────────────
function drawText(text, { x = ML, size = 10, font, color = BLACK, maxWidth } = {}) {
    text = sanitise(text)
    const f = font || fonts.regular
    const opts = { x, y, size, font: f, color }
    if (maxWidth) opts.maxWidth = maxWidth
    currentPage.drawText(text, opts)
}

function wrapText(text, font, size, maxWidth) {
    const words = text.split(' ')
    const lines = []
    let line = ''
    for (const word of words) {
        const test = line ? line + ' ' + word : word
        const w = font.widthOfTextAtSize(test, size)
        if (w > maxWidth && line) {
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
    ensureSpace(40)
    y -= 14
    currentPage.drawRectangle({ x: ML, y: y - 4, width: CONTENT_W, height: 26, color: HEADBG, borderWidth: 0 })
    drawText(text, { size: 15, font: fonts.bold, color: HEADFG, x: ML + 8 })
    y -= 28
}

function h2(text) {
    ensureSpace(28)
    y -= 10
    drawText(text, { size: 12, font: fonts.bold, color: ACCENT })
    y -= 16
    currentPage.drawLine({ start: { x: ML, y }, end: { x: ML + CONTENT_W, y }, thickness: 0.8, color: ACCENT })
    y -= 5
}

function h3(text) {
    ensureSpace(20)
    y -= 6
    drawText(text, { size: 10.5, font: fonts.bold, color: BLACK })
    y -= 15
}

function bullet(text, { indent = 10, size = 9.5 } = {}) {
    const f = fonts.regular
    const lineH = size + 4.5
    const textW = CONTENT_W - indent - 12
    const lines = wrapText(text, f, size, textW)
    ensureSpace(lines.length * lineH + 2)
    drawText('•', { x: ML + indent, size, font: f, color: ACCENT })
    for (let i = 0; i < lines.length; i++) {
        drawText(lines[i], { x: ML + indent + 12, size, font: f, color: BLACK })
        y -= lineH
    }
}

function codeBlock(lines) {
    const size = 8
    const lineH = size + 4
    const pad = 8
    const blockH = lines.length * lineH + pad * 2
    ensureSpace(blockH + 8)
    y -= 4
    currentPage.drawRectangle({ x: ML, y: y - blockH + pad, width: CONTENT_W, height: blockH, color: CODEBG, borderColor: BORDER, borderWidth: 0.5 })
    y -= pad
    for (const line of lines) {
        const safeLine = line.replace(/\t/g, '    ')
        drawText(safeLine, { x: ML + pad, size, font: fonts.mono, color: CODEFG })
        y -= lineH
    }
    y -= pad
    y -= 4
}

function table(headers, rows) {
    const colW = CONTENT_W / headers.length
    const rowH = 18
    const pad = 5
    const size = 8.5
    ensureSpace((rows.length + 1) * rowH + 4)
    y -= 4

    // Header row
    for (let c = 0; c < headers.length; c++) {
        currentPage.drawRectangle({ x: ML + c * colW, y: y - rowH + 4, width: colW, height: rowH, color: HEADBG })
        drawText(headers[c], { x: ML + c * colW + pad, size, font: fonts.bold, color: HEADFG })
    }
    y -= rowH

    // Data rows
    for (let r = 0; r < rows.length; r++) {
        const bg = r % 2 === 0 ? rgb(1,1,1) : ROWALT
        for (let c = 0; c < rows[r].length; c++) {
            currentPage.drawRectangle({ x: ML + c * colW, y: y - rowH + 4, width: colW, height: rowH, color: bg, borderColor: BORDER, borderWidth: 0.3 })
            // Wrap cell text
            const cellText = rows[r][c]
            const wrapped = wrapText(cellText, fonts.regular, size, colW - pad * 2)
            drawText(wrapped[0] || '', { x: ML + c * colW + pad, size, font: fonts.regular, color: BLACK })
        }
        y -= rowH
    }
    y -= 6
}

function space(n = 8) { y -= n }

function pageNumber() {
    for (let i = 0; i < pages.length; i++) {
        const pg = pages[i]
        const text = `${i + 1} of ${pages.length}`
        const w = fonts.regular.widthOfTextAtSize(text, 8)
        pg.drawText(text, { x: PAGE_W - MR - w, y: MB - 16, size: 8, font: fonts.regular, color: LIGHT })
        pg.drawText('TeamVault — Confidential', { x: ML, y: MB - 16, size: 8, font: fonts.regular, color: LIGHT })
        pg.drawLine({ start: { x: ML, y: MB - 4 }, end: { x: PAGE_W - MR, y: MB - 4 }, thickness: 0.5, color: BORDER })
    }
}

// ── Cover page ─────────────────────────────────────────────────────────────
async function buildCover() {
    currentPage.drawRectangle({ x: 0, y: PAGE_H - 180, width: PAGE_W, height: 180, color: HEADBG })

    y = PAGE_H - 60
    drawText('TeamVault', { x: ML, size: 28, font: fonts.bold, color: HEADFG })
    y -= 36
    drawText('Zero-Knowledge Encryption', { x: ML, size: 20, font: fonts.bold, color: HEADFG })
    y -= 26
    drawText('Design Plan', { x: ML, size: 16, font: fonts.regular, color: rgb(0.8, 0.88, 1.0) })

    y = PAGE_H - 220
    paragraph('This document describes the proposed cryptographic architecture for end-to-end encrypted workspaces in TeamVault. All file content, filenames, and folder names would be encrypted in the browser before leaving the device. The TeamVault server stores only ciphertext and cannot access any plaintext data.', { size: 10.5, color: GREY })
    space(12)
    paragraph('Classification: Confidential — Internal Technical Design', { size: 9, color: LIGHT })
    space(4)
    paragraph('Date: April 2026', { size: 9, color: LIGHT })
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
    pdfDoc = await PDFDocument.create()
    pages = []

    pdfDoc.setTitle('TeamVault Zero-Knowledge Encryption — Design Plan')
    pdfDoc.setAuthor('TeamVault')
    pdfDoc.setSubject('Zero-Knowledge Encryption Architecture')
    pdfDoc.setCreator('TeamVault Document Generator')

    fonts = {
        regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
        bold:    await pdfDoc.embedFont(StandardFonts.HelveticaBold),
        italic:  await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
        mono:    await pdfDoc.embedFont(StandardFonts.Courier),
    }

    // Cover
    newPage()
    await buildCover()

    // ── Section 1: Executive Summary ──────────────────────────────────────
    newPage()
    h1('1. Executive Summary')
    paragraph('Files, filenames, and folder names are encrypted in the browser before leaving the device. The server stores only ciphertext — it cannot read file content, names, or metadata. Files upload and download directly to/from R2 using presigned URLs, so the TeamVault server never touches plaintext bytes.')
    space()
    paragraph('This approach matches the threat model of Google Workspace Client-Side Encryption, Proton Drive, and 1Password — the server is fully untrusted for content, but the infrastructure is trusted for availability.')

    // ── Section 2: Cryptographic Architecture ─────────────────────────────
    h1('2. Cryptographic Architecture')
    h2('2.1 Envelope Encryption Model')
    paragraph('Three layers of keys are used to balance security, usability, and key management flexibility:')
    space(4)
    codeBlock([
        'User Wrapping Key (UWK)          -- per user, derived from password or passkey',
        '    +-- decrypts -->',
        '        Workspace Key (WK)       -- one per workspace, symmetric AES-256-GCM',
        '            +-- encrypts -->',
        '                File DEK         -- one per file, random AES-256-GCM key',
        '                Metadata (names) -- folder/file names encrypted with WK directly',
    ])
    space(4)
    paragraph('Why three layers:', { font: fonts.bold })
    bullet('The Workspace Key (WK) is shared across the workspace. Every user holds an encrypted copy wrapped with their own UWK. Adding a user means wrapping the WK with the new user\'s UWK. Revoking a user means rotating the WK and re-wrapping for remaining users. Actual R2 file blobs are never re-uploaded.')
    bullet('Each file has its own random DEK so a compromised single-file key exposes nothing else.')

    h2('2.2 User Wrapping Key (UWK)')
    paragraph('The UWK is never stored on any server. It is derived fresh each session by one of two methods:')
    space(4)
    h3('Method A — Password')
    codeBlock(['UWK = PBKDF2(password, user_salt, iterations=600,000, hash=SHA-256, length=256 bits)'])
    paragraph('User enters a vault passphrase once per login session. The UWK is held in memory only and is never persisted.')
    space(6)
    h3('Method B — WebAuthn PRF (Passkey / Security Key)')
    codeBlock(['UWK = WebAuthn.PRF(credentialId, eval_salt)'])
    paragraph('The PRF extension of the Web Authentication API derives 32 deterministic bytes from a registered passkey assertion. The user taps their security key or uses Face ID / fingerprint — no password is typed. Supported devices include:')
    bullet('YubiKey 5 series (USB-A, USB-C, NFC)')
    bullet('iOS 17+ passkeys')
    bullet('Android 14+ passkeys')
    bullet('Chrome / Edge on Windows Hello')
    space(4)
    paragraph('Both methods can coexist per user — a backup password and one or more passkeys can all be registered simultaneously.')

    h2('2.3 Workspace Key (WK)')
    bullet('One 256-bit random key per workspace, generated at E2EE setup time')
    bullet('Never stored in plaintext — always stored as Encrypt(UWK, WK) per user in the membership_keys table')
    bullet('AES-256-GCM encryption with a random 96-bit IV per wrap')

    h2('2.4 File DEK (Data Encryption Key)')
    bullet('256-bit random key generated in the browser at upload time')
    bullet('Used with AES-256-GCM to encrypt the file bytes')
    bullet('Stored as Encrypt(WK, DEK) in vault_objects.encrypted_dek')
    bullet('If WK is rotated (user revoked), only DEK records are re-encrypted — R2 file blobs remain unchanged')

    // ── Section 3: Database Schema ────────────────────────────────────────
    h1('3. Database Schema Changes')
    codeBlock([
        '-- E2EE config per workspace',
        'ALTER TABLE workspaces ADD COLUMN e2ee_enabled boolean NOT NULL DEFAULT false;',
        'ALTER TABLE workspaces ADD COLUMN wk_version   integer NOT NULL DEFAULT 0;',
        '',
        '-- Per-user wrapped WK copies',
        'CREATE TABLE membership_keys (',
        '    user_id        uuid REFERENCES users(id) ON DELETE CASCADE,',
        '    workspace_id   uuid REFERENCES workspaces(id) ON DELETE CASCADE,',
        '    wk_version     integer NOT NULL,',
        '    method         text NOT NULL,   -- \'password\' | \'passkey\'',
        '    credential_id  text,            -- WebAuthn credential ID (passkey only)',
        '    kdf_params     jsonb,           -- { salt, iterations } for password method',
        '    prf_salt       text,            -- eval_input salt for PRF method',
        '    wrapped_wk     text NOT NULL,   -- base64(AES-GCM(UWK, WK))',
        '    wrapped_wk_iv  text NOT NULL,   -- base64 IV',
        '    created_at     timestamptz DEFAULT now(),',
        '    PRIMARY KEY (user_id, workspace_id, credential_id)',
        ');',
        '',
        '-- File encryption metadata',
        'ALTER TABLE vault_objects ADD COLUMN encrypted_dek    text;',
        'ALTER TABLE vault_objects ADD COLUMN dek_iv           text;',
        'ALTER TABLE vault_objects ADD COLUMN content_iv       text;',
        'ALTER TABLE vault_objects ADD COLUMN e2ee_wk_version  integer;',
        'ALTER TABLE vault_objects ADD COLUMN name_encrypted   boolean NOT NULL DEFAULT false;',
    ])

    // ── Section 4: Browser Crypto ─────────────────────────────────────────
    h1('4. Browser Crypto Implementation')
    paragraph('All cryptography uses the native Web Crypto API — no external library, no WASM. It is available in all modern browsers and runs in a sandboxed, hardware-accelerated context.')

    h2('4.1 Client-Side Crypto Module (src/lib/e2ee.ts)')
    codeBlock([
        '// Key derivation',
        'async function deriveUWKFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey>',
        'async function deriveUWKFromPRF(credentialId: string, prfSalt: Uint8Array): Promise<CryptoKey>',
        '',
        '// Workspace key operations',
        'async function unwrapWorkspaceKey(wrappedWK, iv, uwk): Promise<CryptoKey>',
        'async function wrapWorkspaceKey(wk, uwk): Promise<{ wrappedWK: string, iv: string }>',
        '',
        '// File DEK operations',
        'async function generateDEK(): Promise<CryptoKey>',
        'async function wrapDEK(dek, wk): Promise<{ encryptedDek: string, dekIv: string }>',
        'async function unwrapDEK(encryptedDek, dekIv, wk): Promise<CryptoKey>',
        '',
        '// File content',
        'async function encryptFile(file, dek): Promise<{ ciphertext: ArrayBuffer, iv: string }>',
        'async function decryptFile(ciphertext, iv, dek): Promise<ArrayBuffer>',
        '',
        '// Metadata (names)',
        'async function encryptName(name: string, wk: CryptoKey): Promise<string>',
        'async function decryptName(ciphertext: string, wk: CryptoKey): Promise<string>',
    ])

    h2('4.2 Session Key Storage')
    paragraph('The Workspace Key is held in a non-extractable CryptoKey object in memory (React context or module-level variable):')
    bullet('Never serialized or written to localStorage or sessionStorage')
    bullet('Lost on page refresh — user re-authenticates the vault once per browser session')
    bullet('Optionally cached in sessionStorage as a blob encrypted with a session-ephemeral key, to survive page navigation without re-prompting')

    // ── Section 5: User Flows ─────────────────────────────────────────────
    newPage()
    h1('5. User Flows')

    h2('5.1 Admin — Enable E2EE')
    bullet('Admin clicks "Enable Zero-Knowledge Encryption" in workspace settings')
    bullet('Browser generates WK = crypto.getRandomValues(32 bytes)')
    bullet('Admin chooses UWK method (password or passkey)')
    bullet('wrapped_wk = AES-GCM(UWK, WK) generated in browser')
    bullet('POST /api/vault/e2ee/setup — server sets e2ee_enabled = true and saves admin\'s membership_keys row')
    bullet('All existing files require a one-time migration (encrypt in browser, re-upload metadata)')

    h2('5.2 User — Unlock Vault')
    h3('Password path')
    bullet('On first vault load, a modal prompts for the vault passphrase')
    bullet('UWK = PBKDF2(passphrase, kdf_params.salt, ...)')
    bullet('Fetch wrapped_wk from /api/vault/e2ee/my-key')
    bullet('WK = AES-GCM-Decrypt(UWK, wrapped_wk) — wrong passphrase fails here')
    bullet('WK stored in memory; vault is unlocked')
    space(4)
    h3('Passkey path')
    bullet('Modal shows registered passkey credentials')
    bullet('navigator.credentials.get() called with PRF extension and eval salt')
    bullet('Browser prompts tap / biometric')
    bullet('UWK = assertion.getClientExtensionResults().prf.results.first')
    bullet('Rest is identical to password path')

    h2('5.3 Upload (E2EE workspace)')
    codeBlock([
        '1. DEK  = generateKey(AES-GCM, 256)',
        '2. { ciphertext, contentIv } = encryptFile(file, DEK)',
        '3. { encryptedDek, dekIv }   = wrapDEK(DEK, WK)',
        '4. encryptedName             = encryptName(filename, WK)',
        '5. POST /api/vault/file/create-upload  (encrypted metadata)',
        '   ← { object_id, upload_url }         (presigned R2 PUT)',
        '6. PUT upload_url ← ciphertext          (direct to R2, server never sees plaintext)',
        '7. POST /api/vault/file/finalize        (checksum of ciphertext)',
    ])
    paragraph('The SHA-256 checksum covers the ciphertext — integrity is verified without revealing content.')

    h2('5.4 Download / View')
    codeBlock([
        '1. POST /api/vault/file/download-link { object_id }',
        '   ← { download_url, encrypted_dek, dek_iv, content_iv }',
        '2. fetch(download_url) → ciphertext  (direct from R2)',
        '3. DEK       = unwrapDEK(encrypted_dek, dek_iv, WK)',
        '4. plaintext = decryptFile(ciphertext, content_iv, DEK)',
        '5. URL.createObjectURL(new Blob([plaintext])) for inline preview',
        '   — or — trigger browser download',
    ])

    // ── Section 6: Adding / Revoking Users ───────────────────────────────
    h1('6. Adding & Revoking Users')

    h2('6.1 Adding a User')
    paragraph('Standard invite flow, plus a key provisioning step:')
    bullet('New user logs in and is prompted to set up their vault key method')
    bullet('New user generates a UWK (password or passkey) and posts derivation params to the server')
    bullet('Any online admin sees a "pending user" notification')
    bullet('Admin\'s browser wraps WK with new user\'s UWK derivation or ECDH shared secret')
    bullet('New user retrieves their wrapped_wk on next vault load')
    space(6)
    paragraph('ECDH async path (no admin needs to be online at the same time):', { font: fonts.bold })
    bullet('New user generates an ephemeral ECDH keypair; public key posted to server')
    bullet('Admin\'s browser fetches public key, computes shared secret, wraps WK with it')
    bullet('New user retrieves wrapped WK via ECDH private key, re-wraps with their own UWK')

    h2('6.2 Revoking a User')
    paragraph('Revocation requires WK rotation because the revoked user holds the current WK in memory:')
    bullet('Admin revokes user — existing membership status = \'disabled\'')
    bullet('Admin\'s browser generates WK2 = new random key')
    bullet('Admin re-wraps WK2 for each remaining active member')
    bullet('POST all new wrapped keys + incremented wk_version to /api/vault/e2ee/rotate-key')
    bullet('Server re-encrypts all DEK records: Decrypt(WK_old, DEK) then Encrypt(WK2, DEK)')
    bullet('R2 file blobs are UNCHANGED — only the small encrypted_dek column values are updated')
    bullet('Revoked user\'s session is invalidated; their membership_keys row is deleted')
    space(4)
    paragraph('Note: A fully client-side DEK re-encryption path (browser re-encrypts all DEKs) maintains true zero-knowledge but is slower for large vaults. A server-assisted path is available as a practical alternative with a short-lived plaintext window.', { color: GREY, size: 9 })

    // ── Section 7: Feature Impact ─────────────────────────────────────────
    newPage()
    h1('7. Impact on Existing Features')
    space(4)
    table(
        ['Feature', 'Impact'],
        [
            ['Server-side search', 'Not possible — names are ciphertext. Client-side search only after WK unlock.'],
            ['Audit log', 'Object IDs logged; names shown as [encrypted] without WK, decrypted client-side for admins with WK unlocked.'],
            ['PDF watermarking', 'Incompatible — server cannot read or modify file bytes. Verified Downloads disabled for E2EE workspaces.'],
            ['Desktop sync', 'Requires WK storage in OS keychain (macOS Keychain, Windows Credential Store). Addressed in sync client phase.'],
            ['Inline preview', 'Works — FileViewerModal receives decrypted ArrayBuffer instead of a URL.'],
            ['Version history', 'Works — each version gets its own DEK stored in file_versions.encrypted_dek.'],
            ['Folder ACLs', 'Works — ACL checks use object IDs, not names.'],
        ]
    )

    // ── Section 8: WebAuthn PRF Support ──────────────────────────────────
    h1('8. WebAuthn PRF — Browser & Device Support')
    space(4)
    table(
        ['Platform', 'PRF Support'],
        [
            ['Chrome 116+ (Windows, macOS, Linux)', 'Supported'],
            ['Edge 116+', 'Supported'],
            ['Safari 17+ (macOS, iOS)', 'Supported — passkeys; PRF flag needed'],
            ['Firefox', 'Not yet supported — password fallback required'],
            ['YubiKey 5 (USB-A, USB-C, NFC)', 'Supported — FIDO2 PRF'],
            ['YubiKey 4 / Security Key NFC', 'Not supported — no PRF capability'],
            ['Android 14+ / Chrome', 'Supported'],
            ['iOS 17+ passkeys', 'Supported'],
        ]
    )

    // ── Section 9: Implementation Phases ─────────────────────────────────
    h1('9. Implementation Phases')

    h2('Phase 1 — Core crypto library & key setup (2–3 weeks)')
    bullet('src/lib/e2ee.ts — all Web Crypto primitives')
    bullet('src/components/VaultUnlockModal.tsx — password + passkey UI')
    bullet('Database schema additions')
    bullet('/api/vault/e2ee/setup and /api/vault/e2ee/my-key endpoints')
    bullet('Workspace settings toggle to enable E2EE')

    h2('Phase 2 — Upload / download pipeline (2 weeks)')
    bullet('Modify create-upload and finalize to accept encrypted metadata and IVs')
    bullet('Modify download-link to return encrypted_dek, dek_iv, and content_iv')
    bullet('Modify FileViewerModal to accept ArrayBuffer decrypted content')
    bullet('Client-side file picker encrypts file before upload')

    h2('Phase 3 — User provisioning & ECDH handshake (1–2 weeks)')
    bullet('/api/vault/e2ee/provision-user endpoint')
    bullet('Admin "pending users" notification in workspace dashboard')
    bullet('ECDH async key agreement flow for offline provisioning')

    h2('Phase 4 — Key rotation / revocation (1–2 weeks)')
    bullet('/api/vault/e2ee/rotate-key endpoint')
    bullet('DEK batch re-encryption — browser-side for full zero-knowledge')
    bullet('Integration with existing user disable / remove flow')

    h2('Phase 5 — Passkey registration (1 week)')
    bullet('WebAuthn credential registration UI')
    bullet('PRF-based UWK derivation')
    bullet('Multi-credential management (register phone + YubiKey simultaneously)')

    h2('Phase 6 — Migration tooling (1 week)')
    bullet('Encrypt existing plaintext files on E2EE opt-in')
    bullet('Progress indicator and resumable migration for large workspaces')

    // ── Section 10: Limitations ───────────────────────────────────────────
    h1('10. Known Limitations & Threat Model')
    paragraph('This design provides strong protection against server-side compromise. It cannot protect against:')
    bullet('A compromised browser extension (keylogger or script injection)')
    bullet('A compromised end-user device (malware with memory access)')
    bullet('Server-side metadata: file sizes, upload timestamps, access patterns — these remain in the audit log (inherent to any such system)')
    bullet('An admin with the WK in memory who is subject to compelled disclosure')
    space(6)
    paragraph('This threat model is consistent with Google Workspace Client-Side Encryption, Proton Drive, and 1Password. The TeamVault server is fully untrusted for content confidentiality, but is trusted for availability and access control enforcement.')

    // ── Footer page numbers ───────────────────────────────────────────────
    pageNumber()

    const bytes = await pdfDoc.save()
    writeFileSync(OUTPUT, bytes)
    console.log(`Written: ${OUTPUT}`)
}

main().catch(err => { console.error(err); process.exit(1) })
