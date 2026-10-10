'use client'

import React from 'react'

export function CloudPitchSection() {
  return (
    <section className="landing-section" style={{ borderTop: '1px solid var(--border)', padding: '5rem 2rem' }}>
      <div style={{ maxWidth: '44rem', width: '100%', textAlign: 'center', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
          Want TeamVault without managing the infrastructure?
        </h2>
        <p style={{ fontSize: '1.125rem', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '1.75rem' }}>
          Use the fully managed commercial service at{' '}
          <a
            href="https://teamvault.cloud"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'underline' }}
          >
            TeamVault Cloud
          </a>
          .
        </p>
        <div>
          <a
            href="https://teamvault.cloud"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ padding: '0.75rem 1.75rem', fontSize: '0.9375rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <span>Visit TeamVault Cloud</span>
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  )
}
