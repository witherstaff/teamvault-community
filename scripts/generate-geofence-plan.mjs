/**
 * Generates TeamVault_Geofencing_Implementation_Plan.pdf using pdf-lib.
 * Run with: node scripts/generate-geofence-plan.mjs
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT = resolve(__dirname, '../TeamVault_Geofencing_Implementation_Plan.pdf')

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
const GREENBG = rgb(0.92, 0.98, 0.93)
const GREENBR = rgb(0.30, 0.70, 0.40)

const PAGE_W = 595
const PAGE_H = 842
const ML = 52, MR = 52, MT = 52, MB = 52
const CONTENT_W = PAGE_W - ML - MR

let pdfDoc, pages, currentPage, y, fonts

function newPage() {
    currentPage = pdfDoc.addPage([PAGE_W, PAGE_H])
    pages.push(currentPage)
    y = PAGE_H - MT
}

function ensureSpace(n) { if (y - n < MB + 20) newPage() }

const REPLACEMENTS = {
    '\u2014': '--', '\u2013': '-', '\u2018': "'", '\u2019': "'",
    '\u201C': '"', '\u201D': '"', '\u2022': '*', '\u2190': '<--',
    '\u2192': '-->', '\u2713': 'v', '\u00E9': 'e', '\u2264': '<=',
}
function san(t) {
    let o = t
    for (const [f, r] of Object.entries(REPLACEMENTS)) o = o.replaceAll(f, r)
    return o.replace(/[^\x00-\xFF]/g, '?')
}

function dt(text, { x = ML, size = 10, font, color = BLACK } = {}) {
    currentPage.drawText(san(text), { x, y, size, font: font || fonts.r, color })
}

function wrap(text, font, size, maxW) {
    const words = text.split(' '), lines = []
    let line = ''
    for (const w of words) {
        const t = line ? line + ' ' + w : w
        if (font.widthOfTextAtSize(t, size) > maxW && line) { lines.push(line); line = w }
        else line = t
    }
    if (line) lines.push(line)
    return lines
}

function para(text, { size = 10, font, color = BLACK, indent = 0, gap = 5 } = {}) {
    const f = font || fonts.r
    const lines = wrap(text, f, size, CONTENT_W - indent)
    const lh = size + gap
    ensureSpace(lines.length * lh + 4)
    for (const l of lines) { dt(l, { x: ML + indent, size, font: f, color }); y -= lh }
}

function h1(text) {
    ensureSpace(42); y -= 14
    currentPage.drawRectangle({ x: ML, y: y - 4, width: CONTENT_W, height: 26, color: HEADBG })
    dt(text, { size: 15, font: fonts.b, color: HEADFG, x: ML + 8 }); y -= 28
}

function h2(text) {
    ensureSpace(30); y -= 10
    dt(text, { size: 12, font: fonts.b, color: ACCENT }); y -= 16
    currentPage.drawLine({ start: { x: ML, y }, end: { x: ML + CONTENT_W, y }, thickness: 0.8, color: ACCENT })
    y -= 6
}

function h3(text) {
    ensureSpace(22); y -= 6
    dt(text, { size: 10.5, font: fonts.b, color: BLACK }); y -= 15
}

function bullet(text, { indent = 10, size = 9.5, color = BLACK } = {}) {
    const lh = size + 4.5, tw = CONTENT_W - indent - 12
    const lines = wrap(text, fonts.r, size, tw)
    ensureSpace(lines.length * lh + 2)
    dt('*', { x: ML + indent, size, font: fonts.r, color: ACCENT })
    for (const l of lines) { dt(l, { x: ML + indent + 12, size, font: fonts.r, color }); y -= lh }
}

function num(n, text, { indent = 10, size = 9.5 } = {}) {
    const lh = size + 4.5, tw = CONTENT_W - indent - 22
    const lines = wrap(text, fonts.r, size, tw)
    ensureSpace(lines.length * lh + 2)
    dt(`${n}.`, { x: ML + indent, size, font: fonts.b, color: ACCENT })
    for (const l of lines) { dt(l, { x: ML + indent + 22, size, font: fonts.r, color: BLACK }); y -= lh }
}

function code(lines) {
    const size = 8, lh = size + 4, pad = 8
    const bh = lines.length * lh + pad * 2
    ensureSpace(bh + 10); y -= 4
    currentPage.drawRectangle({ x: ML, y: y - bh + pad, width: CONTENT_W, height: bh, color: CODEBG, borderColor: BORDER, borderWidth: 0.5 })
    y -= pad
    for (const l of lines) { dt(l.replace(/\t/g, '    '), { x: ML + pad, size, font: fonts.m, color: CODEFG }); y -= lh }
    y -= pad + 4
}

function callout(text, { bg = INFOBG, br = INFOBR, label = 'NOTE' } = {}) {
    const size = 9, lh = size + 4, pad = 8, tw = CONTENT_W - pad * 2 - 6
    const lines = wrap(text, fonts.r, size, tw)
    const bh = lines.length * lh + pad * 2
    ensureSpace(bh + 10); y -= 4
    currentPage.drawRectangle({ x: ML, y: y - bh + pad, width: CONTENT_W, height: bh, color: bg, borderColor: br, borderWidth: 1 })
    currentPage.drawRectangle({ x: ML, y: y - bh + pad, width: 4, height: bh, color: br })
    y -= pad
    dt(label + ': ' + lines[0], { x: ML + pad + 6, size, font: fonts.b, color: CODEFG }); y -= lh
    for (let i = 1; i < lines.length; i++) { dt(lines[i], { x: ML + pad + 6, size, font: fonts.r, color: CODEFG }); y -= lh }
    y -= pad + 4
}

function tbl(headers, rows, colW) {
    const scale = CONTENT_W / colW.reduce((a, b) => a + b, 0)
    const sw = colW.map(w => w * scale)
    const rh = 18, pad = 5, size = 8.5
    ensureSpace((rows.length + 1) * rh + 8); y -= 4
    let x = ML
    for (let c = 0; c < headers.length; c++) {
        currentPage.drawRectangle({ x, y: y - rh + 4, width: sw[c], height: rh, color: HEADBG })
        dt(headers[c], { x: x + pad, size, font: fonts.b, color: HEADFG }); x += sw[c]
    }
    y -= rh
    for (let r = 0; r < rows.length; r++) {
        x = ML
        const bg = r % 2 === 0 ? rgb(1, 1, 1) : ROWALT
        for (let c = 0; c < rows[r].length; c++) {
            currentPage.drawRectangle({ x, y: y - rh + 4, width: sw[c], height: rh, color: bg, borderColor: BORDER, borderWidth: 0.3 })
            dt(rows[r][c], { x: x + pad, size, font: fonts.r, color: BLACK }); x += sw[c]
        }
        y -= rh
    }
    y -= 8
}

function sp(n = 8) { y -= n }

function pageNums() {
    for (let i = 0; i < pages.length; i++) {
        const pg = pages[i]
        const t = `Page ${i + 1} of ${pages.length}`
        const w = fonts.r.widthOfTextAtSize(t, 8)
        pg.drawText(t, { x: PAGE_W - MR - w, y: MB - 16, size: 8, font: fonts.r, color: LIGHT })
        pg.drawText('TeamVault -- Geofencing Implementation Plan', { x: ML, y: MB - 16, size: 8, font: fonts.r, color: LIGHT })
        pg.drawLine({ start: { x: ML, y: MB - 4 }, end: { x: PAGE_W - MR, y: MB - 4 }, thickness: 0.5, color: BORDER })
    }
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
    pdfDoc = await PDFDocument.create()
    pages = []
    pdfDoc.setTitle('TeamVault Geofencing Implementation Plan')
    pdfDoc.setAuthor('TeamVault')
    pdfDoc.setSubject('Login Geofencing Design & Implementation')

    fonts = {
        r: await pdfDoc.embedFont(StandardFonts.Helvetica),
        b: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
        i: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
        m: await pdfDoc.embedFont(StandardFonts.Courier),
    }

    // ── Cover ──────────────────────────────────────────────────────────────
    newPage()
    currentPage.drawRectangle({ x: 0, y: PAGE_H - 180, width: PAGE_W, height: 180, color: HEADBG })
    y = PAGE_H - 60
    dt('TeamVault', { x: ML, size: 28, font: fonts.b, color: HEADFG }); y -= 36
    dt('Login Geofencing', { x: ML, size: 22, font: fonts.b, color: HEADFG }); y -= 28
    dt('Implementation Plan', { x: ML, size: 15, font: fonts.r, color: rgb(0.8, 0.88, 1.0) }); y -= 22
    dt('Country-based access control with bypass code and audit trail', { x: ML, size: 10, font: fonts.r, color: rgb(0.75, 0.85, 1.0) })

    y = PAGE_H - 220
    para('This document describes the complete implementation plan for login geofencing in TeamVault. Admins can restrict workspace access by country using ipapi.co for geo-resolution. Per-user exceptions, admin immunity, email bypass codes, and full audit logging are covered.', { size: 10.5, color: GREY })
    sp(10)
    para('Date: April 2026', { size: 9, color: LIGHT })

    // ── Section 1: Overview ────────────────────────────────────────────────
    newPage()
    h1('1. Feature Overview')
    para('Geofencing allows workspace admins to restrict logins to users originating from specific countries. When a user logs in from a blocked country, they are shown a block page with their IP address and detected location. Depending on configuration, they may be offered an email bypass code to temporarily override the restriction.')
    sp(6)

    h2('1.1 Scope of Controls')
    tbl(
        ['Control', 'Level', 'Description'],
        [
            ['Allowed countries list', 'Workspace', 'Workspace-wide default. All users must come from an allowed country.'],
            ['Per-user country exceptions', 'User', 'Override the workspace list for a specific user (allow more or fewer countries).'],
            ['Admin immunity', 'System config', 'Flag in config.ts: admins are never blocked by geofencing.'],
            ['Email bypass codes', 'Workspace + User', 'Admin enables bypass codes. Users can request a one-time code by email.'],
            ['Bypass code TTL', 'System config', 'Set in config.ts. Default: 5 minutes.'],
            ['Bypass code scope', 'Workspace or User', 'Admin can allow bypass for whole workspace or restrict to specific users.'],
        ],
        [130, 90, 270]
    )

    h2('1.2 Enforcement Point')
    para('Geofencing is enforced in src/middleware.ts at the vault route level -- after the Auth0 session is validated but before the user reaches any vault page. This means Auth0 login still completes normally; the user is authenticated but held at a geofence gate page until they pass the country check or present a valid bypass code.')
    sp(4)
    callout('Geofencing is NOT enforced at the Auth0 login step itself. This is intentional -- Auth0 is a shared service and cannot be customised per workspace. The gate sits inside TeamVault, after authentication, before vault access.', { label: 'DESIGN NOTE' })

    // ── Section 2: Config Changes ──────────────────────────────────────────
    h1('2. Config File Changes (src/lib/config.ts)')
    para('All geofencing system defaults are added to the existing config.ts. This is the single source of truth for tuneable values and flags.')
    sp(4)
    code([
        '// ── Geofencing ────────────────────────────────────────────────────────',
        '',
        '/**',
        ' * Master switch: set to false to disable geofencing globally',
        ' * (e.g. for local development or self-hosted installs).',
        ' */',
        'export const GEOFENCING_ENABLED = true',
        '',
        '/**',
        ' * Admins (role === "admin") are never blocked by geofencing when this',
        ' * is true. Set to false if you want admins to be subject to the same',
        ' * country restrictions as regular users.',
        ' */',
        'export const GEOFENCING_ADMIN_IMMUNE = true',
        '',
        '/**',
        ' * Lifetime of a single-use email bypass code in seconds.',
        ' * Default: 300 (5 minutes).',
        ' */',
        'export const GEOFENCE_BYPASS_CODE_TTL_SECONDS = 300',
        '',
        '/**',
        ' * Length of the bypass code (numeric digits).',
        ' */',
        'export const GEOFENCE_BYPASS_CODE_LENGTH = 8',
        '',
        '/**',
        ' * Maximum number of bypass code attempts before the code is invalidated.',
        ' */',
        'export const GEOFENCE_BYPASS_MAX_ATTEMPTS = 3',
    ])
    sp(4)
    callout('GEOFENCING_ADMIN_IMMUNE is a system-level flag, not a per-workspace setting. A platform operator who wants admins to always be unrestricted sets this true in config.ts at deploy time. It cannot be changed by a workspace admin.', { label: 'NOTE' })

    // ── Section 3: Database Schema ─────────────────────────────────────────
    newPage()
    h1('3. Database Schema')

    h2('3.1 Workspace Geofencing Settings')
    code([
        '-- Geofencing settings stored on the workspaces table',
        'ALTER TABLE workspaces',
        '    ADD COLUMN geo_enabled           boolean NOT NULL DEFAULT false,',
        '    ADD COLUMN geo_allowed_countries  text[]  NOT NULL DEFAULT \'{}\',',
        '    ADD COLUMN geo_allow_bypass_code  boolean NOT NULL DEFAULT false,',
        '    ADD COLUMN geo_bypass_scope       text    NOT NULL DEFAULT \'workspace\';',
        '    -- geo_bypass_scope: "workspace" = any member can request a code',
        '    --                   "user"      = only members with per-user bypass enabled',
    ])
    sp(4)

    h2('3.2 Per-User Geofencing Exceptions')
    code([
        '-- Per-user exceptions stored on the memberships table',
        'ALTER TABLE memberships',
        '    ADD COLUMN geo_override_enabled   boolean NOT NULL DEFAULT false,',
        '    ADD COLUMN geo_allowed_countries  text[],   -- NULL = inherit workspace list',
        '    ADD COLUMN geo_allow_bypass_code  boolean NOT NULL DEFAULT false;',
        '    -- geo_allow_bypass_code: per-user bypass regardless of workspace scope setting',
    ])
    sp(4)

    h2('3.3 Bypass Code Table')
    code([
        'CREATE TABLE geofence_bypass_codes (',
        '    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),',
        '    workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,',
        '    user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,',
        '    code_hash     text NOT NULL,  -- bcrypt hash of the code, never store plaintext',
        '    ip            text NOT NULL,  -- IP the code was issued for',
        '    geo_country   text,           -- country detected at issue time',
        '    geo_city      text,',
        '    expires_at    timestamptz NOT NULL,',
        '    used          boolean NOT NULL DEFAULT false,',
        '    attempts      integer NOT NULL DEFAULT 0,',
        '    created_at    timestamptz NOT NULL DEFAULT now()',
        ');',
        '',
        'CREATE INDEX ON geofence_bypass_codes (user_id, workspace_id, used, expires_at);',
    ])
    sp(4)
    callout('The bypass code itself is never stored. Only a bcrypt hash is persisted. The plaintext code exists only in the email sent to the user and in server memory for the duration of the hashing operation. It is never written to any log.', { label: 'SECURITY', bg: GREENBG, br: GREENBR })

    h2('3.4 New Audit Actions')
    code([
        "-- Add to AuditAction union type in src/lib/audit.ts:",
        "| 'GEO_BLOCK'          -- login blocked by geofence",
        "| 'GEO_BYPASS_SENT'    -- bypass code emailed (no code in metadata)",
        "| 'GEO_BYPASS_SUCCESS' -- valid code entered, access granted",
        "| 'GEO_BYPASS_FAIL'    -- invalid/expired code entered",
    ])

    // ── Section 4: Core Logic ──────────────────────────────────────────────
    newPage()
    h1('4. Core Geofencing Logic (src/lib/geofence.ts)')
    para('A new module encapsulates all geofencing decisions. It is called synchronously from the middleware.')
    sp(4)
    code([
        'export interface GeoCheckResult {',
        "    allowed:      boolean",
        "    reason?:      'no_rules' | 'admin_immune' | 'country_allowed' | 'country_blocked'",
        "    country?:     string | null",
        "    city?:        string | null",
        "    ip:           string",
        "    canRequestBypassCode: boolean",
        '}',
        '',
        'export async function checkGeofence(',
        '    userId:      string,',
        '    workspaceId: string,',
        '    role:        "admin" | "user",',
        '    ip:          string,',
        '): Promise<GeoCheckResult>',
    ])
    sp(4)

    h3('Decision Logic (in order)')
    num(1, 'If GEOFENCING_ENABLED === false in config.ts, return allowed immediately.')
    num(2, 'Fetch workspace row: geo_enabled, geo_allowed_countries, geo_allow_bypass_code, geo_bypass_scope.')
    num(3, 'If workspace geo_enabled === false, return allowed immediately.')
    num(4, 'If GEOFENCING_ADMIN_IMMUNE === true AND role === "admin", return allowed with reason = "admin_immune".')
    num(5, 'Fetch membership row for this user: geo_override_enabled, geo_allowed_countries, geo_allow_bypass_code.')
    num(6, 'Resolve the effective country list: if membership.geo_override_enabled and membership.geo_allowed_countries is not null, use the per-user list. Otherwise use workspace list.')
    num(7, 'If effective list is empty, return allowed (no restrictions configured).')
    num(8, 'Call lookupGeo(ip) from login-security.ts (reuse existing function). Get country.')
    num(9, 'If country is in effective list, return allowed.')
    num(10, 'Country is blocked. Determine canRequestBypassCode: workspace.geo_allow_bypass_code must be true, AND (workspace.geo_bypass_scope === "workspace" OR membership.geo_allow_bypass_code === true).')
    num(11, 'Return allowed: false, with country, city, ip, and canRequestBypassCode.')
    sp(4)
    callout('lookupGeo() already exists in src/lib/login-security.ts with a 2-second timeout. Geofencing reuses it directly -- no second call to ipapi.co. The result is passed both into the geofence check and into the audit log metadata.', { label: 'NOTE' })

    // ── Section 5: Middleware Integration ─────────────────────────────────
    h1('5. Middleware Integration (src/middleware.ts)')
    para('The geofence check is inserted into the existing vault-route protection block, after session validation and before the login audit.')
    sp(4)
    code([
        '// Inside the vault-route block, after session is confirmed:',
        '',
        'const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim()',
        '           || request.headers.get("x-real-ip") || "unknown"',
        '',
        '// Resolve user + membership for this workspace',
        'const { data: user } = await db.from("users")...',
        'const membership = await getMembershipForRequest(user.id, workspaceId)',
        '',
        'const geoResult = await checkGeofence(',
        '    user.id, workspaceId, membership.role, ip',
        ')',
        '',
        'if (!geoResult.allowed) {',
        '    // Log GEO_BLOCK audit event',
        '    logAuditEvent({ action: "GEO_BLOCK", result: "denied", metadata: {',
        '        ip: geoResult.ip,',
        '        geo_country: geoResult.country,',
        '        geo_city:    geoResult.city,',
        '        can_request_bypass: geoResult.canRequestBypassCode,',
        '    }})',
        '',
        '    // Redirect to geofence block page',
        '    const blockUrl = new URL("/geo-blocked", request.nextUrl.origin)',
        '    blockUrl.searchParams.set("ws",  workspaceId)',
        '    blockUrl.searchParams.set("ip",  geoResult.ip)',
        '    blockUrl.searchParams.set("c",   geoResult.country ?? "")',
        '    blockUrl.searchParams.set("city",geoResult.city ?? "")',
        '    blockUrl.searchParams.set("cb",  geoResult.canRequestBypassCode ? "1" : "0")',
        '    return NextResponse.redirect(blockUrl)',
        '}',
    ])
    sp(4)
    callout('The workspaceId for the geofence check comes from the URL path (/vault/<workspaceId>/...). A user with multiple workspaces is checked per workspace -- they may be blocked in one workspace but allowed in another if policies differ.', { label: 'NOTE' })

    // ── Section 6: Block Page ──────────────────────────────────────────────
    newPage()
    h1('6. Geofence Block Page (src/app/geo-blocked/page.tsx)')
    para('A new Next.js page renders when a user is blocked. It receives the IP, country, city, and bypass eligibility as URL query parameters. The page is publicly accessible (no auth required -- the user is already authenticated, just blocked).')
    sp(6)

    h2('6.1 Page Display')
    para('The block page shows:')
    bullet('A clear "Access Restricted" heading')
    bullet('The user\'s IP address')
    bullet('The detected country and city from ipapi.co')
    bullet('The workspace name (fetched server-side by workspace ID)')
    bullet('If bypass codes are enabled: a "Send me a bypass code" button')
    bullet('If bypass codes are enabled: a code entry input field (appears after the email is sent)')
    sp(4)
    code([
        'Your connection from 203.0.113.42 (Sydney, Australia)',
        'is not permitted to access this workspace.',
        '',
        '[Send bypass code to my email]',
        '',
        '-- After button clicked: --',
        'A code has been sent to k****@example.com',
        '[_______] [Submit code]',
    ])
    sp(4)
    callout('The email address shown on the page is partially masked (k****@example.com) to confirm it is going to the right place without exposing the full address in the URL or page source.', { label: 'UX NOTE' })

    h2('6.2 Bypass Code Request API (POST /api/geo/request-bypass)')
    code([
        '// Request body',
        '{ workspace_id: string, ip: string }',
        '',
        '// Server actions:',
        '// 1. Re-validate the session (user must still be authenticated)',
        '// 2. Re-run checkGeofence to confirm block is still active',
        '// 3. Confirm canRequestBypassCode is true',
        '// 4. Generate GEOFENCE_BYPASS_CODE_LENGTH random digits',
        '// 5. bcrypt-hash the code, store in geofence_bypass_codes with expires_at',
        '// 6. Send email with the plaintext code',
        '// 7. Log GEO_BYPASS_SENT audit event (NO code in metadata)',
        '// 8. Return { sent: true, masked_email: "k****@example.com" }',
    ])
    sp(4)

    h2('6.3 Bypass Code Verification API (POST /api/geo/verify-bypass)')
    code([
        '// Request body',
        '{ workspace_id: string, code: string }',
        '',
        '// Server actions:',
        '// 1. Re-validate session',
        '// 2. Fetch latest unused, unexpired code for (user_id, workspace_id)',
        '// 3. Increment attempts counter',
        '// 4. If attempts > GEOFENCE_BYPASS_MAX_ATTEMPTS: mark used=true, log FAIL, return 429',
        '// 5. bcrypt.compare(submitted_code, code_hash)',
        '// 6. If mismatch: log GEO_BYPASS_FAIL, return { valid: false }',
        '// 7. If match: mark used=true, set _tv_geo_bypass cookie, log GEO_BYPASS_SUCCESS',
        '// 8. Return { valid: true, redirect: "/vault/<workspaceId>" }',
    ])
    sp(4)
    callout('The bypass cookie _tv_geo_bypass is a signed, HttpOnly, Secure cookie containing the workspace ID and expiry. It is checked by the middleware on subsequent requests to skip the geo block for the duration of the bypass window (matching the code TTL).', { label: 'SECURITY', bg: GREENBG, br: GREENBR })

    // ── Section 7: Email ───────────────────────────────────────────────────
    newPage()
    h1('7. Bypass Code Email')

    h2('7.1 Email Content')
    code([
        'Subject: Your TeamVault Access Code',
        '',
        'Hello,',
        '',
        'A login attempt was made to the workspace "[Workspace Name]" from:',
        '',
        '    IP Address:  203.0.113.42',
        '    Location:    Sydney, Australia',
        '    Time:        09 Apr 2026 14:32 UTC',
        '',
        'Your one-time access code is:',
        '',
        '    7 4 2 9 1 8 3 6',
        '',
        'This code expires in 5 minutes and can only be used once.',
        '',
        'If you did not attempt to log in, please contact your workspace admin',
        'immediately and consider changing your password.',
        '',
        '-- TeamVault Security',
    ])
    sp(4)
    callout('The email is sent via the existing email transport used for user invitations. No new email infrastructure is required. The code is formatted with spaces for readability but entered without spaces on the form (the UI strips whitespace before submission).', { label: 'NOTE' })

    h2('7.2 Rate Limiting')
    bullet('Maximum 3 code requests per user per workspace per 10-minute rolling window (enforced server-side, stored in geofence_bypass_codes row count)')
    bullet('If the limit is exceeded, return 429 with a "Too many requests" message -- no email sent, no audit event (to avoid log flooding)')
    bullet('A new code request invalidates any previous unused code for that user + workspace')

    // ── Section 8: Admin UI ────────────────────────────────────────────────
    h1('8. Admin UI Changes')

    h2('8.1 Workspace Settings Tab -- New Geofencing Section')
    para('A new "Geofencing" card is added to the workspace admin settings panel:')
    sp(4)
    code([
        '+----------------------------------------------------------+',
        '| Geofencing                                               |',
        '|                                                          |',
        '| [x] Enable geofencing for this workspace                 |',
        '|                                                          |',
        '| Allowed countries (members must connect from):          |',
        '| [ Australia x ] [ United States x ] [ + Add country ]  |',
        '|                                                          |',
        '| [x] Allow users to request an email bypass code         |',
        '|                                                          |',
        '| Bypass code access:                                      |',
        '| ( ) Any workspace member                                 |',
        '| (*) Only members with per-user bypass enabled            |',
        '|                                                          |',
        '+----------------------------------------------------------+',
    ])
    sp(4)
    para('The country selector is a searchable dropdown populated from a static list of ISO 3166-1 country names and codes. No live API call is needed for the selector.')

    h2('8.2 Per-User Settings -- Geofencing Override')
    para('In the Users tab, clicking a user opens their detail panel. A new Geofencing section appears:')
    sp(4)
    code([
        '+----------------------------------------------------------+',
        '| Geofencing (this user)                                   |',
        '|                                                          |',
        '| [x] Override workspace country list for this user        |',
        '|                                                          |',
        '| This user may connect from:                              |',
        '| [ Canada x ] [ Mexico x ] [ + Add country ]             |',
        '|                                                          |',
        '| [x] Allow this user to request a bypass code             |',
        '|     (overrides workspace bypass scope setting)           |',
        '|                                                          |',
        '+----------------------------------------------------------+',
    ])

    h2('8.3 New Admin API Endpoints')
    tbl(
        ['Endpoint', 'Method', 'Action'],
        [
            ['api/admin/workspace/geo', 'GET', 'Fetch current geofencing config for workspace'],
            ['api/admin/workspace/geo', 'PUT', 'Update workspace geofencing config'],
            ['api/admin/users/geo', 'GET', 'Fetch per-user geo override for a membership'],
            ['api/admin/users/geo', 'PUT', 'Update per-user geo override'],
        ],
        [200, 60, 230]
    )

    // ── Section 9: Audit Log ───────────────────────────────────────────────
    newPage()
    h1('9. Audit Log Events')
    para('Four new audit actions are added. All are logged to the existing audit_events table using the existing logAuditEvent() function.')
    sp(6)

    h2('9.1 GEO_BLOCK')
    code([
        'logAuditEvent({',
        '    workspaceId,',
        '    actorUserId:  user.id,',
        '    actorName:    user.name,',
        '    actorEmail:   user.email,',
        '    action:       "GEO_BLOCK",',
        '    result:       "denied",',
        '    metadata: {',
        '        ip:                geoResult.ip,',
        '        geo_country:       geoResult.country,     // "Australia"',
        '        geo_city:          geoResult.city,        // "Sydney"',
        '        can_request_bypass: geoResult.canRequestBypassCode,',
        '    }',
        '})',
    ])
    sp(4)

    h2('9.2 GEO_BYPASS_SENT')
    code([
        'logAuditEvent({',
        '    action:  "GEO_BYPASS_SENT",',
        '    result:  "allowed",',
        '    metadata: {',
        '        ip:          ip,',
        '        geo_country: country,',
        '        geo_city:    city,',
        '        // NOTE: the code itself is NEVER included in metadata',
        '    }',
        '})',
    ])
    sp(4)

    h2('9.3 GEO_BYPASS_SUCCESS')
    code([
        'logAuditEvent({',
        '    action:  "GEO_BYPASS_SUCCESS",',
        '    result:  "allowed",',
        '    metadata: {',
        '        ip:          ip,',
        '        geo_country: country,',
        '        geo_city:    city,',
        '        bypass_code_id: bypassCodeRow.id,  // UUID, not the code value',
        '    }',
        '})',
    ])
    sp(4)

    h2('9.4 GEO_BYPASS_FAIL')
    code([
        'logAuditEvent({',
        '    action:  "GEO_BYPASS_FAIL",',
        '    result:  "denied",',
        '    metadata: {',
        '        ip:           ip,',
        '        geo_country:  country,',
        '        reason:       "invalid_code" | "expired" | "max_attempts_exceeded" | "already_used",',
        '        attempts:     bypassCodeRow.attempts,',
        '    }',
        '})',
    ])
    sp(4)
    callout('The bypass code value (the 8-digit number sent by email) is NEVER written to any log, database column, or audit record. Only the bcrypt hash is stored, and that is in geofence_bypass_codes.code_hash. The audit record references the row ID (a UUID) not the code.', { label: 'SECURITY', bg: GREENBG, br: GREENBR })

    h2('9.5 Audit Log Display (AuditLogTab.tsx)')
    para('Four new cases are added to the ObjectSummary component and the EventDetailModal:')
    sp(4)
    tbl(
        ['Action', 'Table icon + summary', 'Detail modal sections'],
        [
            ['GEO_BLOCK', '[blocked] Country / City', 'Network: IP, Country, City. Note: bypass available or not.'],
            ['GEO_BYPASS_SENT', '[email] Bypass code sent', 'Network: IP, Country. Note: code not logged.'],
            ['GEO_BYPASS_SUCCESS', '[unlocked] Bypass accepted', 'Network: IP, Country. Bypass code ID (UUID).'],
            ['GEO_BYPASS_FAIL', '[denied] Bypass failed', 'Network: IP, Country. Reason, attempt count.'],
        ],
        [110, 140, 240]
    )

    // ── Section 10: Implementation Phases ─────────────────────────────────
    newPage()
    h1('10. Implementation Phases')

    h2('Phase 1 -- Config & Database (2-3 days)')
    bullet('Add geofencing constants to src/lib/config.ts')
    bullet('Write and run database migration SQL (ALTER TABLE workspaces, memberships; CREATE TABLE geofence_bypass_codes)')
    bullet('Add GEO_BLOCK, GEO_BYPASS_SENT, GEO_BYPASS_SUCCESS, GEO_BYPASS_FAIL to AuditAction in src/lib/audit.ts')

    h2('Phase 2 -- Core Logic (2-3 days)')
    bullet('Create src/lib/geofence.ts with checkGeofence() -- reuse lookupGeo() from login-security.ts')
    bullet('Create src/lib/bypass-code.ts: generateCode(), hashCode(), verifyCode(), createBypassRecord(), setBypassCookie(), checkBypassCookie()')
    bullet('Unit tests for country list resolution (workspace vs per-user override precedence)')

    h2('Phase 3 -- Middleware Integration (1 day)')
    bullet('Insert geofence check into middleware.ts vault-route block')
    bullet('Redirect blocked users to /geo-blocked with query params')
    bullet('Check _tv_geo_bypass cookie to skip re-checking on subsequent requests within the bypass window')

    h2('Phase 4 -- Block Page & APIs (2-3 days)')
    bullet('Create src/app/geo-blocked/page.tsx -- block message, IP/location display, bypass button and code input')
    bullet('Create POST /api/geo/request-bypass -- generate code, hash, store, send email, log GEO_BYPASS_SENT')
    bullet('Create POST /api/geo/verify-bypass -- verify hash, set cookie, log success or fail')

    h2('Phase 5 -- Admin UI (2-3 days)')
    bullet('Add Geofencing card to workspace settings admin panel')
    bullet('Add per-user geo override section in user detail panel')
    bullet('Implement GET/PUT /api/admin/workspace/geo and /api/admin/users/geo endpoints')
    bullet('Country selector component with search (static ISO 3166-1 list, no API)')

    h2('Phase 6 -- Audit Log Display (1 day)')
    bullet('Add ObjectSummary cases for the four new actions in AuditLogTab.tsx')
    bullet('Add EventDetailModal sections: network info, bypass status, fail reason')

    h2('Total Estimate: 10-13 days')

    // ── Section 11: Key Files ──────────────────────────────────────────────
    h1('11. Key Files Reference')
    sp(4)
    tbl(
        ['File', 'Change'],
        [
            ['src/lib/config.ts', 'Add GEOFENCING_ENABLED, GEOFENCING_ADMIN_IMMUNE, GEOFENCE_BYPASS_CODE_TTL_SECONDS, GEOFENCE_BYPASS_CODE_LENGTH, GEOFENCE_BYPASS_MAX_ATTEMPTS'],
            ['src/lib/audit.ts', 'Add GEO_BLOCK, GEO_BYPASS_SENT, GEO_BYPASS_SUCCESS, GEO_BYPASS_FAIL to AuditAction'],
            ['src/lib/geofence.ts', 'NEW -- GeoCheckResult interface, checkGeofence(), reuses lookupGeo()'],
            ['src/lib/bypass-code.ts', 'NEW -- code generation, hashing, verification, cookie management'],
            ['src/lib/login-security.ts', 'No change -- lookupGeo() reused as-is by geofence.ts'],
            ['src/middleware.ts', 'Add geofence check + redirect after session validation'],
            ['src/app/geo-blocked/page.tsx', 'NEW -- block page with IP/location display and bypass code UI'],
            ['src/app/api/geo/request-bypass/route.ts', 'NEW -- generate and email bypass code'],
            ['src/app/api/geo/verify-bypass/route.ts', 'NEW -- verify bypass code, set cookie'],
            ['src/app/api/admin/workspace/geo/route.ts', 'NEW -- GET/PUT workspace geofencing config'],
            ['src/app/api/admin/users/geo/route.ts', 'NEW -- GET/PUT per-user geo override'],
            ['src/app/vault/[wsId]/admin/tabs/SettingsTab.tsx', 'Add Geofencing card'],
            ['src/app/vault/[wsId]/admin/tabs/UsersTab.tsx', 'Add per-user geo override section'],
            ['src/app/vault/[wsId]/admin/tabs/AuditLogTab.tsx', 'Add geo event display cases'],
        ],
        [195, 295]
    )

    pageNums()
    const bytes = await pdfDoc.save()
    writeFileSync(OUTPUT, bytes)
    console.log(`Written: ${OUTPUT}`)
}

main().catch(e => { console.error(e); process.exit(1) })
