import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAuth0 } from '@/lib/auth0-client'

export async function GET(req: NextRequest) {
    try {
        console.log('[DEBUG] Cookies in membership route:', req.cookies.getAll())
        console.log('[DEBUG] Auth0 session:', await getAuth0().getSession(req))
        const session = await requireSession(req)
        const workspaceId = req.nextUrl.searchParams.get('workspace_id')
        if (!workspaceId) return NextResponse.json({ error: 'Missing workspace_id' }, { status: 400 })

        const membership = await requireMembership(session.userId, workspaceId)

        const { getAdminClient } = await import('@/db')
        const db = getAdminClient()
        const { data: workspace } = await db.from('workspaces').select('name, plan_id').eq('id', workspaceId).single()

        return NextResponse.json({ ...membership, workspace_name: workspace?.name, plan_id: workspace?.plan_id })
    } catch (err) {
        if (err instanceof Response) return err
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
