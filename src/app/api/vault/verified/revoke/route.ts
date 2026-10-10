import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'
import { z } from 'zod'

const schema = z.object({
    workspace_id: z.string().uuid(),
    object_id: z.string().uuid(),
    revoked: z.boolean(),
})

export async function POST(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const body = schema.parse(await req.json())
        const { workspace_id, object_id, revoked } = body
        const membership = await requireMembership(session.userId, workspace_id)
        if (membership.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

        const db = getAdminClient()

        // Ensure a rules row exists, then toggle revocation
        const { data, error } = await db
            .from('verified_download_rules')
            .upsert(
                { workspace_id, object_id, is_revoked: revoked },
                { onConflict: 'object_id' }
            )
            .select('id, is_revoked')
            .single()

        if (error) throw error
        return NextResponse.json({ is_revoked: data.is_revoked })
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        console.error('[vault/verified/revoke]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
