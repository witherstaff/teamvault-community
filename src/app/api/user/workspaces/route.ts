import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    try {
        const session = await requireSession(req)

        const { getAdminClient } = await import('@/db')
        const db = getAdminClient()

        const { data: memberships, error } = await db
            .from('memberships')
            .select(`
                role,
                status,
                workspace_id,
                workspaces ( name )
            `)
            .eq('user_id', session.userId)
            .in('status', ['active', 'invited'])

        if (error) throw error

        const workspaces = memberships.map((m: any) => ({
            id: m.workspace_id,
            // @ts-ignore - Supabase join typing is complex, but we know workspaces is joined
            name: m.workspaces?.name || 'Unknown Workspace',
            role: m.role,
            status: m.status
        }))

        // Sort workspaces by name alphabetically
        workspaces.sort((a, b) => a.name.localeCompare(b.name))

        const res = NextResponse.json(workspaces)
        res.headers.set('Cache-Control', 'no-store, max-age=0')
        return res
    } catch (err) {
        if (err instanceof Response) return err
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
