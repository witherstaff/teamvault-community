'use client'

import React from 'react'

interface LandingHeroProps {
  user: any
  onStartTrial?: () => void
  isCommercial?: boolean
}

export function LandingHero({ user, onStartTrial, isCommercial = true }: LandingHeroProps) {
  return (
    <header className="landing-section">
      <div className="landing-hero">
        <div className="landing-hero-content">
          <h1>
            {isCommercial
              ? 'Secure file sharing without per-user pricing.'
              : 'Secure, self-hosted file vault for teams.'}
          </h1>
          {isCommercial ? (
            <p>
              Unlimited users, controlled access, verified downloads, and complete audit history from $25/month.
            </p>
          ) : (
            <div style={{ marginBottom: '2rem' }}>
              <p style={{ marginBottom: '1rem' }}>
                TeamVault Community is the source-available, self-hosted edition of TeamVault, with unlimited users, controlled access, verified downloads, and complete audit history.
              </p>
              <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Prefer a fully managed service? TeamVault Cloud handles the hosting, infrastructure, updates, backups, and technical operations for you.
              </p>
              <a
                href="https://www.teamvault.cloud/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}
              >
                Visit TeamVault Cloud →
              </a>
            </div>
          )}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {user ? (
              <a href="/vault" className="btn btn-primary" style={{ padding: '0.875rem 1.5rem', fontSize: '1rem' }}>Enter Vault</a>
            ) : isCommercial ? (
              <button onClick={onStartTrial} className="btn btn-primary" style={{ padding: '0.875rem 1.5rem', fontSize: '1rem' }}>
                Start your free trial. Secure your team for $25/month after trial.
              </button>
            ) : (
              <a href="/auth/login?returnTo=/vault" className="btn btn-primary" style={{ padding: '0.875rem 1.5rem', fontSize: '1rem' }}>
                Access Vault
              </a>
            )}
            {isCommercial ? (
              <a href="#pricing" className="btn btn-secondary" style={{ padding: '0.875rem 1.5rem', fontSize: '1rem' }}>View Pricing</a>
            ) : (
              <a href="#features" className="btn btn-secondary" style={{ padding: '0.875rem 1.5rem', fontSize: '1rem' }}>Explore Features</a>
            )}
          </div>
        </div>

        <div className="landing-hero-login">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', textAlign: 'center' }}>Access your Vault</h2>
          <p className="text-muted text-center mb-4 text-sm">For existing teams and invited users</p>
          {user ? (
            <a
              href="/vault"
              className="btn btn-primary w-full"
              style={{ display: 'flex', justifyContent: 'center', padding: '0.875rem 1rem', fontSize: '0.9375rem' }}
            >
              Go to Vault →
            </a>
          ) : (
            <a
              href="/auth/login?returnTo=/vault"
              className="btn btn-primary w-full"
              style={{ display: 'flex', justifyContent: 'center', padding: '0.875rem 1rem', fontSize: '0.9375rem' }}
            >
              Continue to Login
            </a>
          )}
        </div>
      </div>
    </header>
  )
}
