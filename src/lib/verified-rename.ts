import { getAdminClient } from '@/db'

/**
 * Given a desired filename for a file being placed into `parentId`, returns a
 * name that does not conflict with any existing sibling. If `name` is already
 * taken, a numeric suffix is appended before the extension:
 *   report.pdf  →  report-1.pdf  →  report-2.pdf  …
 */
export async function resolveUniqueName(
    parentId: string,
    workspaceId: string,
    name: string,
): Promise<string> {
    const db = getAdminClient()

    // Split into stem + ext  (e.g. "report.pdf" → ["report", ".pdf"])
    const dotIdx = name.lastIndexOf('.')
    const stem = dotIdx >= 0 ? name.slice(0, dotIdx) : name
    const ext = dotIdx >= 0 ? name.slice(dotIdx) : ''

    // Fetch all sibling names that share the same stem prefix so we can check
    // for conflicts without a full table scan.
    const { data: siblings } = await db
        .from('vault_objects')
        .select('name')
        .eq('parent_id', parentId)
        .eq('workspace_id', workspaceId)
        .eq('is_deleted', false)
        .ilike('name', `${stem}%`)

    const takenNames = new Set((siblings ?? []).map((s: { name: string }) => s.name))

    if (!takenNames.has(name)) return name

    for (let i = 1; i < 10_000; i++) {
        const candidate = `${stem}-${i}${ext}`
        if (!takenNames.has(candidate)) return candidate
    }

    // Extremely unlikely fallback – just return original and let the DB handle it
    return name
}
