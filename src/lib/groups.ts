import { getAdminClient } from '@/db'

/**
 * Ensures the "Admin" system group exists and its membership matches 
 * the current workspace administrators.
 */
export async function syncAdminGroup(workspaceId: string): Promise<string> {
    const db = getAdminClient()

    // 1. Ensure "Admin" system group exists
    let { data: adminGroup } = await db
        .from('groups')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('name', 'Admin')
        .eq('is_system', true)
        .single()

    if (!adminGroup) {
        const { data: newGroup, error: createError } = await db
            .from('groups')
            .insert({ workspace_id: workspaceId, name: 'Admin', is_system: true })
            .select('id')
            .single()

        if (createError || !newGroup) {
            console.error('[syncAdminGroup] Failed to create Admin group:', createError)
            throw new Error('Failed to create Admin group')
        }
        adminGroup = newGroup
    }

    const groupId = adminGroup.id

    // 2. Get all current workspace admins
    const { data: admins } = await db
        .from('memberships')
        .select('user_id')
        .eq('workspace_id', workspaceId)
        .eq('role', 'admin')

    const adminUserIds = new Set((admins ?? []).map(a => a.user_id))

    // 3. Get current "Admin" group members
    const { data: currentMembers } = await db
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)

    const currentMemberIds = new Set((currentMembers ?? []).map(m => m.user_id))

    // 4. Calculate diffs
    const toAdd = [...adminUserIds].filter(id => !currentMemberIds.has(id))
    const toRemove = [...currentMemberIds].filter(id => !adminUserIds.has(id))

    // 5. Apply changes
    if (toAdd.length > 0) {
        await db.from('group_members').insert(
            toAdd.map(userId => ({ group_id: groupId, user_id: userId }))
        )
    }

    if (toRemove.length > 0) {
        await db.from('group_members')
            .delete()
            .eq('group_id', groupId)
            .in('user_id', toRemove)
    }

    return groupId
}
