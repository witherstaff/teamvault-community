import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { readFileSync } from 'fs'
import { join } from 'path'

// Palette
const NAVY = rgb(0.055, 0.082, 0.137)   // header / footer bg
const WHITE = rgb(1, 1, 1)
const GREY = rgb(0.55, 0.58, 0.63)      // label text
const BODY = rgb(0.08, 0.12, 0.20)      // content area bg
const ACCENT = rgb(0.22, 0.49, 0.96)      // section header + rule

export interface WatermarkFields {
    filename: string
    folderPath: string | null
    workspaceName: string
    workspaceId: string
    email: string
    timestamp: string
    ip: string
    sessionId: string
    fileChecksum: string
}

/**
 * Prepends a branded cover page to the PDF containing all watermark fields.
 * The original pages become pages 2, 3, … — completely untouched.
 *
 * @param pdfBytes - Raw bytes of the original PDF
 * @param fields   - Structured watermark fields to display on the cover page
 */
export async function watermarkPdf(
    pdfBytes: Uint8Array,
    fields: WatermarkFields,
): Promise<Uint8Array> {
    const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })

    // Embed fonts
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
    const fontNormal = await doc.embedFont(StandardFonts.Helvetica)

    // Embed the TeamVault logo PNG (non-fatal if missing)
    let logoImage: Awaited<ReturnType<typeof doc.embedPng>> | undefined
    try {
        const logoPath = join(process.cwd(), 'public', 'images', 'teamvault-shield-name.png')
        const logoBytes = readFileSync(logoPath)
        logoImage = await doc.embedPng(logoBytes)
    } catch {
        // Logo not found — render without it
    }

    // Use the original page 1 width; force A4 height for the cover
    const origPage = doc.getPage(0)
    const { width: pageW } = origPage.getSize()
    const pageH = 842  // A4

    // Insert blank cover at index 0 (shifts originals to 1, 2, …)
    const cover = doc.insertPage(0)
    cover.setSize(pageW, pageH)

    // ── Background ───────────────────────────────────────────────────
    cover.drawRectangle({ x: 0, y: 0, width: pageW, height: pageH, color: BODY })

    // ── Header bar ───────────────────────────────────────────────────
    const headerH = 80
    const headerY = pageH - headerH
    cover.drawRectangle({ x: 0, y: headerY, width: pageW, height: headerH, color: NAVY })

    // Logo — left-aligned, vertically centred in header
    if (logoImage) {
        const dims = logoImage.scaleToFit(160, 46)
        cover.drawImage(logoImage, {
            x: 24,
            y: headerY + (headerH - dims.height) / 2,
            width: dims.width,
            height: dims.height,
        })
    }

    // "CONFIDENTIAL — VERIFIED DOWNLOAD" — right-aligned in header
    const titleText = 'CONFIDENTIAL \u2014 VERIFIED DOWNLOAD'
    const titleSize = 8.5
    const titleW = fontBold.widthOfTextAtSize(titleText, titleSize)
    cover.drawText(titleText, {
        x: pageW - titleW - 24,
        y: headerY + (headerH - titleSize) / 2,
        size: titleSize,
        font: fontBold,
        color: rgb(0.68, 0.75, 0.88),
    })

    // ── Content layout helpers ────────────────────────────────────────
    const padH = 44          // horizontal padding
    const labelColW = 172    // label column width
    const contentX = padH
    const valueX = padH + labelColW
    const valueMaxW = pageW - padH - labelColW

    let y = headerY - 36

    function drawSectionHeader(title: string) {
        cover.drawText(title, {
            x: contentX, y,
            size: 7,
            font: fontBold,
            color: ACCENT,
        })
        y -= 4
        // Subtle rule
        cover.drawRectangle({
            x: contentX, y,
            width: pageW - padH * 2, height: 0.5,
            color: ACCENT,
            opacity: 0.3,
        })
        y -= 16
    }

    function drawRow(label: string, value: string) {
        const rowSize = 8.5

        cover.drawText(label, {
            x: contentX, y,
            size: rowSize,
            font: fontBold,
            color: GREY,
        })

        // Truncate value if it overflows the column
        let display = value
        while (display.length > 1 && fontNormal.widthOfTextAtSize(display, rowSize) > valueMaxW) {
            display = display.slice(0, -1)
        }
        if (display !== value) display += '\u2026'

        cover.drawText(display, {
            x: valueX, y,
            size: rowSize,
            font: fontNormal,
            color: WHITE,
            opacity: 0.88,
        })

        y -= 20
    }

    // ── FILE DETAILS ─────────────────────────────────────────────────
    drawSectionHeader('FILE DETAILS')
    drawRow('Source', 'TeamVault Secure Repository (TeamVault.cloud)')
    drawRow('Workspace', fields.workspaceName)
    drawRow('Workspace ID', fields.workspaceId)
    drawRow('File', fields.filename)
    drawRow('Folder', fields.folderPath ?? '\u2014')

    y -= 10

    // ── DOWNLOADER IDENTITY ──────────────────────────────────────────
    drawSectionHeader('DOWNLOADER IDENTITY')
    drawRow('Downloaded By', fields.email)
    drawRow('Timestamp', fields.timestamp)
    drawRow('IP Address', fields.ip)

    y -= 10

    // ── VERIFICATION ─────────────────────────────────────────────────
    drawSectionHeader('VERIFICATION')
    drawRow('Session ID', fields.sessionId)
    drawRow('File Checksum (SHA256)', fields.fileChecksum)

    y -= 12
    cover.drawText('This file contains verification metadata identifying the download session.', {
        x: contentX,
        y,
        size: 7.5,
        font: fontNormal,
        color: GREY,
    })

    // ── Footer bar ───────────────────────────────────────────────────
    const footerH = 28
    cover.drawRectangle({ x: 0, y: 0, width: pageW, height: footerH, color: NAVY })

    const footerText = 'This page was automatically generated by TeamVault  \u00B7  TeamVault.cloud'
    const footerSize = 7
    const footerW = fontNormal.widthOfTextAtSize(footerText, footerSize)
    cover.drawText(footerText, {
        x: (pageW - footerW) / 2,
        y: (footerH - footerSize) / 2 + 1,
        size: footerSize,
        font: fontNormal,
        color: GREY,
    })

    return doc.save()
}
