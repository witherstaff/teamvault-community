'use client'

import React from 'react'

interface LandingFooterProps {
  user: any
  onStartTrial?: () => void
  isCommercial?: boolean
}

export function LandingFooter({ user, onStartTrial, isCommercial = true }: LandingFooterProps) {
  return (
    <footer className="landing-footer">
      <div className="max-w-3xl mx-auto mb-8">
        <h2 className="mb-4" style={{ color: 'var(--text-primary)' }}>
          {isCommercial
            ? 'Secure your team without per-user pricing.'
            : 'Secure file sharing on your own infrastructure.'}
        </h2>
        {user ? (
          <a href="/vault" className="btn btn-primary" style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}>
            Enter Vault
          </a>
        ) : isCommercial ? (
          <button onClick={onStartTrial} className="btn btn-primary" style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}>
            Start your free trial. Secure your team for $25/month after trial.
          </button>
        ) : (
          <a href="/auth/login?returnTo=/vault" className="btn btn-primary" style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}>
            Access Vault
          </a>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {isCommercial ? (
          <>
            <a href="#pricing" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Pricing</a>
            <a href="/community" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Community Edition</a>
          </>
        ) : (
          <a href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Commercial SaaS</a>
        )}
        <a href="/tutorial" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>User Guide</a>
        <a href="/verify" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Verify Download</a>
        <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Terms of Service</a>
        <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Privacy Policy</a>
        <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Contact</a>
      </div>
      <p>&copy; {new Date().getFullYear()} TeamVault &middot; All rights reserved.</p>
    </footer>
  )
}
