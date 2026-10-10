'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useUser } from '@auth0/nextjs-auth0/client'

interface Workspace {
  id: string
  name: string
  role: string
  status: string
}

export default function VerifyWorkspacePage() {
  const { user, isLoading: userLoading } = useUser()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    setLoading(true)
    fetch('/api/user/workspaces')
      .then(r => r.json())
      .then(data => setWorkspaces(data.workspaces ?? data ?? []))
      .catch(() => setError('Failed to load workspaces.'))
      .finally(() => setLoading(false))
  }, [user])

  if (userLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="landing-page">
        <nav className="landing-nav">
          <a href="/">
            <Image src="/images/teamvault-shield-name.png" alt="TeamVault" width={180} height={40} style={{ width: 'auto', height: 40 }} priority />
          </a>
        </nav>
        <main style={{ maxWidth: 480, margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔐</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Sign in to continue</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Workspace-scoped verification requires you to be signed in to a TeamVault account.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/auth/login?returnTo=/verify/workspace" className="btn btn-primary">Sign in</a>
            <a href="/verify" className="btn btn-ghost">Use public verify instead</a>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <a href="/">
          <Image src="/images/teamvault-shield-name.png" alt="TeamVault" width={180} height={40} style={{ width: 'auto', height: 40 }} priority />
        </a>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <a href="/verify" className="btn btn-ghost" style={{ fontSize: '0.875rem' }}>Public verify</a>
          <a href="/vault" className="btn btn-primary" style={{ fontSize: '0.875rem' }}>Go to Vault</a>
        </div>
      </nav>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '3rem 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🛡️</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem' }}>Workspace Verification</h1>
          <p style={{ color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
            Select a workspace to verify that a file was distributed through its verified downloads and has not been altered.
          </p>
        </div>

        {error && (
          <p style={{ color: 'var(--error)', textAlign: 'center', marginBottom: '1rem' }}>{error}</p>
        )}

        {loading && (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Loading workspaces…</p>
        )}

        {!loading && workspaces.length === 0 && !error && (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>You are not a member of any workspaces.</p>
            <a href="/verify" style={{ color: 'var(--primary)', marginTop: '0.75rem', display: 'inline-block' }}>
              Use the public verify tool instead →
            </a>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {workspaces.map(ws => (
            <div key={ws.id} className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{ws.name}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.125rem', textTransform: 'capitalize' }}>
                  {ws.role}
                </div>
              </div>
              <a
                href={`/verify/workspace/${ws.id}`}
                className="btn btn-primary"
                style={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}
              >
                Verify download →
              </a>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Don't need workspace scoping?{' '}
          <a href="/verify" style={{ color: 'var(--primary)' }}>Use the public verify tool →</a>
        </p>
      </main>
    </div>
  )
}
