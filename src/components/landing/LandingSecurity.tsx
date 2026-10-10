'use client'

import React from 'react'

export function LandingSecurity() {
  return (
    <section className="landing-section">
      <div className="max-w-3xl text-center mb-12">
        <h2>Security explained in plain English.</h2>
        <p className="mt-4 text-secondary">Built on enterprise-grade cloud infrastructure so your data is highly available and deeply secured.</p>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2rem', marginTop: '3rem' }}>
          <div style={{ textAlign: 'left', width: '220px' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔑</div>
            <div className="font-semibold mb-1">Encrypted Storage</div>
            <div className="text-sm text-secondary">Files are encrypted at rest using AES-256 encryption.</div>
          </div>
          <div style={{ textAlign: 'left', width: '220px' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏱️</div>
            <div className="font-semibold mb-1">Secure Tokens</div>
            <div className="text-sm text-secondary">Links expire automatically after 120 seconds.</div>
          </div>
          <div style={{ textAlign: 'left', width: '220px' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔍</div>
            <div className="font-semibold mb-1">Traceable Watermarking</div>
            <div className="text-sm text-secondary">Automatically watermark sensitive PDFs so shared copies can be traced back to the recipient.</div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl w-full" style={{ borderTop: '1px solid var(--border)', paddingTop: '4rem', marginTop: '2rem' }}>
        <h3 className="text-center mb-8 text-xl">The TeamVault security journey:</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', textAlign: 'center' }}>
          <div>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--text-primary)', color: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontWeight: 700 }}>1</div>
            <div className="font-semibold mb-1">Upload securely</div>
            <div className="text-sm text-secondary">AES-256 encrypted at rest</div>
          </div>
          <div>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--text-primary)', color: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontWeight: 700 }}>2</div>
            <div className="font-semibold mb-1">Control access</div>
            <div className="text-sm text-secondary">Role-based, folder-level permissions</div>
          </div>
          <div>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--text-primary)', color: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontWeight: 700 }}>3</div>
            <div className="font-semibold mb-1">Verify recipients</div>
            <div className="text-sm text-secondary">Email &amp; IP restrictions before delivery</div>
          </div>
          <div>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--text-primary)', color: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontWeight: 700 }}>4</div>
            <div className="font-semibold mb-1">Track downloads</div>
            <div className="text-sm text-secondary">Every action logged with identity &amp; timestamp</div>
          </div>
          <div>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--text-primary)', color: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontWeight: 700 }}>5</div>
            <div className="font-semibold mb-1">Revoke instantly</div>
            <div className="text-sm text-secondary">Server-side revocation across all devices</div>
          </div>
          <div>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--text-primary)', color: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontWeight: 700 }}>6</div>
            <div className="font-semibold mb-1">Retain audit history</div>
            <div className="text-sm text-secondary">Tamper-resistant record of every action</div>
          </div>
        </div>
      </div>
    </section>
  )
}
