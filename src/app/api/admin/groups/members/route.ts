import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'
import { z } from 'zod'

const querySchema = z.object({
    workspace_id: z.string().uuid(),
    group_id: z.string().uuid(),
})

export async function GET(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const url = new URL(req.url)
        const workspace_id = url.searchParams.get('workspace_id')
        const group_id = url.searchParams.get('group_id')

        const params = querySchema.parse({ workspace_id, group_id })

        const membership = await requireMembership(session.userId, params.workspace_id)
        if (membership.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

        const db = getAdminClient()

        // Join with users table to get name/email
        const { data, error } = await db
            .from('group_members')
            .select(`
                user_id,
                users (
                    id,
                    email,
                    name
                )
            `)
            .eq('group_id', params.group_id)

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        // Flatten the response
        const members = (data ?? []).map((m: any) => ({
            id: m.users.id,
            email: m.users.email,
            name: m.users.name
        }))

        return NextResponse.json(members)
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        console.error('[admin/groups/members]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
