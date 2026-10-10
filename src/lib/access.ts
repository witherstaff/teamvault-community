import { getAdminClient } from '@/db'
import { NextResponse } from 'next/server'

/**
 * Get all group IDs the user belongs to in a workspace.
 */
export async function getUserGroupIds(userId: string, workspaceId: string): Promise<string[]> {
    const db = getAdminClient()
    const { data } = await db
        .from('group_members')
        .select('group_id, groups!inner(workspace_id)')
        .eq('user_id', userId)
        .eq('groups.workspace_id', workspaceId)

    return (data ?? []).map((r) => r.group_id)
}

/**
 * Get all ancestor folder IDs for a given object (including the object itself).
 * Uses a recursive CTE via Supabase RPC.
 * Falls back to iterative traversal if RPC not available.
 */
export async function getFolderAncestors(objectId: string): Promise<string[]> {
    const db = getAdminClient()

    // Try recursive CTE via Postgres function (recommended: create this in Supabase)
    const { data, error } = await db.rpc('get_folder_ancestors', { p_object_id: objectId })

    if (!error && data) {
        return (data as Array<{ id: string }>).map((r) => r.id)
    }

    // Fallback: iterative traversal (less efficient, works without RPC)
    const ancestors: string[] = []
    let currentId: string | null = objectId

    while (currentId) {
        ancestors.push(currentId)
        const { data: obj } = await db
            .from('vault_objects')
            .select('parent_id')
            .eq('id', currentId)
            .single() as { data: { parent_id: string | null } | null }
        currentId = obj?.parent_id ?? null
    }

    return ancestors
}

/**
 * Check if a user has view access to a folder (or its ancestor chain).
 * Returns true if admin OR explicit ACL match found.
 */
export async function checkFolderAccess(
    userId: string,
    workspaceId: string,
    objectId: string,
    isAdmin: boolean
): Promise<boolean> {
    if (isAdmin) return true

    const db = getAdminClient()
    const [groupIds, ancestors] = await Promise.all([
        getUserGroupIds(userId, workspaceId),
        getFolderAncestors(objectId),
    ])

    if (ancestors.length === 0) return false

    // Check if ANY ACL rules exist on this folder or its ancestors
    const { count: aclCount } = await db
        .from('folder_access')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .in('folder_id', ancestors)

    // If no ACL rules exist at all → open by default, all members see it
    if ((aclCount ?? 0) === 0) return true

    // ACL rules exist → check if user or their groups are explicitly allowed
    const { data, error } = await db
        .from('folder_access')
        .select('id')
        .eq('workspace_id', workspaceId)
        .in('folder_id', ancestors)
        .or(
            `and(subject_type.eq.user,subject_id.eq.${userId})` +
            (groupIds.length > 0
                ? `,and(subject_type.eq.group,subject_id.in.(${groupIds.join(',')}))`
                : '')
        )
        .limit(1)

    return !error && (data?.length ?? 0) > 0
}

/**
 * Require folder access — throws 403 NextResponse if denied.
 */
export async function requireFolderAccess(
    userId: string,
    workspaceId: string,
    objectId: string,
    isAdmin: boolean,
    reason = 'no_acl_match'
): Promise<void> {
    const allowed = await checkFolderAccess(userId, workspaceId, objectId, isAdmin)
    if (!allowed) {
        throw NextResponse.json({ error: 'Forbidden', reason }, { status: 403 })
    }
}

/**
 * Validate that an object belongs to the given workspace.
 * Throws 400 if mismatch.
 */
export async function requireSameWorkspace(objectId: string, workspaceId: string): Promise<void> {
    const db = getAdminClient()
    const { data } = await db
        .from('vault_objects')
        .select('workspace_id')
        .eq('id', objectId)
        .single()

    if (!data || data.workspace_id !== workspaceId) {
        throw NextResponse.json({ error: 'Object not found in workspace' }, { status: 400 })
    }
}
