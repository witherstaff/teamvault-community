import { NextRequest, NextResponse } from 'next/server'
import { requireBearerSession } from '@/lib/desktop-auth'
import { requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'
import { getPlan } from '@/lib/config'

export async function GET(req: NextRequest) {
    try {
        const session = await requireBearerSession(req)
        const workspaceId = req.nextUrl.searchParams.get('workspaceId')
        const page = parseInt(req.nextUrl.searchParams.get('page') ?? '0', 10)
        const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '50', 10), 200)

        if (!workspaceId) {
            return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })
        }

        const membership = await requireMembership(session.userId, workspaceId)
        if (membership.role !== 'admin') {
            return NextResponse.json({ error: 'Admin only' }, { status: 403 })
        }

        const db = getAdminClient()

        const { data: ws } = await db
            .from('workspaces')
            .select('plan_id')
            .eq('id', workspaceId)
            .single()

        const plan = getPlan(ws?.plan_id ?? 'team')
        const retentionDays = plan.recycleBinRetentionDays

        const { data: allDeleted, error } = await db
            .from('vault_objects')
            .select(`
                id, name, type, parent_id, size_bytes, checksum_sha256,
                mime_type, deleted_at, deleted_by,
                deleter:deleted_by ( name, email ),
                parent:parent_id ( is_deleted )
            `)
            .eq('workspace_id', workspaceId)
            .eq('is_deleted', true)
            .not('deleted_at', 'is', null)
            .order('deleted_at', { ascending: false })

        if (error) throw error

        // Show only root items — items whose parent is active or who have no parent
        const rootItems = (allDeleted ?? []).filter((item: any) =>
            !item.parent_id || !item.parent || item.parent.is_deleted === false
        )

        const total = rootItems.length
        const paged = rootItems.slice(page * limit, (page + 1) * limit)

        const annotated = paged.map((item: any) => {
            let expires_at: string | null = null
            if (retentionDays !== null && item.deleted_at) {
                const expiry = new Date(item.deleted_at)
                expiry.setDate(expiry.getDate() + retentionDays)
                expires_at = expiry.toISOString()
            }
            const { parent: _parent, ...rest } = item
            return { ...rest, expires_at, retention_days: retentionDays }
        })

        return NextResponse.json({
            items: annotated,
            total,
            page,
            limit,
            retention_days: retentionDays,
        })
    } catch (error: any) {
        if (error.message === 'Unauthorized' || error.message === 'Forbidden' || error.message === 'Account disabled') {
            return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
        }
        console.error('[desktop/sync/recycle-bin]', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
