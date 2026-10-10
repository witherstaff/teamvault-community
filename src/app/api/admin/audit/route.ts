import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'
import { auditQuerySchema } from '@/lib/validation'
import { z } from 'zod'

export async function GET(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const raw = Object.fromEntries(req.nextUrl.searchParams)
        const params = auditQuerySchema.parse(raw)
        const { workspace_id, from, to, action, user_id, page, limit } = params
        const membership = await requireMembership(session.userId, workspace_id)
        if (membership.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

        const db = getAdminClient()
        let query = db
            .from('audit_events')
            .select(`
                *,
                users:actor_user_id (name, email)
            `, { count: 'exact' })
            .eq('workspace_id', workspace_id)
            .order('created_at', { ascending: false })
            .range(page * limit, (page + 1) * limit - 1)

        if (from) query = query.gte('created_at', from)
        if (to) query = query.lte('created_at', to)
        if (action) query = query.eq('action', action)
        if (user_id) query = query.eq('actor_user_id', user_id)

        const { data, count, error } = await query
        if (error) throw error

        return NextResponse.json({ events: data, total: count, page, limit })
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        console.error('[admin/audit]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

