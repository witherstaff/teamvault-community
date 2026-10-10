import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'
import { recycleBinQuerySchema } from '@/lib/validation'
import { getPlan } from '@/lib/config'
import { z } from 'zod'

export async function GET(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const raw = Object.fromEntries(req.nextUrl.searchParams)
        const { workspace_id, page, limit } = recycleBinQuerySchema.parse(raw)

        const membership = await requireMembership(session.userId, workspace_id)
        if (membership.role !== 'admin') {
            return NextResponse.json({ error: 'Admin only' }, { status: 403 })
        }

        const db = getAdminClient()

        const { data: ws } = await db
            .from('workspaces')
            .select('plan_id')
            .eq('id', workspace_id)
            .single()

        const plan = getPlan(ws?.plan_id ?? 'team')
        const retentionDays = plan.recycleBinRetentionDays

        // Fetch all deleted items, including the parent's is_deleted so we can
        // filter to root-only (items whose parent is active or who have no parent).
        // Root-only avoids showing every individual child of a recursively deleted folder.
        const { data: allDeleted, error } = await db
            .from('vault_objects')
            .select(`
                id, name, type, parent_id, size_bytes, checksum_sha256,
                mime_type, deleted_at, deleted_by,
                deleter:deleted_by ( name, email ),
                parent:parent_id ( is_deleted )
            `)
            .eq('workspace_id', workspace_id)
            .eq('is_deleted', true)
            .not('deleted_at', 'is', null)
            .order('deleted_at', { ascending: false })

        if (error) throw error

        // Keep only root items: no parent, or parent is still active
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
            // Strip the internal parent join from the response
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
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        console.error('[admin/recycle-bin]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
