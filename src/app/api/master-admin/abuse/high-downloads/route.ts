import { NextRequest, NextResponse } from 'next/server'
import { getTeamVaultSession } from '@/lib/auth'
import { isMasterAdmin } from '@/lib/config'
import { getAdminClient } from '@/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    try {
        const session = await getTeamVaultSession(req)
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        if (!isMasterAdmin(session.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        const timeframe = req.nextUrl.searchParams.get('timeframe') || '24h'
        const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') || '50', 10)))

        const now = new Date()
        let hoursAgo = 24
        if (timeframe === '7d') hoursAgo = 24 * 7
        if (timeframe === '30d') hoursAgo = 24 * 30
        if (timeframe === 'all') hoursAgo = 24 * 365 * 5

        const sinceIso = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000).toISOString()
        const since7dIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

        const db = getAdminClient()

        // 1. Query download audit events
        const { data: downloadEvents, error: auditErr } = await db
            .from('audit_events')
            .select('object_id, workspace_id, created_at, metadata')
            .in('action', ['FILE_DOWNLOADED', 'AGENT_FILE_DOWNLOADED'])
            .not('object_id', 'is', null)
            .gte('created_at', sinceIso)

        if (auditErr) {
            return NextResponse.json({ error: 'Failed to query download audit logs' }, { status: 500 })
        }

        const events = downloadEvents ?? []

        // 2. Aggregate by object_id
        type AggItem = {
            objectId: string
            workspaceId: string
            count: number
            uniqueIps: Set<string>
            uniqueViewerKeys: Set<string>
            firstDownloadedAt: string
            lastDownloadedAt: string
        }

        const aggMap = new Map<string, AggItem>()

        for (const ev of events) {
            const objId = ev.object_id!
            const meta = (ev.metadata as Record<string, unknown>) || {}
            const ipHash = (meta.ip_hash as string) || (meta.ip as string) || 'unknown'
            const viewerKeyId = (meta.agent_key_id as string) || ''

            let item = aggMap.get(objId)
            if (!item) {
                item = {
                    objectId: objId,
                    workspaceId: ev.workspace_id,
                    count: 0,
                    uniqueIps: new Set(),
                    uniqueViewerKeys: new Set(),
                    firstDownloadedAt: ev.created_at,
                    lastDownloadedAt: ev.created_at,
                }
                aggMap.set(objId, item)
            }

            item.count++
            if (ipHash) item.uniqueIps.add(ipHash)
            if (viewerKeyId) item.uniqueViewerKeys.add(viewerKeyId)
            if (ev.created_at > item.lastDownloadedAt) item.lastDownloadedAt = ev.created_at
            if (ev.created_at < item.firstDownloadedAt) item.firstDownloadedAt = ev.created_at
        }

        const sortedItems = Array.from(aggMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, limit)

        if (sortedItems.length === 0) {
            return NextResponse.json({ timeframe, highDownloadFiles: [] })
        }

        // 3. Fetch object & workspace metadata
        const objectIds = sortedItems.map((i) => i.objectId)
        const workspaceIds = Array.from(new Set(sortedItems.map((i) => i.workspaceId)))

        const [objectsRes, workspacesRes] = await Promise.all([
            db.from('vault_objects').select('id, name, size_bytes, mime_type, checksum_sha256, is_deleted').in('id', objectIds),
            db.from('workspaces').select('id, name, plan_id').in('id', workspaceIds),
        ])

        const objectMap = new Map((objectsRes.data ?? []).map((o) => [o.id, o]))
        const wsMap = new Map((workspacesRes.data ?? []).map((w) => [w.id, w]))

        const highDownloadFiles = sortedItems.map((item) => {
            const obj = objectMap.get(item.objectId)
            const ws = wsMap.get(item.workspaceId)
            const uniqueIpCount = item.uniqueIps.size
            const uniqueViewerKeyCount = item.uniqueViewerKeys.size

            const isSuspicious = uniqueIpCount > 200 || item.count > 1000
            const riskFactors: string[] = []
            if (uniqueIpCount > 200) riskFactors.push('high_ip_diversity')
            if (item.count > 1000) riskFactors.push('high_download_volume')
            if (uniqueViewerKeyCount > 10) riskFactors.push('multiple_viewer_keys')

            return {
                objectId: item.objectId,
                fileName: obj?.name ?? 'Unknown / Deleted File',
                sizeBytes: obj?.size_bytes ?? 0,
                mimeType: obj?.mime_type ?? null,
                checksumSha256: obj?.checksum_sha256 ?? null,
                isDeleted: obj?.is_deleted ?? false,
                workspaceId: item.workspaceId,
                workspaceName: ws?.name ?? 'Unknown Workspace',
                planId: ws?.plan_id ?? 'agent',
                downloadCount: item.count,
                uniqueIpCount,
                uniqueViewerKeysUsed: uniqueViewerKeyCount,
                firstDownloadedAt: item.firstDownloadedAt,
                lastDownloadedAt: item.lastDownloadedAt,
                isSuspicious,
                riskFactors,
            }
        })

        return NextResponse.json({
            timeframe,
            highDownloadFiles,
        })
    } catch (err: any) {
        console.error('[master-admin/abuse/high-downloads]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
