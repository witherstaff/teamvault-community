import { NextRequest, NextResponse } from 'next/server'
import { getTeamVaultSession } from '@/lib/auth'
import { isMasterAdmin, getPlan, STORAGE_PLANS } from '@/lib/config'
import { getAdminClient } from '@/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    const session = await getTeamVaultSession(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isMasterAdmin(session.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { workspaceName, adminEmail, planId } = body

    if (!workspaceName?.trim()) return NextResponse.json({ error: 'workspaceName is required' }, { status: 400 })
    if (!adminEmail?.trim()) return NextResponse.json({ error: 'adminEmail is required' }, { status: 400 })
    if (!planId) return NextResponse.json({ error: 'planId is required' }, { status: 400 })

    const plan = getPlan(planId)
    if (!plan.internal) return NextResponse.json({ error: 'Only internal plans can be provisioned here' }, { status: 400 })

    const db = getAdminClient()

    // 1. Find or create the user by email
    let userId: string
    const { data: existingUser } = await db.from('users').select('id').eq('email', adminEmail.trim().toLowerCase()).single()
    if (existingUser) {
        userId = existingUser.id
    } else {
        const { data: newUser, error: userErr } = await db
            .from('users')
            .insert({ email: adminEmail.trim().toLowerCase() })
            .select('id')
            .single()
        if (userErr || !newUser) {
            console.error('[MASTER-ADMIN] Failed to create user', userErr)
            return NextResponse.json({ error: 'Failed to create user record' }, { status: 500 })
        }
        userId = newUser.id
    }

    // 2. Create workspace
    const rawSlug = workspaceName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')
    const slug = `${rawSlug}-${crypto.randomUUID().split('-')[0]}`

    const { data: workspace, error: wsErr } = await db
        .from('workspaces')
        .insert({
            name: workspaceName.trim(),
            slug,
            plan_id: plan.id,
            storage_limit_bytes: plan.storageLimitBytes ?? 107374182400,
            verified_downloads_per_month: plan.verifiedDownloadsPerMonth,
            recycle_bin_retention_days: plan.recycleBinRetentionDays,
        })
        .select('id')
        .single()

    if (wsErr || !workspace) {
        console.error('[MASTER-ADMIN] Failed to create workspace', wsErr)
        return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 })
    }

    // 3. Create root folder
    const { error: folderErr } = await db
        .from('vault_objects')
        .insert({ workspace_id: workspace.id, type: 'folder', name: '/' })

    if (folderErr) {
        console.error('[MASTER-ADMIN] Failed to create root folder', folderErr)
        return NextResponse.json({ error: 'Failed to initialize workspace storage' }, { status: 500 })
    }

    // 4. Create admin membership
    const { error: memberErr } = await db
        .from('memberships')
        .insert({ workspace_id: workspace.id, user_id: userId, role: 'admin', can_upload: true, status: 'active' })

    if (memberErr) {
        console.error('[MASTER-ADMIN] Failed to create membership', memberErr)
        return NextResponse.json({ error: 'Failed to create admin membership' }, { status: 500 })
    }

    console.log(`[MASTER-ADMIN] Created internal workspace "${workspaceName}" (${plan.id}) for ${adminEmail}`)
    return NextResponse.json({ workspaceId: workspace.id })
}
