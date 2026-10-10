import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'
import { fileHistoryQuerySchema } from '@/lib/validation'
import { z } from 'zod'

export async function GET(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const raw = Object.fromEntries(req.nextUrl.searchParams)
        const { workspace_id, object_id } = fileHistoryQuerySchema.parse(raw)

        const membership = await requireMembership(session.userId, workspace_id)

        const db = getAdminClient()

        const { data: obj } = await db
            .from('vault_objects')
            .select('id, name, workspace_id, type, created_by')
            .eq('id', object_id)
            .eq('workspace_id', workspace_id)
            .single()

        if (!obj || obj.type !== 'file') {
            return NextResponse.json({ error: 'File not found' }, { status: 404 })
        }

        // Admins or the file creator can view history
        if (membership.role !== 'admin' && obj.created_by !== session.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { data: versions, error } = await db
            .from('file_versions')
            .select(`
                id, version_number, size_bytes, checksum_sha256, mime_type, created_at,
                uploader:uploaded_by ( name, email )
            `)
            .eq('object_id', object_id)
            .order('version_number', { ascending: false })

        if (error) throw error

        return NextResponse.json({ object_id, file_name: obj.name, versions: versions ?? [] })
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        console.error('[vault/file/history]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
