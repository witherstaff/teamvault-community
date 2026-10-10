import crypto from 'crypto'
import { getAdminClient } from '@/db'

export interface ProvisionWorkspaceParams {
    name: string
    slug?: string
    planId: string
    storageLimitBytes: number
    userId: string | null
    verifiedDownloadsPerMonth?: number | null
    recycleBinRetentionDays?: number | null
}

export interface ProvisionWorkspaceResult {
    workspaceId: string
    slug: string
    rootFolderId: string
}

/**
 * Universal workspace provisioning helper.
 * 
 * Creates:
 * 1. The workspace record.
 * 2. The root folder ('/') in vault_objects.
 * 3. An initial 'admin' membership if userId is supplied.
 * 
 * Used by Community Edition (direct self-hosted creation) and
 * Commercial Edition (Stripe checkout webhook and Autonomous Agent provisioning).
 */
export async function provisionWorkspace(
    params: ProvisionWorkspaceParams
): Promise<ProvisionWorkspaceResult> {
    const db = getAdminClient()

    const workspaceName = params.name.trim()
    const baseSlug = workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const slug = params.slug || `${baseSlug || 'workspace'}-${crypto.randomUUID().split('-')[0]}`

    // 1. Create Workspace
    const { data: ws, error: wsErr } = await db
        .from('workspaces')
        .insert({
            name: workspaceName,
            slug,
            plan_id: params.planId,
            storage_limit_bytes: params.storageLimitBytes,
            verified_downloads_per_month: params.verifiedDownloadsPerMonth ?? 100,
            recycle_bin_retention_days: params.recycleBinRetentionDays ?? 30,
        })
        .select('id, slug')
        .single()

    if (wsErr || !ws) {
        console.error('[PROVISION_WORKSPACE ERROR]', wsErr)
        throw wsErr || new Error('Failed to create workspace')
    }

    const workspaceId = ws.id

    // 2. Create Root Folder '/'
    const { data: rootFolder, error: fErr } = await db
        .from('vault_objects')
        .insert({
            workspace_id: workspaceId,
            type: 'folder',
            name: '/',
            parent_id: null,
        })
        .select('id')
        .single()

    if (fErr || !rootFolder) {
        console.error('[PROVISION_WORKSPACE ROOT FOLDER ERROR]', fErr)
        throw fErr || new Error('Failed to initialize workspace root folder')
    }

    // 3. Create Admin Membership (if user provided)
    if (params.userId) {
        const { error: mErr } = await db
            .from('memberships')
            .insert({
                workspace_id: workspaceId,
                user_id: params.userId,
                role: 'admin',
                can_upload: true,
                status: 'active',
            })

        if (mErr) {
            console.error('[PROVISION_WORKSPACE MEMBERSHIP ERROR]', mErr)
            throw mErr
        }
    }

    return {
        workspaceId,
        slug: ws.slug,
        rootFolderId: rootFolder.id,
    }
}
