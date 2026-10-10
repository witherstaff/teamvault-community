import { NextRequest, NextResponse } from 'next/server'
import { getTeamVaultSession } from '@/lib/auth'
import { isMasterAdmin } from '@/lib/config'
import { getAdminClient } from '@/db'

export const dynamic = 'force-dynamic'

function groupByDay(rows: { created_at: string }[], days: number): { date: string; count: number }[] {
    const counts: Record<string, number> = {}
    const now = new Date()
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        counts[d.toISOString().slice(0, 10)] = 0
    }
    for (const row of rows) {
        const day = row.created_at.slice(0, 10)
        if (day in counts) counts[day]++
    }
    return Object.entries(counts).map(([date, count]) => ({ date, count }))
}

function groupUniqueByDay(rows: { created_at: string; actor_user_id: string | null }[], days: number): { date: string; count: number }[] {
    const sets: Record<string, Set<string>> = {}
    const now = new Date()
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        sets[d.toISOString().slice(0, 10)] = new Set()
    }
    for (const row of rows) {
        const day = row.created_at.slice(0, 10)
        if (day in sets && row.actor_user_id) sets[day].add(row.actor_user_id)
    }
    return Object.entries(sets).map(([date, s]) => ({ date, count: s.size }))
}

export async function GET(req: NextRequest) {
    const session = await getTeamVaultSession(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isMasterAdmin(session.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const db = getAdminClient()
    const DAYS = 14
    const since = new Date()
    since.setDate(since.getDate() - (DAYS - 1))
    since.setHours(0, 0, 0, 0)
    const sinceIso = since.toISOString()

    const [
        workspacesRes,
        usersRes,
        totalFilesRes,
        auditActiveRes,
        auditUploadRes,
        verifiedDownloadsRes,
        newWorkspacesRes,
    ] = await Promise.all([
        db.from('workspaces').select('id, name, plan_id, storage_used_bytes, created_at'),
        db.from('users').select('id', { count: 'exact', head: true }),
        db.from('vault_objects').select('id', { count: 'exact', head: true }).eq('type', 'file').eq('is_deleted', false),
        db.from('audit_events').select('created_at, actor_user_id').not('actor_user_id', 'is', null).gte('created_at', sinceIso),
        db.from('audit_events').select('created_at').eq('action', 'FILE_UPLOADED').gte('created_at', sinceIso),
        db.from('verified_download_log').select('created_at').eq('result', 'allowed').gte('created_at', sinceIso),
        db.from('workspaces').select('created_at').gte('created_at', sinceIso),
    ])

    const workspaces = workspacesRes.data ?? []

    // Plan breakdown
    const planCounts: Record<string, number> = {}
    let totalStorageBytes = 0
    for (const ws of workspaces) {
        const plan = ws.plan_id ?? 'unknown'
        planCounts[plan] = (planCounts[plan] ?? 0) + 1
        totalStorageBytes += (ws.storage_used_bytes as number) ?? 0
    }

    const activeRows = auditActiveRes.data ?? []
    const uniqueActiveUsers = new Set(activeRows.map(r => r.actor_user_id).filter(Boolean)).size

    return NextResponse.json({
        totals: {
            workspaces: workspaces.length,
            users: usersRes.count ?? 0,
            files: totalFilesRes.count ?? 0,
            storageBytes: totalStorageBytes,
        },
        planBreakdown: planCounts,
        uniqueActiveUsers,
        dailyActiveUsers: groupUniqueByDay(activeRows, DAYS),
        dailyUploads: groupByDay(auditUploadRes.data ?? [], DAYS),
        dailyVerifiedDownloads: groupByDay(verifiedDownloadsRes.data ?? [], DAYS),
        dailyNewWorkspaces: groupByDay(newWorkspacesRes.data ?? [], DAYS),
    })
}
