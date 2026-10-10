import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'
import { z } from 'zod'

const schema = z.object({
    workspace_id: z.string().uuid(),
    parent_id: z.string().uuid(),
})

/**
 * Returns a map of { [object_id]: 'revoked' | 'exhausted' | 'active' }
 * for every file under a given parent folder that has distribution rules set.
 * Files with no rules are omitted from the response.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const params = schema.parse(Object.fromEntries(req.nextUrl.searchParams))
        const { workspace_id, parent_id } = params
        await requireMembership(session.userId, workspace_id)

        const db = getAdminClient()

        // 1. Fetch file IDs in this parent folder
        const { data: fileRows } = await db
            .from('vault_objects')
            .select('id')
            .eq('workspace_id', workspace_id)
            .eq('parent_id', parent_id)
            .eq('type', 'file')
            .eq('is_deleted', false)

        const fileIds = (fileRows ?? []).map(r => r.id)
        if (fileIds.length === 0) return NextResponse.json({})

        // 2. Fetch rules for those files
        const { data: rules, error } = await db
            .from('verified_download_rules')
            .select('object_id, is_revoked, max_downloads, expires_at')
            .eq('workspace_id', workspace_id)
            .in('object_id', fileIds)

        if (error) throw error
        if (!rules || rules.length === 0) return NextResponse.json({})

        // 2. For files with max_downloads, fetch successful download counts
        const cappedIds = rules
            .filter(r => !r.is_revoked && r.max_downloads !== null)
            .map(r => r.object_id)

        let counts: Record<string, number> = {}
        if (cappedIds.length > 0) {
            const { data: logs } = await db
                .from('verified_download_log')
                .select('object_id')
                .in('object_id', cappedIds)
                .eq('result', 'allowed')

            if (logs) {
                for (const row of logs) {
                    counts[row.object_id] = (counts[row.object_id] ?? 0) + 1
                }
            }
        }

        // 3. Build status map
        const statusMap: Record<string, 'revoked' | 'exhausted' | 'expired' | 'active'> = {}
        const now = new Date()

        for (const rule of rules) {
            if (rule.is_revoked) {
                statusMap[rule.object_id] = 'revoked'
            } else if (rule.expires_at && new Date(rule.expires_at) < now) {
                statusMap[rule.object_id] = 'expired'
            } else if (rule.max_downloads !== null && (counts[rule.object_id] ?? 0) >= rule.max_downloads) {
                statusMap[rule.object_id] = 'exhausted'
            } else {
                statusMap[rule.object_id] = 'active'
            }
        }

        return NextResponse.json(statusMap)
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        console.error('[vault/verified/file-status]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
