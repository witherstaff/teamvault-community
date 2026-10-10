'use client'

import React from 'react'
import Image from 'next/image'

interface LandingNavProps {
  user: any
  onStartTrial?: () => void
  isCommercial?: boolean
}

export function LandingNav({ user, onStartTrial, isCommercial = true }: LandingNavProps) {
  return (
    <nav className="landing-nav">
      <Image src="/images/teamvault-shield-name.png" alt="TeamVault Logo" width={180} height={40} style={{ width: 'auto', height: 40 }} priority />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* Downloads dropdown */}
        <div style={{ position: 'relative' }} className="nav-dropdown">
          <button className="btn btn-ghost" style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            Downloads
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style={{ opacity: 0.6 }}>
              <path d="M6 8L1 3h10L6 8z" />
            </svg>
          </button>
          <div className="nav-dropdown-menu">
            <div className="nav-dropdown-inner">
              <a href="/Downloads/teamvault-drive.msi" download="teamvault-drive.msi" className="nav-dropdown-item">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0 }}>
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <div>
                  <div style={{ fontWeight: 500 }}>TeamVault Drive</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.65 }}>Windows installer (.msi)</div>
                </div>
              </a>
              <a href="/Downloads/teamvault-drive-linux" download="teamvault-drive-linux" className="nav-dropdown-item">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0 }}>
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <div>
                  <div style={{ fontWeight: 500 }}>TeamVault Drive</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.65 }}>Linux executable</div>
                </div>
              </a>
            </div>
          </div>
        </div>
        {isCommercial ? (
          <>
            <a href="/agent" className="btn btn-ghost" style={{ fontSize: '0.875rem' }}>Agent API</a>
            <a href="/community" className="btn btn-ghost" style={{ fontSize: '0.875rem' }}>Community</a>
          </>
        ) : (
          <a href="/" className="btn btn-ghost" style={{ fontSize: '0.875rem' }}>Commercial SaaS</a>
        )}
        <a href="/tutorial" className="btn btn-ghost" style={{ fontSize: '0.875rem' }}>User Guide</a>
        <a href="/verify" className="btn btn-ghost" style={{ fontSize: '0.875rem' }}>Verify Download</a>
        {user ? (
          <>
            <a href="/auth/logout" className="btn btn-ghost" style={{ marginLeft: '0.25rem' }}>Log out</a>
            <a href="/vault" className="btn btn-primary">Go to Vault</a>
          </>
        ) : (
          <>
            <a href="/auth/login?returnTo=/vault" className="btn btn-ghost">Log in</a>
            {isCommercial ? (
              <button onClick={onStartTrial} className="btn btn-primary">Start 14-Day Trial</button>
            ) : (
              <a href="/auth/login?returnTo=/vault" className="btn btn-primary">Access Vault</a>
            )}
          </>
        )}
      </div>
    </nav>
  )
}
