import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'
import { getObjectMeta } from '@/lib/storage'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
    workspace_id: z.string().uuid()
})

export async function GET(req: NextRequest) {
    try {
        const session = await requireSession(req)
        const url = new URL(req.url)
        const { workspace_id } = querySchema.parse({ workspace_id: url.searchParams.get('workspace_id') })

        // Everyone in the workspace can view storage usage
        await requireMembership(session.userId, workspace_id)

        const db = getAdminClient()

        // 0. Auto-heal any files with null checksum_sha256 that already exist in storage
        try {
            const { data: orphanedFiles } = await db
                .from('vault_objects')
                .select('id, storage_key')
                .eq('workspace_id', workspace_id)
                .eq('type', 'file')
                .is('checksum_sha256', null)

            if (orphanedFiles && orphanedFiles.length > 0) {
                for (const f of orphanedFiles) {
                    if (f.storage_key) {
                        const meta = await getObjectMeta(f.storage_key)
                        if (meta.exists) {
                            await db
                                .from('vault_objects')
                                .update({
                                    checksum_sha256: meta.etag || `verified-${f.id}`,
                                    ...(meta.sizeBytes ? { size_bytes: meta.sizeBytes } : {})
                                })
                                .eq('id', f.id)
                        }
                    }
                }
            }
        } catch (healErr) {
            console.warn('[workspace-info] auto-heal check error:', healErr)
        }

        const { data, error } = await db
            .from('workspaces')
            .select('plan_id, storage_limit_bytes, storage_used_bytes')
            .eq('id', workspace_id)
            .single()

        if (error || !data) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

        const { data: rootFolder } = await db
            .from('vault_objects')
            .select('id')
            .eq('workspace_id', workspace_id)
            .eq('name', '/')
            .eq('type', 'folder')
            .is('parent_id', null)
            .single()

        // 1. Accurately sum all files currently existing in the workspace (active + recycle bin)
        const { data: objects } = await db
            .from('vault_objects')
            .select('size_bytes')
            .eq('workspace_id', workspace_id)
            .eq('type', 'file')
            .not('checksum_sha256', 'is', null)

        const totalObjectBytes = (objects || []).reduce((acc: number, o: any) => acc + Number(o.size_bytes || 0), 0)

        // 2. Accurately sum historical file versions
        let totalVersionBytes = 0
        try {
            const { data: versions } = await db
                .from('file_versions')
                .select('size_bytes, vault_objects!inner(workspace_id)')
                .eq('vault_objects.workspace_id', workspace_id)
            totalVersionBytes = (versions || []).reduce((acc: number, v: any) => acc + Number(v.size_bytes || 0), 0)
        } catch {
            // ignore if join syntax differs
        }

        const calculatedStorageUsed = totalObjectBytes + totalVersionBytes

        // 3. Self-heal workspaces.storage_used_bytes in database if it diverged from actual files
        if (Number(data.storage_used_bytes) !== calculatedStorageUsed) {
            await db
                .from('workspaces')
                .update({ storage_used_bytes: calculatedStorageUsed })
                .eq('id', workspace_id)
        }

        const res = NextResponse.json({
            plan_id: data.plan_id,
            storage_limit_bytes: Number(data.storage_limit_bytes),
            storage_used_bytes: calculatedStorageUsed,
            root_folder_id: rootFolder?.id || null
        })
        res.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate')
        return res
    } catch (err) {
        if (err instanceof Response) return err
        if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 })
        console.error('[vault/workspace-info]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
