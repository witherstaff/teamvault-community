import { getAdminClient } from '@/db'
import { generateDownloadUrl } from '@/lib/storage'
import { isVerifiedDownloadsFolder } from '@/lib/config'

export type DownloadCheckResult =
    | { allowed: true; storageKey: string; filename: string; mimeType: string; watermark: boolean; folderPath: string | null; workspaceName: string }
    | { allowed: false; reason: 'revoked' | 'expired' | 'max_downloads' | 'email' | 'ip' | 'not_found' | 'no_rules' }

/**
 * Checks all Verified Downloads rules for a file and returns a download decision.
 * Does NOT log — the caller (download page) is responsible for logging.
 */
export async function checkVerifiedDownload(
    objectId: string,
    workspaceId: string,
    downloaderEmail: string,
    downloaderIp: string,
): Promise<DownloadCheckResult> {
    const db = getAdminClient()

    // Fetch the vault object (include parent_id for folder path resolution) and its workspace name
    const { data: obj } = await db
        .from('vault_objects')
        .select(`
            id, name, mime_type, storage_key, is_deleted, workspace_id, parent_id,
            workspaces!inner(name)
        `)
        .eq('id', objectId)
        .eq('workspace_id', workspaceId)
        .single()

    if (!obj || obj.is_deleted || !obj.storage_key) {
        return { allowed: false, reason: 'not_found' }
    }

    // Resolve the folder path by walking up the parent hierarchy
    let folderPath: string | null = null
    try {
        const pathSegments: string[] = []
        let parentId: string | null = (obj as { parent_id: string | null }).parent_id ?? null
        while (parentId) {
            const { data: folder } = await db
                .from('vault_objects')
                .select('id, name, parent_id')
                .eq('id', parentId)
                .single() as { data: { id: string; name: string; parent_id: string | null } | null }
            if (!folder) break
            if (folder.name !== '/') pathSegments.unshift(folder.name)
            parentId = folder.parent_id ?? null
        }
        folderPath = pathSegments.length > 0 ? pathSegments.join(' / ') : null
    } catch {
        // Non-fatal: proceed without folder path
    }

    // Fetch rules
    const { data: rules } = await db
        .from('verified_download_rules')
        .select('*')
        .eq('object_id', objectId)
        .single()

    if (!rules) {
        // No rules set = no controlled distribution = deny (admin must configure first)
        return { allowed: false, reason: 'no_rules' }
    }

    // 1. Revoked
    if (rules.is_revoked) return { allowed: false, reason: 'revoked' }

    // 2. Expired
    if (rules.expires_at && new Date(rules.expires_at) < new Date()) {
        return { allowed: false, reason: 'expired' }
    }

    // 3. Max downloads — count successful downloads
    if (rules.max_downloads !== null) {
        const { count } = await db
            .from('verified_download_log')
            .select('id', { count: 'exact', head: true })
            .eq('object_id', objectId)
            .eq('result', 'allowed')

        if ((count ?? 0) >= rules.max_downloads) {
            return { allowed: false, reason: 'max_downloads' }
        }
    }

    // 4. Email allowlist
    if (rules.allowed_emails && rules.allowed_emails.length > 0) {
        const normalised = downloaderEmail.toLowerCase().trim()
        const allowed = rules.allowed_emails.map((e: string) => e.toLowerCase().trim())
        if (!allowed.includes(normalised)) {
            return { allowed: false, reason: 'email' }
        }
    }

    // 5. IP allowlist
    if (rules.allowed_ips && rules.allowed_ips.length > 0) {
        if (!rules.allowed_ips.includes(downloaderIp)) {
            return { allowed: false, reason: 'ip' }
        }
    }

    return {
        allowed: true,
        storageKey: obj.storage_key,
        filename: obj.name,
        mimeType: obj.mime_type ?? 'application/octet-stream',
        watermark: rules.watermark ?? false,
        folderPath,
        workspaceName: (obj.workspaces as unknown as { name: string }).name,
    }
}

/**
 * Generate a short-lived presigned storage URL for a verified download.
 */
export async function generateVerifiedDownloadUrl(storageKey: string, filename: string, mimeType: string): Promise<string> {
    return generateDownloadUrl(storageKey, filename, true, mimeType)
}
