import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'

export async function GET(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const url = new URL(req.url)
        const workspace_id = url.searchParams.get('workspace_id')
        const folder_id = url.searchParams.get('folder_id')
        if (!workspace_id || !folder_id) return NextResponse.json({ error: 'workspace_id and folder_id required' }, { status: 400 })

        const membership = await requireMembership(session.userId, workspace_id)
        if (membership.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

        const db = getAdminClient()
        const { data, error } = await db
            .from('folder_access')
            .select('subject_type, subject_id')
            .eq('workspace_id', workspace_id)
            .eq('folder_id', folder_id)

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        const users = (data ?? []).filter(r => r.subject_type === 'user').map(r => r.subject_id)
        const groups = (data ?? []).filter(r => r.subject_type === 'group').map(r => r.subject_id)

        return NextResponse.json({ users, groups })
    } catch (err) {
        if (err instanceof Response) return err
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
