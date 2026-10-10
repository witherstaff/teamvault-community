import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'
import { z } from 'zod'

const getSchema = z.object({
    workspace_id: z.string().uuid(),
    object_id: z.string().uuid(),
})

const upsertSchema = z.object({
    workspace_id: z.string().uuid(),
    object_id: z.string().uuid(),
    // Duration expressed as absolute ISO timestamp or null
    expires_at: z.string().datetime({ offset: true }).nullable().optional(),
    max_downloads: z.number().int().positive().nullable().optional(),
    allowed_emails: z.array(z.string().email()).nullable().optional(),
    allowed_ips: z.array(z.string()).nullable().optional(),
    watermark: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const params = getSchema.parse(Object.fromEntries(req.nextUrl.searchParams))
        const { workspace_id, object_id } = params
        const membership = await requireMembership(session.userId, workspace_id)
        if (membership.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

        const db = getAdminClient()
        const { data } = await db
            .from('verified_download_rules')
            .select('*')
            .eq('object_id', object_id)
            .single()

        return NextResponse.json(data ?? null)
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        console.error('[vault/verified/rules GET]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const body = upsertSchema.parse(await req.json())
        const { workspace_id, object_id, ...rules } = body
        const membership = await requireMembership(session.userId, workspace_id)
        if (membership.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

        const db = getAdminClient()
        const { data, error } = await db
            .from('verified_download_rules')
            .upsert(
                { workspace_id, object_id, ...rules },
                { onConflict: 'object_id' }
            )
            .select()
            .single()

        if (error) throw error
        return NextResponse.json(data, { status: 200 })
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        console.error('[vault/verified/rules POST]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
