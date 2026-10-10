'use client'
import { useState, useRef } from 'react'
import Image from 'next/image'

type VerifyResult =
  | {
      authentic: true
      match_type: 'watermarked' | 'original'
      submitted_hash: string
      original_hash: string | null
      watermarked_hash?: string
      session_id: string | null
      downloaded_at: string
    }
  | {
      authentic: false
      submitted_hash: string
      message: string
    }

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export default function VerifyPage() {
  const [mode, setMode] = useState<'hash' | 'file'>('hash')
  const [hashInput, setHashInput] = useState('')
  const [fileName, setFileName] = useState('')
  const [computedHash, setComputedHash] = useState('')
  const [hashing, setHashing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setFileName(file.name)
    setComputedHash('')
    setResult(null)
    setError('')
    setHashing(true)
    try {
      const buf = await file.arrayBuffer()
      const hex = await sha256Hex(buf)
      setComputedHash(hex)
    } catch {
      setError('Failed to compute hash from file.')
    } finally {
      setHashing(false)
    }
  }

  async function verify(hash: string) {
    const clean = hash.trim().toLowerCase()
    if (!/^[0-9a-f]{64}$/.test(clean)) {
      setError('Please provide a valid SHA-256 hash (64 hex characters).')
      return
    }
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash: clean }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Verification failed.')
        return
      }
      setResult(data)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const activeHash = mode === 'hash' ? hashInput : computedHash
  const canVerify =
    !loading &&
    !hashing &&
    (mode === 'hash'
      ? /^[0-9a-f]{64}$/i.test(hashInput.trim())
      : computedHash.length === 64)

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short',
    })
  }

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <a href="/">
          <Image src="/images/teamvault-shield-name.png" alt="TeamVault" width={180} height={40} style={{ width: 'auto', height: 40 }} priority />
        </a>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <a href="/verify/workspace" className="btn btn-ghost" style={{ fontSize: '0.875rem' }}>Workspace verify</a>
          <a href="/auth/login?returnTo=/vault" className="btn btn-primary" style={{ fontSize: '0.875rem' }}>Log in</a>
        </div>
      </nav>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '3rem 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🛡️</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Verify a Download
          </h1>
          <p style={{ color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
            Confirm that a file was distributed by TeamVault verified downloads and has not been altered.
            No login required.
          </p>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          {/* Mode tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', borderRadius: 8, padding: 4, marginBottom: '1.5rem' }}>
            {(['hash', 'file'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setResult(null); setError('') }}
                style={{
                  flex: 1, padding: '0.5rem', border: 'none', borderRadius: 6,
                  cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
                  background: mode === m ? 'var(--surface)' : 'transparent',
                  color: mode === m ? 'var(--text-primary)' : 'var(--text-muted)',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {m === 'hash' ? '# Enter SHA-256 hash' : '📄 Upload file'}
              </button>
            ))}
          </div>

          {/* Hash input */}
          {mode === 'hash' && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                SHA-256 Hash
              </label>
              <input
                value={hashInput}
                onChange={e => { setHashInput(e.target.value); setResult(null); setError('') }}
                placeholder="e.g. e3b0c44298fc1c149afb..."
                style={{
                  width: '100%', padding: '0.625rem 0.75rem',
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--text-primary)',
                  fontSize: '0.8125rem', fontFamily: 'monospace', outline: 'none',
                  boxSizing: 'border-box',
                }}
                onKeyDown={e => e.key === 'Enter' && canVerify && verify(activeHash)}
              />
            </div>
          )}

          {/* File upload */}
          {mode === 'file' && (
            <div style={{ marginBottom: '1.25rem' }}>
              <input
                ref={fileRef}
                type="file"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f) }}
                style={{
                  border: '2px dashed var(--border)', borderRadius: 8,
                  padding: '2rem', textAlign: 'center', cursor: 'pointer',
                  color: 'var(--text-muted)', transition: 'border-color 0.15s',
                }}
              >
                {hashing ? (
                  <span>Computing hash…</span>
                ) : fileName ? (
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{fileName}</div>
                    {computedHash && (
                      <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                        {computedHash}
                      </div>
                    )}
                  </div>
                ) : (
                  <span>Click or drop a file here — the hash is computed locally, the file is never uploaded</span>
                )}
              </div>
            </div>
          )}

          {error && (
            <p style={{ color: 'var(--error)', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>
          )}

          <button
            onClick={() => verify(activeHash)}
            disabled={!canVerify}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.9375rem' }}
          >
            {loading ? 'Verifying…' : 'Verify'}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div style={{
            marginTop: '1.5rem', borderRadius: 12, padding: '1.75rem',
            border: `1px solid ${result.authentic ? 'var(--success)' : 'var(--error)'}`,
            background: result.authentic ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '2rem' }}>{result.authentic ? '✅' : '❌'}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.0625rem', color: result.authentic ? 'var(--success)' : 'var(--error)' }}>
                  {result.authentic ? 'AUTHENTIC' : 'NOT FOUND'}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                  {result.authentic
                    ? `Matched as ${result.match_type === 'watermarked' ? 'a watermarked copy' : 'the original file'}`
                    : result.message}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <CertRow label="Submitted hash" value={result.submitted_hash} mono />
              {result.authentic && result.original_hash && (
                <CertRow label="Original (unwatermarked) hash" value={result.original_hash} mono />
              )}
              {result.authentic && result.watermarked_hash && (
                <CertRow label="Watermarked hash" value={result.watermarked_hash} mono />
              )}
              {result.authentic && result.session_id && (
                <CertRow label="Session ID" value={result.session_id} mono />
              )}
              {result.authentic && (
                <CertRow label="Download date" value={formatDate(result.downloaded_at)} />
              )}
            </div>
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Member of a workspace?{' '}
          <a href="/verify/workspace" style={{ color: 'var(--primary)' }}>
            Verify within your workspace →
          </a>
        </p>
      </main>
    </div>
  )
}

function CertRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '11rem 1fr', gap: '0.5rem', alignItems: 'start' }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', paddingTop: '0.125rem' }}>
        {label}
      </span>
      <span style={{ fontSize: '0.8125rem', fontFamily: mono ? 'monospace' : undefined, wordBreak: 'break-all', color: 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  )
}
