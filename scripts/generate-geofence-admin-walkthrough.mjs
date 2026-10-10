/**
 * Generates TeamVault_Geofencing_Admin_Walkthrough.pdf using pdf-lib.
 * Run with: node scripts/generate-geofence-admin-walkthrough.mjs
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT = resolve(__dirname, '../TeamVault_Geofencing_Admin_Walkthrough.pdf')

// ── Palette ──────────────────────────────────────────────────────────────────
const BLACK  = rgb(0.08, 0.08, 0.08)
const GREY   = rgb(0.35, 0.35, 0.35)
const LIGHT  = rgb(0.55, 0.55, 0.55)
const ACCENT = rgb(0.13, 0.35, 0.75)
const CODEFG = rgb(0.12, 0.12, 0.12)
const HEADBG = rgb(0.13, 0.35, 0.75)
const HEADFG = rgb(1, 1, 1)
const BORDER = rgb(0.82, 0.84, 0.90)
const WARNBG = rgb(1.00, 0.97, 0.88)
const WARNBR = rgb(0.85, 0.65, 0.18)
const INFOBG = rgb(0.92, 0.96, 1.00)
const INFOBR = rgb(0.45, 0.70, 0.95)
const OKBG   = rgb(0.93, 0.99, 0.93)
const OKBR   = rgb(0.28, 0.72, 0.38)
const ROWALT = rgb(0.96, 0.97, 1.00)
const STEPBG = rgb(0.18, 0.42, 0.88)
const WHITE  = rgb(1, 1, 1)
const UIBG   = rgb(0.97, 0.97, 0.99)
const UIBR   = rgb(0.78, 0.80, 0.88)

const PAGE_W  = 595
const PAGE_H  = 842
const ML      = 52
const MR      = 52
const MT      = 52
const MB      = 52
const CONTENT_W = PAGE_W - ML - MR   // 491 pt

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

// ── Text sanitiser (WinAnsi safe) ────────────────────────────────────────────
const REPLACEMENTS = {
    '\u2014': '--',  '\u2013': '-',  '\u2018': "'", '\u2019': "'",
    '\u201C': '"',   '\u201D': '"',  '\u2022': '*', '\u2190': '<--',
    '\u2192': '->',  '\u2194': '<->','\u25B6': '>',  '\u2713': 'v',
    '\u00E9': 'e',   '\u00F3': 'o',  '\u2264': '<=', '\u2265': '>=',
    '\u00FC': 'u',   '\u00E4': 'a',  '\u2026': '...', '\u00B7': '.',
    '\u00D7': 'x',   '\u2610': '[ ]','\u2611': '[x]','\u25A1': '[ ]',
}
function sanitise(text) {
    let out = text
    for (const [from, to] of Object.entries(REPLACEMENTS)) out = out.replaceAll(from, to)
    return out.replace(/[^\x00-\xFF]/g, '?')
}

// ── Core draw helpers ─────────────────────────────────────────────────────────
function drawText(text, { x = ML, size = 10, font, color = BLACK } = {}) {
    currentPage.drawText(sanitise(text), { x, y, size, font: font || fonts.regular, color })
}

function wrapText(text, font, size, maxWidth) {
    const words = sanitise(text).split(' ')
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

/** Truncate a string to fit within maxWidth, appending '...' if cut. */
function truncate(text, font, size, maxWidth) {
    const s = sanitise(text)
    if (font.widthOfTextAtSize(s, size) <= maxWidth) return s
    let t = s
    while (t.length > 1 && font.widthOfTextAtSize(t + '...', size) > maxWidth) t = t.slice(0, -1)
    return t + '...'
}

function gap(n = 8) { y -= n }

// ── Typography ────────────────────────────────────────────────────────────────
function paragraph(text, { size = 10, font, color = BLACK, indent = 0, lineGap = 5 } = {}) {
    const f = font || fonts.regular
    const lines = wrapText(text, f, size, CONTENT_W - indent)
    const lineH = size + lineGap
    ensureSpace(lines.length * lineH + 4)
    for (const line of lines) {
        currentPage.drawText(line, { x: ML + indent, y, size, font: f, color })
        y -= lineH
    }
}

function h1(text) {
    ensureSpace(44)
    y -= 14
    currentPage.drawRectangle({ x: ML, y: y - 4, width: CONTENT_W, height: 28, color: HEADBG })
    drawText(text, { size: 15, font: fonts.bold, color: HEADFG, x: ML + 10 })
    y -= 30
}

function h2(text) {
    ensureSpace(32)
    y -= 10
    drawText(text, { size: 12, font: fonts.bold, color: ACCENT })
    y -= 17
    currentPage.drawLine({ start: { x: ML, y }, end: { x: ML + CONTENT_W, y }, thickness: 0.8, color: ACCENT })
    y -= 6
}

function h3(text) {
    ensureSpace(24)
    y -= 6
    drawText(text, { size: 10.5, font: fonts.bold, color: BLACK })
    y -= 16
}

function bullet(text, { indent = 10, size = 9.5, color = BLACK } = {}) {
    const f = fonts.regular
    const lineH = size + 4.5
    const textW = CONTENT_W - indent - 14
    const lines = wrapText(text, f, size, textW)
    ensureSpace(lines.length * lineH + 2)
    currentPage.drawCircle({ x: ML + indent + 3, y: y - size / 2 + 1.5, size: 2, color: ACCENT })
    for (const line of lines) {
        currentPage.drawText(line, { x: ML + indent + 14, y, size, font: f, color })
        y -= lineH
    }
}

function numberedItem(n, text, { indent = 0, size = 9.5, bold = false } = {}) {
    const f = bold ? fonts.bold : fonts.regular
    const lineH = size + 5
    const textW = CONTENT_W - indent - 22
    const lines = wrapText(text, f, size, textW)
    ensureSpace(lines.length * lineH + 2)
    currentPage.drawText(`${n}.`, { x: ML + indent, y, size, font: fonts.bold, color: ACCENT })
    for (const line of lines) {
        currentPage.drawText(line, { x: ML + indent + 22, y, size, font: f, color: BLACK })
        y -= lineH
    }
}

// ── Step banner ───────────────────────────────────────────────────────────────
function stepBanner(n, title) {
    ensureSpace(52)
    y -= 12
    currentPage.drawRectangle({ x: ML, y: y - 6, width: CONTENT_W, height: 32, color: STEPBG })
    currentPage.drawCircle({ x: ML + 20, y: y + 9, size: 12, color: WHITE })
    currentPage.drawText(String(n), { x: ML + 16, y: y + 5, size: 11, font: fonts.bold, color: STEPBG })
    currentPage.drawText(sanitise(title), { x: ML + 40, y: y + 5, size: 12, font: fonts.bold, color: WHITE })
    y -= 36
}

// ── UI mockup box ─────────────────────────────────────────────────────────────
// Each line is drawn at a size that guarantees it fits within the box.
// Lines prefixed >>>  are section labels (bold, accent).
// Lines prefixed with two leading spaces are body lines.
// Empty string '' inserts a half-line gap.
function uiBox(lines, { label = '', labelColor = ACCENT } = {}) {
    const PAD     = 8
    const BASE    = 8        // preferred font size
    const INNER_W = CONTENT_W - PAD * 2 - 2   // usable text width inside box

    // Pre-calculate: pick the largest size where every line fits
    let size = BASE
    for (const line of lines) {
        if (!line) continue
        const isLabel = line.startsWith('>>>')
        const txt     = isLabel ? line.slice(3).trim() : line
        const f       = isLabel ? fonts.bold : fonts.mono
        // Binary-search a size where this line fits (min 6.5)
        let s = size
        while (s > 6.5 && f.widthOfTextAtSize(sanitise(txt), s) > INNER_W) s -= 0.25
        if (s < size) size = s
    }

    const lineH  = size + 3.5
    const blockH = lines.reduce((h, l) => h + (l === '' ? lineH / 2 : lineH), 0) + PAD * 2

    ensureSpace(blockH + (label ? 18 : 6) + 6)
    y -= 6

    if (label) {
        currentPage.drawText(sanitise(label), { x: ML, y, size: 7.5, font: fonts.bold, color: labelColor })
        y -= 11
    }

    currentPage.drawRectangle({
        x: ML, y: y - blockH + PAD, width: CONTENT_W, height: blockH,
        color: UIBG, borderColor: UIBR, borderWidth: 1,
    })
    y -= PAD

    for (const line of lines) {
        if (line === '') { y -= lineH / 2; continue }
        const isLabel = line.startsWith('>>>')
        const txt     = isLabel ? line.slice(3).trim() : line
        const f       = isLabel ? fonts.bold : fonts.mono
        const color   = isLabel ? ACCENT : CODEFG
        currentPage.drawText(sanitise(txt), { x: ML + PAD, y, size, font: f, color })
        y -= lineH
    }
    y -= PAD + 4
}

// ── Callout box ───────────────────────────────────────────────────────────────
function callout(text, { bg = INFOBG, border = INFOBR, label = 'NOTE' } = {}) {
    const size  = 9
    const lineH = size + 4
    const pad   = 8
    const xText = ML + pad + 8
    const textW = CONTENT_W - pad * 2 - 8
    const lines = wrapText(text, fonts.regular, size, textW)
    // +1 line for the label row (drawn separately to avoid overflow)
    const blockH = (1 + lines.length) * lineH + pad * 2
    ensureSpace(blockH + 12)
    y -= 4
    currentPage.drawRectangle({ x: ML, y: y - blockH + pad, width: CONTENT_W, height: blockH, color: bg, borderColor: border, borderWidth: 1 })
    currentPage.drawRectangle({ x: ML, y: y - blockH + pad, width: 4, height: blockH, color: border })
    y -= pad
    // Label on its own line — prevents overflow when label + wrapped line exceeds CONTENT_W
    currentPage.drawText(sanitise(label + ':'), { x: xText, y, size, font: fonts.bold, color: CODEFG })
    y -= lineH
    for (const line of lines) {
        currentPage.drawText(sanitise(line), { x: xText, y, size, font: fonts.regular, color: CODEFG })
        y -= lineH
    }
    y -= pad + 4
}

// ── Table with wrapping cells and variable row heights ────────────────────────
function table(headers, rows, colWidths) {
    const scale = CONTENT_W / colWidths.reduce((a, b) => a + b, 0)
    const sw    = colWidths.map(w => w * scale)
    const PAD   = 5
    const SIZE  = 8.5
    const LH    = SIZE + 3.5

    // Pre-wrap every cell
    const wrapped = rows.map(row =>
        row.map((cell, c) => wrapText(cell || '', fonts.regular, SIZE, sw[c] - PAD * 2))
    )
    const rowHeights = wrapped.map(row =>
        Math.max(1, ...row.map(lines => lines.length)) * LH + PAD * 2
    )
    const HEADER_H = LH + PAD * 2

    // Draw header — new page if it + first data row won't fit
    ensureSpace(HEADER_H + (rowHeights[0] ?? 0) + 8)
    y -= 4

    let xOff = ML
    for (let c = 0; c < headers.length; c++) {
        currentPage.drawRectangle({ x: xOff, y: y - HEADER_H + PAD, width: sw[c], height: HEADER_H, color: HEADBG })
        currentPage.drawText(sanitise(headers[c]), { x: xOff + PAD, y: y - PAD, size: SIZE, font: fonts.bold, color: HEADFG })
        xOff += sw[c]
    }
    y -= HEADER_H

    for (let r = 0; r < rows.length; r++) {
        const rh     = rowHeights[r]
        const rowBg  = r % 2 === 1 ? ROWALT : WHITE
        ensureSpace(rh + 4)

        xOff = ML
        for (let c = 0; c < sw.length; c++) {
            currentPage.drawRectangle({ x: xOff, y: y - rh + PAD, width: sw[c], height: rh, color: rowBg, borderColor: BORDER, borderWidth: 0.4 })
            let cellY = y - PAD
            for (const line of wrapped[r][c]) {
                currentPage.drawText(line, { x: xOff + PAD, y: cellY, size: SIZE, font: fonts.regular, color: BLACK })
                cellY -= LH
            }
            xOff += sw[c]
        }
        y -= rh
    }
    y -= 8
}

// ── Page footer ───────────────────────────────────────────────────────────────
function pageFooter(n) {
    const p = pages[pages.length - 1]
    p.drawLine({ start: { x: ML, y: MB + 14 }, end: { x: PAGE_W - MR, y: MB + 14 }, thickness: 0.5, color: BORDER })
    p.drawText('TeamVault -- Geofencing Admin Guide -- Confidential', { x: ML, y: MB, size: 7.5, font: fonts.regular, color: LIGHT })
    p.drawText('Page ' + n, { x: PAGE_W - MR - 32, y: MB, size: 7.5, font: fonts.regular, color: LIGHT })
}

// ═════════════════════════════════════════════════════════════════════════════
// CONTENT
// ═════════════════════════════════════════════════════════════════════════════

async function main() {
    pdfDoc = await PDFDocument.create()
    pages  = []
    fonts  = {
        regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
        bold:    await pdfDoc.embedFont(StandardFonts.HelveticaBold),
        mono:    await pdfDoc.embedFont(StandardFonts.Courier),
    }

    // ── Cover ─────────────────────────────────────────────────────────────────
    newPage()
    currentPage.drawRectangle({ x: 0, y: PAGE_H - 120, width: PAGE_W, height: 120, color: HEADBG })
    currentPage.drawText('TeamVault', { x: ML, y: PAGE_H - 55, size: 28, font: fonts.bold, color: WHITE })
    currentPage.drawText('Admin Guide', { x: ML, y: PAGE_H - 82, size: 18, font: fonts.regular, color: rgb(0.75, 0.85, 1.0) })

    y = PAGE_H - 158
    drawText('Geofencing: Complete Admin Walkthrough', { size: 20, font: fonts.bold, color: ACCENT })
    y -= 28
    currentPage.drawLine({ start: { x: ML, y }, end: { x: ML + CONTENT_W, y }, thickness: 1, color: BORDER })
    y -= 18

    paragraph('This guide explains how to set up and manage workspace geofencing in TeamVault. Geofencing lets administrators restrict vault access by country, configure email bypass codes for approved exceptions, and set per-user overrides -- all from the admin panel.', { size: 10.5, color: GREY })
    y -= 16

    h2('Contents')
    const toc = [
        ['1', 'Overview & How Geofencing Works'],
        ['2', 'Navigate to the Admin Panel & Settings Tab'],
        ['3', 'Enable Geofencing'],
        ['4', 'Add Allowed Countries with the Country Picker'],
        ['5', 'Enable Email Bypass Codes (Workspace-Level)'],
        ['6', 'Per-User Permissions (Users Tab)'],
        ['7', 'What the Blocked User Sees'],
        ['8', 'Audit Log -- Geo Events'],
        ['9', 'Quick-Reference: All Controls & Config Flags'],
    ]
    for (const [n, title] of toc) {
        ensureSpace(16)
        currentPage.drawText(n + '.', { x: ML + 8, y, size: 9.5, font: fonts.bold, color: ACCENT })
        currentPage.drawText(title,   { x: ML + 30, y, size: 9.5, font: fonts.regular, color: BLACK })
        y -= 14
    }
    y -= 20
    callout('This guide assumes you are logged in to TeamVault with the admin role for the workspace you want to configure. Member-role users do not see the Admin panel.', { label: 'PREREQUISITE' })
    pageFooter(1)

    // ── Page 2: Overview ──────────────────────────────────────────────────────
    newPage()
    h1('1. Overview & How Geofencing Works')
    gap()

    paragraph('TeamVault geofencing restricts vault access based on the geographic location of the user\'s IP address. When a workspace has geofencing enabled, any user whose IP resolves to a country not on the allowlist is blocked before they can view any files.')
    gap(8)

    h2('Access Decision Flow')
    paragraph('Every vault page request is evaluated in this order:', { size: 9.5, color: GREY })
    gap(4)

    numberedItem(1, 'Is geofencing enabled for this workspace?  No -> allow access.', { size: 9 })
    numberedItem(2, 'Is the user an admin AND admin immunity is on?  Yes -> allow unconditionally.', { size: 9 })
    numberedItem(3, 'Is the allowed-country list empty?  Yes -> allow (no restrictions configured).', { size: 9 })
    numberedItem(4, 'Does a cached geo-ok session cookie exist?  Yes -> allow (fast path, no DB hit).', { size: 9 })
    numberedItem(5, 'Perform GeoIP lookup on the user\'s IP (ipapi.co, 2-second timeout).', { size: 9 })
    numberedItem(6, 'Is the country in the workspace allowlist?  Yes -> allow and cache result.', { size: 9 })
    numberedItem(7, 'Is the country in the user\'s personal override list?  Yes -> allow and cache.', { size: 9 })
    numberedItem(8, 'Does the user have a valid bypass cookie from an emailed code?  Yes -> allow.', { size: 9 })
    numberedItem(9, 'None of the above -- BLOCK. Redirect user to the geo-blocked page.', { size: 9 })
    gap(6)

    callout('Admin users are exempt from geofencing by default (GEOFENCING_ADMIN_IMMUNE = true in config.ts). This prevents admins from locking themselves out when testing country restrictions.', { label: 'ADMIN IMMUNITY', bg: OKBG, border: OKBR })

    h2('Key Concepts')
    table(
        ['Concept', 'Description'],
        [
            ['Allowlist',        'The set of country codes permitted to access this workspace.'],
            ['Country Code',     'ISO 3166-1 alpha-2 code (two uppercase letters): US, GB, AU, CA.'],
            ['Bypass Code',      'One-time 8-character code emailed to a blocked user, valid 5 minutes.'],
            ['User Override',    'A per-user country list that supplements the workspace allowlist.'],
            ['Geo-ok Cookie',    'Session cookie caching an approved geo result to avoid repeat lookups.'],
            ['Bypass Cookie',    'Signed HttpOnly cookie issued after a valid bypass code is entered.'],
        ],
        [110, 381]
    )
    gap(4)
    callout('GeoIP resolution is best-effort. Private IP ranges (10.x, 192.168.x, 127.x) and local development environments always pass through. If the GeoIP service is unreachable within 2 seconds the user is also allowed through.', { label: 'NOTE' })

    pageFooter(2)

    // ── Page 3: Navigate + Enable ─────────────────────────────────────────────
    newPage()
    h1('2 & 3. Navigate to Settings, Then Enable Geofencing')
    gap()

    stepBanner(1, 'Open the Admin Panel')
    gap(4)
    paragraph('Geofencing is configured in the workspace admin panel. Only users with the admin role can see and modify these settings.')
    gap(6)

    h3('How to reach the admin panel')
    numberedItem(1, 'Sign in to TeamVault and confirm you are viewing the correct workspace in the sidebar heading.')
    numberedItem(2, 'Click "Admin" in the left sidebar navigation. It is only visible to admin-role members.')
    numberedItem(3, 'The admin panel opens showing several tabs across the top.')
    gap(6)

    uiBox([
        '>>> Sidebar Navigation',
        '  Files',
        '  Shared with me',
        '  Recycle Bin',
        '  [Admin]   <-- click this link',
    ], { label: 'Sidebar -- left navigation panel' })

    h3('Admin panel tabs')
    table(
        ['Tab', 'Purpose'],
        [
            ['Users',    'Invite members, change roles, set upload permission, configure per-user geo overrides.'],
            ['Groups',   'Create groups and assign members for folder-level access control.'],
            ['Settings', 'Rename workspace, manage billing, configure geofencing (this is the tab you need).'],
            ['Audit Log','View all workspace activity including geo block and bypass events.'],
        ],
        [65, 426]
    )
    gap(8)

    stepBanner(2, 'Enable Geofencing')
    gap(4)
    paragraph('On the Settings tab, scroll down past Workspace Name and Billing to reach the Geofencing section.')
    gap(6)

    h3('Locating the Geofencing section')
    numberedItem(1, 'Click the "Settings" tab in the admin panel.')
    numberedItem(2, 'Scroll past "Workspace Name" and "Billing & Subscription".')
    numberedItem(3, 'The "Geofencing" section appears with a horizontal divider above it.')
    gap(6)

    uiBox([
        '>>> Settings Tab -- Geofencing Section',
        '',
        '  [ ] Enable geofencing for this workspace     <- checkbox',
        '',
        '  (Allowed Countries and bypass options appear only when enabled)',
        '',
        '  [Save Geofencing]',
    ], { label: 'Admin > Settings tab -- Geofencing section (collapsed)' })

    h3('Enabling geofencing')
    numberedItem(1, 'Check the "Enable geofencing for this workspace" checkbox. The Allowed Countries picker and bypass checkbox immediately appear below.')
    numberedItem(2, 'Do NOT click Save yet -- add at least one country first (Step 3 on the next page). Saving with an empty allowlist while geofencing is on is valid but has no blocking effect.')
    gap(4)
    callout('Saving with geofencing enabled and zero countries in the allowlist means all users continue to have access. The restriction only activates once at least one country is added to the allowlist.', { label: 'IMPORTANT', bg: WARNBG, border: WARNBR })

    pageFooter(3)

    // ── Page 4: Adding Countries ───────────────────────────────────────────────
    newPage()
    h1('4. Add Allowed Countries with the Country Picker')
    gap()

    stepBanner(3, 'Add Allowed Countries')
    gap(6)

    paragraph('Once geofencing is enabled the "Allowed Countries" picker appears. It is a searchable dropdown with flag emojis. Countries you add are the ONLY countries that can access this workspace.')
    gap(8)

    h2('Using the Country Picker')

    h3('Search and add a country')
    numberedItem(1, 'Click the search field (shows a magnifying glass icon and placeholder "Search countries to add...").')
    numberedItem(2, 'Type a country name (e.g. "United") or its ISO code (e.g. "US", "GB"). The list filters in real time.')
    numberedItem(3, 'Click the desired country row. It is immediately added as a coloured tag above the search field.')
    numberedItem(4, 'Repeat for each additional country. There is no limit on the number of allowed countries.')
    numberedItem(5, 'If only one country matches your search, press Enter to add it without clicking.')
    gap(6)

    uiBox([
        '>>> Allowed Countries Picker -- example with three countries selected',
        '',
        '  [US United States x]  [GB United Kingdom x]  [CA Canada x]',
        '',
        '  [search icon]  Search countries to add...',
        '',
        '  +----------------------------------------------+',
        '  |  [flag]  Australia                      AU   |',
        '  |  [flag]  Austria                        AT   |',
        '  |  [flag]  Azerbaijan                     AZ   |',
        '  +----------------------------------------------+  <- scrollable, 200+ countries',
    ], { label: 'Admin > Settings > Geofencing -- Allowed Countries picker' })

    h3('Remove a country')
    bullet('Click the "x" on any country tag (to the right of the country name) to remove it.')
    bullet('The removal takes effect when you click "Save Geofencing".')
    gap(8)

    h2('Country Code Reference -- Common Examples')
    table(
        ['Country', 'Code', 'Country', 'Code', 'Country', 'Code'],
        [
            ['United States',    'US', 'Australia',           'AU', 'Japan',         'JP'],
            ['United Kingdom',   'GB', 'New Zealand',         'NZ', 'Singapore',     'SG'],
            ['Canada',           'CA', 'Germany',             'DE', 'UAE',           'AE'],
            ['Ireland',          'IE', 'France',              'FR', 'India',         'IN'],
            ['Netherlands',      'NL', 'Sweden',              'SE', 'Brazil',        'BR'],
        ],
        [115, 35, 115, 35, 115, 35]
    )
    gap(4)
    paragraph('The full list of 200+ countries is searchable in the picker. All codes are ISO 3166-1 alpha-2 (two uppercase letters).', { size: 9, color: GREY })
    gap(8)

    h2('Saving the Configuration')
    numberedItem(1, 'After adding countries, click "Save Geofencing". A green confirmation "Geofencing settings saved" appears.')
    numberedItem(2, 'Settings are immediately active. Users from unlisted countries will be blocked on their next page load.')
    gap(4)
    callout('Existing browser sessions with a cached geo-ok cookie are not immediately invalidated. For instant enforcement, ask affected users to sign out and sign back in.', { label: 'SESSION NOTE' })

    pageFooter(4)

    // ── Page 5: Bypass Codes ───────────────────────────────────────────────────
    newPage()
    h1('5. Enable Email Bypass Codes (Workspace-Level)')
    gap()

    stepBanner(4, 'Allow Blocked Users to Request an Email Bypass Code')
    gap(6)

    paragraph('Bypass codes are optional. When enabled, a blocked user can click "Send Bypass Code" on the block page to receive a one-time 8-character code by email. If entered correctly within 5 minutes, they are granted temporary access.')
    gap(8)

    h2('Workspace-Level Bypass Checkbox')
    paragraph('The bypass option appears below the Allowed Countries picker when geofencing is enabled.', { size: 9.5 })
    gap(6)

    uiBox([
        '>>> Settings Tab -- Geofencing Section (expanded)',
        '',
        '  [v] Enable geofencing for this workspace',
        '',
        '  Allowed Countries',
        '  [US United States x]  [GB United Kingdom x]',
        '  [search icon]  Search countries to add...',
        '',
        '  [ ] Allow blocked users to request an emailed bypass code  <- checkbox',
        '',
        '      Codes are valid for 5 minutes, single-use.',
        '      Individual users can be overridden in the Users tab.',
        '',
        '  [Save Geofencing]',
    ], { label: 'Admin > Settings > Geofencing -- bypass code checkbox' })

    numberedItem(1, 'Check "Allow blocked users to request an emailed bypass code".')
    numberedItem(2, 'Click "Save Geofencing".')
    numberedItem(3, 'All workspace members who are geo-blocked can now request a bypass code on the block page.')
    gap(8)

    h2('How the Bypass Code Process Works (End-to-End)')
    table(
        ['Step', 'Actor',  'What Happens'],
        [
            ['1', 'User',   'Request is geo-blocked. User is redirected to /geo-blocked.'],
            ['2', 'User',   'Block page shows their IP, detected country, and region.'],
            ['3', 'User',   'User clicks "Send Bypass Code" button on the block page.'],
            ['4', 'System', 'TeamVault generates a random 8-character code, hashes it (SHA-256), and stores only the hash. The plain code is emailed via Resend.'],
            ['5', 'Email',  'User receives an email with subject "Your TeamVault access code for [Workspace Name]". Code shown in large monospace text.'],
            ['6', 'User',   'User types the code into the input field on the block page and clicks "Verify Code".'],
            ['7', 'System', 'Hash of submitted code is compared to stored hash. On match: code marked used, signed 5-minute bypass cookie set (HttpOnly).'],
            ['8', 'User',   'User is redirected to the vault page they originally requested. Access granted.'],
        ],
        [25, 52, 414]
    )
    gap(4)
    callout('The plain bypass code is NEVER stored in the database or written to any log. Only the SHA-256 hash is persisted. The audit log records that a code was sent (recipient email and expiry) but never the code value itself.', { label: 'SECURITY', bg: OKBG, border: OKBR })

    gap(6)
    h2('Bypass Code Limits')
    table(
        ['Parameter',         'Value',   'Notes'],
        [
            ['Code length',       '8 chars', 'Unambiguous charset -- no 0/O/1/I/l to avoid misreading.'],
            ['Validity window',   '5 min',   'Configurable in config.ts: GEOFENCE_BYPASS_CODE_TTL_SECONDS.'],
            ['Max attempts',      '3',       'Configurable in config.ts: GEOFENCE_BYPASS_MAX_ATTEMPTS.'],
            ['Single-use',        'Yes',     'Code is voided after the first successful entry.'],
            ['One active at a time', 'Yes',  'Requesting a new code automatically voids any previous unused code.'],
        ],
        [125, 60, 306]
    )

    pageFooter(5)

    // ── Page 6: Per-User Permissions ───────────────────────────────────────────
    newPage()
    h1('6. Per-User Permissions (Users Tab)')
    gap()

    stepBanner(5, 'Configure Per-User Geo Overrides')
    gap(6)

    paragraph('Sometimes individual users need different geo rules than the workspace default -- a contractor working temporarily from a restricted country, or a VIP user who should always have bypass access.')
    gap(8)

    h2('Opening the Geo Override Modal')
    numberedItem(1, 'Click the "Users" tab in the admin panel.')
    numberedItem(2, 'Find the user in the Members table.')
    numberedItem(3, 'Click the "Geo" button in the Geo column of that user\'s row.')
    numberedItem(4, 'The "Geo Override" modal opens for that specific user.')
    gap(6)

    uiBox([
        '>>> Users Tab -- Members Table (Geo column highlighted)',
        '',
        '  Name         Email                 Role   Upload  Status  Geo       Action',
        '  -----------------------------------------------------------------------',
        '  Jane Smith   jane@example.com      User   Yes     Active  [Geo]     [Disable]',
        '  Bob Chen     bob@example.com       Admin  Yes     Active  [Geo]     [Disable]',
        '  Sara Lee     sara@example.com      User   No      Active  [Geo]     [Disable]',
        '',
        '  [Geo] opens the per-user geo override modal for that row',
    ], { label: 'Admin > Users tab -- Members table with Geo column' })

    gap(6)
    h2('The Geo Override Modal')

    uiBox([
        '>>> Geo Override -- Jane Smith (jane@example.com)',
        '',
        '  Country Override',
        '  [search icon]  Search countries to add...',
        '  (empty = use workspace allowlist only)',
        '',
        '  Bypass Code Permission',
        '  [Dropdown v]  Inherit workspace default',
        '                -- Inherit workspace default',
        '                -- Allow bypass codes for this user',
        '                -- Deny bypass codes for this user',
        '',
        '  [Cancel]   [Save]',
    ], { label: 'Admin > Users tab > Geo Override modal' })

    gap(6)
    h2('Country Override Field')
    paragraph('This field works identically to the workspace country picker. Any countries you add here are ADDITIONAL allowed countries for this user only.', { size: 9.5 })
    gap(4)
    bullet('Example: Workspace allows US, GB, CA. Contractor Jane works from France (FR). Add FR to her Country Override. Jane can now access from France even though FR is not in the workspace allowlist.')
    bullet('The workspace allowlist still applies -- Jane also retains access from US, GB, and CA.')
    bullet('Leave Country Override empty to apply only the workspace allowlist to this user.')
    gap(8)

    h2('Bypass Code Permission Dropdown')
    paragraph('Controls whether this specific user can request emailed bypass codes. Three options:', { size: 9.5 })
    gap(4)
    table(
        ['Option', 'Meaning'],
        [
            ['Inherit workspace default',         'User follows the workspace-level bypass setting. If bypass is enabled workspace-wide, this user can request codes; if disabled, they cannot.'],
            ['Allow bypass codes for this user',  'This user CAN request bypass codes regardless of the workspace setting. Useful for travellers or remote workers who need occasional exceptions.'],
            ['Deny bypass codes for this user',   'This user CANNOT request bypass codes even if the workspace has bypass enabled. Use for high-security accounts that must never have exceptions.'],
        ],
        [148, 343]
    )
    gap(4)
    callout('Per-user settings take priority over the workspace default. If the workspace has bypass disabled but you set "Allow bypass codes for this user" for a specific member, that member alone can still request codes.', { label: 'PRIORITY RULE' })

    gap(6)
    numberedItem(1, 'Configure Country Override and Bypass Code Permission, then click "Save".')
    numberedItem(2, 'A green "Saved" confirmation appears in the modal.')
    numberedItem(3, 'The override takes effect immediately on the user\'s next vault page load.')

    pageFooter(6)

    // ── Page 7: User Experience ────────────────────────────────────────────────
    newPage()
    h1('7. What the Blocked User Sees')
    gap()

    paragraph('When a user\'s IP is geo-blocked, they are redirected to /geo-blocked -- a clean informational page showing their location details and (when enabled) the bypass code flow.')
    gap(6)

    h2('Block Page Layout')
    uiBox([
        '>>> /geo-blocked -- blocked user view',
        '',
        '  +--------------------------------------------------+',
        '  |               [Lock Icon]                        |',
        '  |           Access Restricted                      |',
        '  |  Your location is not permitted to access        |',
        '  |  this workspace.                                 |',
        '  |                                                  |',
        '  |  Your IP         203.0.113.42                    |',
        '  |  Location        Sydney, New South Wales         |',
        '  |  Country code    AU                              |',
        '  |                                                  |',
        '  |  A one-time code can be sent to user@email.com.  |',
        '  |  The code is valid for 5 minutes.                |',
        '  |                                                  |',
        '  |       [ Send Bypass Code ]  <- button            |',
        '  |                                                  |',
        '  |                Sign out                          |',
        '  +--------------------------------------------------+',
    ], { label: '/geo-blocked page -- initial state' })

    gap(4)
    paragraph('After requesting a code, the page updates to show a code entry field:', { size: 9.5, color: GREY })
    gap(4)

    uiBox([
        '>>> /geo-blocked -- code entry state',
        '',
        '  A bypass code has been sent to your email. Enter it below:',
        '',
        '  +----------------------------+',
        '  |   A B C D  1 2 3 4         |  <- monospace, centered',
        '  +----------------------------+',
        '',
        '  [ Verify Code ]   <- disabled until 6+ characters entered',
        '',
        '  Resend code       <- link (voids previous code, generates a new one)',
    ], { label: '/geo-blocked page -- code entry state' })

    gap(6)
    h2('After Successful Bypass')
    bullet('User is automatically redirected to the vault page they originally requested.')
    bullet('A signed HttpOnly bypass cookie is set in their browser (5-minute expiry).')
    bullet('During those 5 minutes the user can navigate freely within the vault.')
    bullet('After 5 minutes the bypass cookie expires. The next vault page load triggers a fresh geo check and the user will need to request another code if still from a blocked country.')
    gap(6)

    h2('Error States')
    table(
        ['Error Message', 'Cause', 'Resolution'],
        [
            ['Invalid code. Please check and try again.',
             'Wrong code entered (attempts remaining).',
             'Re-check the email and try again.'],
            ['Too many incorrect attempts. Request a new code.',
             'Entered wrong code 3 times -- code locked.',
             'Click "Resend code" to generate a new one.'],
            ['Code has expired. Please request a new one.',
             'Code is older than 5 minutes.',
             'Click "Resend code" to get a fresh code.'],
        ],
        [155, 135, 201]
    )

    pageFooter(7)

    // ── Page 8: Audit Log ──────────────────────────────────────────────────────
    newPage()
    h1('8. Audit Log -- Geo Events')
    gap()

    paragraph('All geofencing activity is recorded in the workspace Audit Log. Go to Admin > Audit Log. Click any row or its "..." button to expand full event details.')
    gap(8)

    h2('Geo Event Types')
    table(
        ['Event', 'When It Fires', 'What Is Logged'],
        [
            ['GEO_BLOCK',          'User\'s IP is geo-blocked and redirected.',         'IP address, country code, country name, region, city.'],
            ['GEO_BYPASS_SENT',    'User clicks "Send Bypass Code" and code is emailed.','Recipient email, code expiry time. Code value is never logged.'],
            ['GEO_BYPASS_SUCCESS', 'User enters the correct bypass code.',               'IP address at time of verification.'],
            ['GEO_BYPASS_FAIL',    'User enters wrong, expired, or locked code.',        'Failure reason (invalid_code / expired / locked), IP, attempt count.'],
        ],
        [110, 148, 233]
    )
    gap(8)

    h2('Reading the Audit Log Table')
    paragraph('Each geo event appears in the Object / Detail column of the audit log table:', { size: 9.5 })
    gap(4)

    uiBox([
        '>>> Admin > Audit Log -- geo event rows',
        '',
        '  Time              Action             Result   Actor           Detail',
        '  ----------------------------------------------------------------------',
        '  Apr 9 14:22 UTC   GEO_BLOCK          denied   jane@corp.com   [globe] Australia AU',
        '  Apr 9 14:23 UTC   GEO_BYPASS_SENT    allowed  jane@corp.com   [mail] Code sent to jane@corp.com',
        '  Apr 9 14:24 UTC   GEO_BYPASS_SUCCESS allowed  jane@corp.com   [check] Bypass OK from 203.0.113.42',
        '  Apr 9 14:30 UTC   GEO_BLOCK          denied   bob@corp.com    [globe] Germany DE',
        '  Apr 9 14:31 UTC   GEO_BYPASS_FAIL    denied   bob@corp.com    [x] invalid_code 198.51.100.7',
    ], { label: 'Admin > Audit Log -- geo event rows' })

    gap(6)
    h2('Event Detail Modal')
    paragraph('Click any row to open the Audit Event Details modal. For geo events it shows:', { size: 9.5 })
    gap(4)

    uiBox([
        '>>> Audit Event Details modal -- GEO_BLOCK example',
        '',
        '  Event',
        '    Time      Wed, 09 Apr 2026 14:22:00 GMT',
        '    Action    GEO_BLOCK',
        '    Result    denied',
        '',
        '  Identity',
        '    Actor     Jane Smith -- jane@corp.com',
        '    User ID   a1b2c3d4',
        '',
        '  Network  (shown for GEO_BLOCK, GEO_BYPASS_SUCCESS, GEO_BYPASS_FAIL)',
        '    IP Address   203.0.113.42',
        '    Country      Australia',
        '    Country Code AU',
        '    Region       New South Wales',
        '    City         Sydney',
        '',
        '  Bypass Code  (shown for GEO_BYPASS_SENT only)',
        '    Sent To      jane@corp.com',
        '    Expires At   Wed, 09 Apr 2026 14:27:00 GMT',
        '',
        '  Failure Details  (shown for GEO_BYPASS_FAIL only)',
        '    Reason     invalid_code',
        '    Attempts   2',
    ], { label: 'Audit Event Details modal -- geo event example' })

    pageFooter(8)

    // ── Page 9: Quick Reference ────────────────────────────────────────────────
    newPage()
    h1('9. Quick-Reference: All Controls & Config Flags')
    gap()

    h2('Settings Tab -- Geofencing Controls')
    table(
        ['Control', 'Type', 'Description'],
        [
            ['Enable geofencing for this workspace',           'Checkbox', 'Master on/off. When unchecked all other geo settings are ignored.'],
            ['Allowed Countries picker',                       'Multi-select', 'Searchable flag list. Selected countries are the only countries with vault access.'],
            ['Allow blocked users to request bypass code',     'Checkbox', 'Workspace-wide default. Enables the "Send Bypass Code" button for all blocked members (unless overridden per user).'],
            ['Save Geofencing',                                'Button',   'Persists all three settings above. Shows a green confirmation on success.'],
        ],
        [165, 70, 256]
    )
    gap(6)

    h2('Users Tab -- Geo Override Modal Controls')
    table(
        ['Control', 'Type', 'Description'],
        [
            ['"Geo" button in Members table',  'Button',           'Opens the Geo Override modal for that specific user.'],
            ['Country Override picker',         'Multi-select',     'Countries that extend the workspace allowlist for this user only. Leave empty to apply the workspace allowlist exclusively.'],
            ['Bypass Code Permission dropdown', 'Dropdown (3 opts)','Inherit workspace default / Allow for this user / Deny for this user.'],
            ['Save (in modal)',                 'Button',           'Saves per-user overrides immediately.'],
        ],
        [130, 105, 256]
    )
    gap(6)

    h2('config.ts Flags (require code deployment to change)')
    table(
        ['Constant',                         'Default', 'Purpose'],
        [
            ['GEOFENCING_ENABLED',              'true',  'Global kill-switch. Set false to disable all geofencing without touching the database.'],
            ['GEOFENCING_ADMIN_IMMUNE',          'true',  'When true, admin-role members bypass all country restrictions unconditionally.'],
            ['GEOFENCE_BYPASS_CODE_TTL_SECONDS', '300',   'Seconds a bypass code and its resulting bypass cookie remain valid (default 5 minutes).'],
            ['GEOFENCE_BYPASS_CODE_LENGTH',      '8',     'Number of characters in each generated bypass code.'],
            ['GEOFENCE_BYPASS_MAX_ATTEMPTS',     '3',     'Maximum failed code entries before the code is locked and a new one must be requested.'],
        ],
        [178, 52, 261]
    )
    gap(6)

    h2('Common Scenarios')
    table(
        ['Scenario', 'What to Do'],
        [
            ['Allow only US and Canada',
             'Settings > Allowed Countries: add US and CA. Save Geofencing.'],
            ['Contractor works temporarily from France',
             'Users > find user > Geo button > Country Override: add FR. Save.'],
            ['Give one user bypass access without enabling it workspace-wide',
             'Settings: bypass checkbox OFF. Users > user > Geo > Bypass Permission: Allow for this user. Save.'],
            ['Prevent a specific user from ever getting a bypass code',
             'Users > user > Geo > Bypass Permission: Deny for this user. This overrides a workspace-wide bypass-enabled setting.'],
            ['Disable geofencing temporarily for maintenance',
             'Settings: uncheck "Enable geofencing". Save. Re-enable when done.'],
            ['Admin is locked out while testing',
             'Admins are always exempt (GEOFENCING_ADMIN_IMMUNE = true). Lockout is not possible for the admin role.'],
        ],
        [180, 311]
    )

    gap(8)
    callout('When diagnosing unexpected blocks, start with the Audit Log. The GEO_BLOCK events show the exact IP address and detected country, making it straightforward to identify whether the issue is a misconfigured allowlist or a genuine location restriction.', { label: 'SUPPORT TIP', bg: INFOBG, border: INFOBR })

    pageFooter(9)

    // ── Write ──────────────────────────────────────────────────────────────────
    const bytes = await pdfDoc.save()
    writeFileSync(OUTPUT, bytes)
    console.log('Written:', OUTPUT)
}

main().catch(e => { console.error(e); process.exit(1) })
