import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireMembership } from '@/lib/auth'
import { getAdminClient } from '@/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params
  const session = await requireSession()
  await requireMembership(session.userId, workspaceId)

  let body: { hash?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const hash = body.hash?.trim().toLowerCase()
  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) {
    return NextResponse.json(
      { error: 'A valid SHA-256 hash (64 hex characters) is required' },
      { status: 400 }
    )
  }

  const db = getAdminClient()

  const { data, error } = await db
    .from('verified_download_log')
    .select('watermarked_checksum, file_checksum, session_id, created_at, filename, workspace_id, workspaces(name)')
    .eq('workspace_id', workspaceId)
    .eq('result', 'allowed')
    .or(`watermarked_checksum.eq.${hash},file_checksum.eq.${hash}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[verify/workspace] db error', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({
      authentic: false,
      submitted_hash: hash,
      message:
        'No record found in this workspace. The file may have been altered, or was not distributed through TeamVault verified downloads.',
    })
  }

  const matchType =
    data.watermarked_checksum === hash ? 'watermarked' : 'original'

  const workspaceName =
    (data.workspaces as { name?: string } | null)?.name ?? null

  return NextResponse.json({
    authentic: true,
    match_type: matchType,
    submitted_hash: hash,
    original_hash: data.file_checksum,
    watermarked_hash:
      data.watermarked_checksum !== data.file_checksum
        ? data.watermarked_checksum
        : undefined,
    session_id: data.session_id,
    downloaded_at: data.created_at,
    filename: data.filename ?? null,
    workspace_name: workspaceName,
  })
}
