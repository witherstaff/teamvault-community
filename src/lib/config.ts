// ─────────────────────────────────────────────────────────────────
// TeamVault Community Edition — Universal Configuration
// Central source of truth for plans, limits, and app-wide settings.
// ─────────────────────────────────────────────────────────────────

// ── Storage Plans ────────────────────────────────────────────────

export type StoragePlan = {
    id: string
    name: string
    storageLimitBytes: number | null   // null = custom / unlimited
    storageLimitLabel: string
    priceMonthly: number | null        // null = contact sales, 0 = free
    priceLabel: string
    verifiedDownloadsPerMonth: number | null  // null = unlimited
    recycleBinRetentionDays: number | null    // null = indefinite (admin purge only)
    internal?: boolean                 // true = hidden from public pricing, master-admin only
}

export const STORAGE_PLANS: StoragePlan[] = [
    {
        id: 'team',
        name: 'Team',
        storageLimitBytes: 1024 * 1024 ** 3,  // 1 TB
        storageLimitLabel: '1 TB',
        priceMonthly: 25,
        priceLabel: '$25/mo',
        verifiedDownloadsPerMonth: 100,
        recycleBinRetentionDays: 30,
    },
    {
        id: 'pro',
        name: 'Pro',
        storageLimitBytes: 5 * 1024 ** 4,  // 5 TB
        storageLimitLabel: '5 TB',
        priceMonthly: 99,
        priceLabel: '$99/mo',
        verifiedDownloadsPerMonth: 500,
        recycleBinRetentionDays: 90,
    },
    {
        id: 'business',
        name: 'Business',
        storageLimitBytes: 8 * 1024 ** 4,    // 8 TB
        storageLimitLabel: '8 TB',
        priceMonthly: 199,
        priceLabel: '$199/mo',
        verifiedDownloadsPerMonth: 5000,
        recycleBinRetentionDays: 365,
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        storageLimitBytes: null,
        storageLimitLabel: 'Custom',
        priceMonthly: null,
        priceLabel: 'Contact Us',
        verifiedDownloadsPerMonth: null,
        recycleBinRetentionDays: null,
    },
    {
        id: 'custom',
        name: 'Custom',
        storageLimitBytes: null,
        storageLimitLabel: 'Custom',
        priceMonthly: null,
        priceLabel: 'Contact Sales',
        verifiedDownloadsPerMonth: 10000,
        recycleBinRetentionDays: null,
    },
    // ── Internal / Free Plans ────────────────────────────────────────
    // Not shown publicly. Created by master admins only.
    {
        id: 'internal',
        name: 'Internal',
        storageLimitBytes: 100 * 1024 ** 3,  // 100 GB
        storageLimitLabel: '100 GB',
        priceMonthly: 0,
        priceLabel: 'Free',
        verifiedDownloadsPerMonth: null,
        recycleBinRetentionDays: null,
        internal: true,
    },
    {
        id: 'internal-large',
        name: 'Internal Large',
        storageLimitBytes: 500 * 1024 ** 3,  // 500 GB
        storageLimitLabel: '500 GB',
        priceMonthly: 0,
        priceLabel: 'Free',
        verifiedDownloadsPerMonth: null,
        recycleBinRetentionDays: null,
        internal: true,
    },
]

export function getPlan(planId: string): StoragePlan {
    return STORAGE_PLANS.find(p => p.id === planId) ?? STORAGE_PLANS[0]
}

// ── App-wide Constants ───────────────────────────────────────────

export const APP_NAME = 'TeamVault'
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.teamvault.cloud'

// ── Master Admin Access ──────────────────────────────────────────
// Emails listed in MASTER_ADMIN_EMAILS env var (comma-separated) can access
// /master-admin (service-wide stats). All comparisons are case-insensitive.

export const MASTER_ADMIN_EMAILS: string[] = (
    process.env.MASTER_ADMIN_EMAILS || ''
).split(',')
    .map(e => e.trim())
    .filter(Boolean)

export function isMasterAdmin(email: string): boolean {
    return MASTER_ADMIN_EMAILS.some(e => e.toLowerCase() === email.toLowerCase())
}

// ── File Upload Limits ───────────────────────────────────────────

export const MAX_FILE_SIZE_BYTES = 5 * 1024 ** 3          // 5 GB per file
export const MAX_FILE_SIZE_LABEL = '5 GB'
export const ALLOWED_UPLOAD_TYPES: string[] = []           // empty = allow all
export const PRESIGNED_URL_EXPIRY_SECONDS = 900            // 15 min upload window
export const DOWNLOAD_URL_EXPIRY_SECONDS = 120             // 2 min download window

// ── Verified Downloads ───────────────────────────────────────────
// Only files whose extensions appear in this list are permitted
// inside the "Verified Downloads" folder and all of its sub-folders.
// Extensions must be stored in lowercase; the helper below enforces
// case-insensitive matching so ".PDF", ".Pdf", etc. all work.

/** Canonical name of the restricted top-level folder (case-insensitive match). */
export const VERIFIED_DOWNLOADS_FOLDER_NAME = 'Verified Downloads'

/**
 * All recognised names for the Verified Downloads folder (covers the historical
 * 'Verified Downloads' name that may already exist in some workspaces' databases).
 */
export const VERIFIED_DOWNLOADS_FOLDER_NAMES: string[] = [
    'verified downloads',
    'verify downloads',
]

export const VERIFIED_DOWNLOADS_ALLOWED_EXTENSIONS: string[] = [
    '.pdf',
]

/**
 * Returns true when the given filename has an extension that is allowed
 * inside the Verified Downloads folder (case-insensitive).
 */
export function isAllowedInVerifiedDownloads(filename: string): boolean {
    const dotIndex = filename.lastIndexOf('.')
    if (dotIndex === -1) return false
    const ext = filename.slice(dotIndex).toLowerCase()
    return VERIFIED_DOWNLOADS_ALLOWED_EXTENSIONS.includes(ext)
}

/**
 * Returns true when the given folder name matches any of the recognised
 * Verified Downloads folder names.
 */
export function isVerifiedDownloadsFolder(folderName: string): boolean {
    return VERIFIED_DOWNLOADS_FOLDER_NAMES.includes(folderName.toLowerCase().trim())
}

// ── Geofencing ───────────────────────────────────────────────────
// Country-based login/access restrictions.

/** Master switch — set false to disable geofencing globally without touching the DB. */
export const GEOFENCING_ENABLED = true

/**
 * When true, admin-role members are never blocked by geofencing regardless of
 * the workspace country allowlist. Recommended to keep true.
 */
export const GEOFENCING_ADMIN_IMMUNE = true

/** How long (seconds) an emailed bypass code remains valid after issue. */
export const GEOFENCE_BYPASS_CODE_TTL_SECONDS = 300   // 5 minutes

/** Number of characters in the generated bypass code (unambiguous charset). */
export const GEOFENCE_BYPASS_CODE_LENGTH = 8

/** Maximum incorrect attempts before a bypass code is locked. */
export const GEOFENCE_BYPASS_MAX_ATTEMPTS = 3
