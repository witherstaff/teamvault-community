import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'
import { z } from 'zod'

const schema = z.object({
    workspace_id: z.string().uuid(),
    page: z.coerce.number().int().min(0).default(0),
    limit: z.coerce.number().int().min(1).max(200).default(50),
})

export async function GET(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const params = schema.parse(Object.fromEntries(req.nextUrl.searchParams))
        const { workspace_id, page, limit } = params
        const membership = await requireMembership(session.userId, workspace_id)
        if (membership.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

        const db = getAdminClient()
        const { data, count, error } = await db
            .from('verified_download_log')
            .select(`
                id, workspace_id, download_token, downloader_email, downloader_ip, result, filename,
                folder_path, session_id, watermarked_checksum, file_checksum, created_at,
                vault_objects!inner(name, id, checksum_sha256),
                workspaces(name)
            `, { count: 'exact' })
            .eq('workspace_id', workspace_id)
            .order('created_at', { ascending: false })
            .range(page * limit, (page + 1) * limit - 1)

        if (error) throw error
        return NextResponse.json({ events: data, total: count, page, limit })
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        console.error('[admin/verified-log]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
