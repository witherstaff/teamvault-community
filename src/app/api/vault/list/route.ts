import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { checkFolderAccess } from '@/lib/access'
import { getAdminClient } from '@/db'
import { listVaultSchema } from '@/lib/validation'
import { z } from 'zod'

export async function GET(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const raw = Object.fromEntries(req.nextUrl.searchParams)
        const params = listVaultSchema.parse({
            ...raw,
            parent_id: raw.parent_id === 'null' ? null : raw.parent_id,
        })
        const { userId } = session
        const { workspace_id, parent_id } = params
        const membership = await requireMembership(userId, workspace_id)
        const db = getAdminClient()
        const isAdmin = membership.role === 'admin'

        // Get children of the folder
        let query = db
            .from('vault_objects')
            .select('id, type, name, size_bytes, mime_type, created_at, parent_id, workspace_id')
            .eq('workspace_id', workspace_id)
            .eq('is_deleted', false)
            .or('type.eq.folder,checksum_sha256.not.is.null')
            .order('type', { ascending: true }) // folders first
            .order('name', { ascending: true })

        if (parent_id === null || parent_id === undefined) {
            query = query.is('parent_id', null)
        } else {
            query = query.eq('parent_id', parent_id)
        }

        // System folder auto-provisioning check
        if (isAdmin) {
            let isRootFolder = false;
            if (parent_id === null || parent_id === undefined) {
                isRootFolder = true;
            } else {
                const { data: folder } = await db.from('vault_objects').select('name, parent_id').eq('id', parent_id).single();
                if (folder?.name === '/' && folder?.parent_id === null) {
                    isRootFolder = true;
                }
            }

            if (isRootFolder) {
                let vdQuery = db
                    .from('vault_objects')
                    .select('id', { count: 'exact', head: true })
                    .eq('workspace_id', workspace_id)
                    .eq('name', 'Verified Downloads')
                    .eq('type', 'folder')
                    .eq('is_deleted', false)

                vdQuery = parent_id === null ? vdQuery.is('parent_id', null) : vdQuery.eq('parent_id', parent_id)

                const { count } = await vdQuery
                if (count === 0) {
                    await db.from('vault_objects').insert({
                        workspace_id,
                        name: 'Verified Downloads',
                        type: 'folder',
                        parent_id: parent_id
                    })
                }
            }
        }

        const { data: items, error } = await query
        if (error) throw error

        // Filter by access for non-admins
        if (!isAdmin) {
            const accessChecks = await Promise.all(
                items.map((item) =>
                    checkFolderAccess(userId, workspace_id, item.type === 'folder' ? item.id : item.parent_id!, false)
                        .then((ok) => ({ item, ok }))
                )
            )
            const visible = accessChecks.filter((r) => r.ok).map((r) => r.item)
            return NextResponse.json(visible)
        }

        return NextResponse.json(items)
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        console.error('[vault/list]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

