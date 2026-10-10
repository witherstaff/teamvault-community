import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'
import { z } from 'zod'
import { randomBytes } from 'crypto'

const schema = z.object({
    workspace_id: z.string().uuid(),
    object_id: z.string().uuid(),
})

export async function POST(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const body = schema.parse(await req.json())
        const { workspace_id, object_id } = body
        const membership = await requireMembership(session.userId, workspace_id)
        if (membership.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

        // Verify the object exists in this workspace
        const db = getAdminClient()
        const { data: obj } = await db
            .from('vault_objects')
            .select('id, name')
            .eq('id', object_id)
            .eq('workspace_id', workspace_id)
            .eq('is_deleted', false)
            .single()

        if (!obj) return NextResponse.json({ error: 'File not found' }, { status: 404 })

        // Verify rules exist
        const { data: rules } = await db
            .from('verified_download_rules')
            .select('id')
            .eq('object_id', object_id)
            .single()

        if (!rules) return NextResponse.json({ error: 'No distribution rules configured for this file. Please set Link Options first.' }, { status: 422 })

        // Generate a cryptographically random token
        const downloadToken = randomBytes(24).toString('base64url')

        const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
        // Force HTTPS for all non-localhost origins (guards against misconfigured env vars)
        const appUrl = rawAppUrl.startsWith('http://')
            ? rawAppUrl.replace(/^http:\/\/(?!localhost)/i, 'https://')
            : rawAppUrl
        const link = `${appUrl}/download/${workspace_id}/${object_id}?downloadToken=${downloadToken}`

        return NextResponse.json({ link, downloadToken })
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        console.error('[vault/verified/issue-link]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
