import { getAdminClient } from '@/db'

/**
 * Walks the parent chain from a given folder ID and returns a slash-separated
 * path string (e.g. "Projects / 2024 / Reports"). Returns null if parentId is
 * null or the walk produces no segments.
 */
export async function resolveFolderPath(parentId: string | null): Promise<string | null> {
    if (!parentId) return null
    const db = getAdminClient()
    const segments: string[] = []
    let current: string | null = parentId
    while (current) {
        const { data: folder } = await db
            .from('vault_objects')
            .select('name, parent_id')
            .eq('id', current)
            .single() as { data: { name: string; parent_id: string | null } | null }
        if (!folder) break
        if (folder.name !== '/') segments.unshift(folder.name)
        current = folder.parent_id ?? null
    }
    return segments.length > 0 ? segments.join(' / ') : null
}
