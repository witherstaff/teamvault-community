import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/db'

// Simple in-memory rate limiter: max 20 requests per IP per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60_000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

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
    .select('watermarked_checksum, file_checksum, session_id, created_at')
    .eq('result', 'allowed')
    .or(`watermarked_checksum.eq.${hash},file_checksum.eq.${hash}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[verify] db error', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({
      authentic: false,
      submitted_hash: hash,
      message:
        'No record found. The file may have been altered, or was not distributed through TeamVault verified downloads.',
    })
  }

  const matchType =
    data.watermarked_checksum === hash ? 'watermarked' : 'original'

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
  })
}
