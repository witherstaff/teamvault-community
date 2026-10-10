'use client'

import React from 'react'

interface LandingFeaturesProps {
  isCommercial?: boolean
}

export function LandingFeatures({ isCommercial = true }: LandingFeaturesProps) {
  return (
    <>
      {/* Differentiators */}
      <section id="features" className="landing-section landing-section-alt">
        <div className="max-w-3xl text-center mb-12">
          <h2>Secure team file sharing and controlled document access.</h2>
          <p className="mt-4 text-secondary">
            {isCommercial
              ? 'Know who can access a file, who downloaded it, and when. Your employees, contractors, and clients can all collaborate without adding another seat charge.'
              : 'Know who can access a file, who downloaded it, and when. Your employees, contractors, and clients can all collaborate with zero per-user seat limits.'}
          </p>
        </div>

        <div className="landing-grid-3">
          <div className="landing-card">
            <div className="landing-card-icon">🔒</div>
            <h3>Team-Based Vaults</h3>
            <p>One unified vault per team. Centralized administrative control with strict, default-deny role-based permissions.</p>
          </div>
          <div className="landing-card">
            <div className="landing-card-icon">💻</div>
            <h3>TeamVault Drive</h3>
            <p>Native desktop synchronization for <strong>Windows, macOS, and Linux</strong>. Background operations and local performance included.</p>
          </div>
          <div className="landing-card">
            <div className="landing-card-icon">🛡️</div>
            <h3>Verified Downloads</h3>
            <p>Rule-based distribution with <strong>IP/Email restrictions</strong>, download quotas, and automated PDF watermarking.</p>
          </div>
          <div className="landing-card">
            {isCommercial ? (
              <>
                <div className="landing-card-icon">💰</div>
                <h3>Flat Pricing</h3>
                <p>No per-user SaaS charges. No hidden fees or surprise bills. Simple, predictable storage tiers for unlimited users.</p>
              </>
            ) : (
              <>
                <div className="landing-card-icon">🚀</div>
                <h3>Self-Hosted &amp; Independent</h3>
                <p>Deploy on your own infrastructure. Connect any S3-compatible storage (Cloudflare R2, AWS, Wasabi, MinIO) with zero vendor lock-in.</p>
              </>
            )}
          </div>
          <div className="landing-card">
            <div className="landing-card-icon">🧾</div>
            <h3>Audit &amp; Accountability</h3>
            <p>Comprehensive activity tracking. Every view, download, deletion, and permission change is permanently logged.</p>
          </div>
          <div className="landing-card">
            <div className="landing-card-icon">⚙️</div>
            <h3>Secure Session Delivery</h3>
            <p>No public permanent URLs. Files are delivered exclusively via temporary access tokens that expire in 120 seconds.</p>
          </div>
        </div>
      </section>

      {/* Why TeamVault */}
      <section className="landing-section">
        <div className="max-w-3xl text-center mb-12">
          <h2>Why TeamVault?</h2>
          <p className="mt-4 text-secondary">
            {isCommercial
              ? 'Most business storage charges by seat. TeamVault charges for the workspace — one flat price, unlimited employees, contractors, clients, and partners.'
              : 'Most business storage locks you into expensive per-user licenses. TeamVault Community runs on your own infrastructure with unlimited employees, contractors, clients, and partners.'}
          </p>
        </div>
        <div style={{ maxWidth: '700px', width: '100%' }}>
          <div className="landing-card">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9375rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600, width: '40%' }}></th>
                  <th style={{ textAlign: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', color: 'var(--error)', fontWeight: 600 }}>Seat-based storage</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', color: 'var(--success)', fontWeight: 600 }}>
                    {isCommercial ? 'TeamVault' : 'TeamVault Community'}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>User model</td>
                  <td style={{ textAlign: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', color: 'var(--error)' }}>Rises with every user</td>
                  <td style={{ textAlign: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', color: 'var(--success)' }}>
                    {isCommercial ? 'One workspace price' : 'Unlimited users'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>Add a collaborator</td>
                  <td style={{ textAlign: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', color: 'var(--error)' }}>Pay more</td>
                  <td style={{ textAlign: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', color: 'var(--success)' }}>
                    {isCommercial ? 'No change' : 'Unlimited users'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '0.75rem 1rem' }}>20-person team</td>
                  <td style={{ textAlign: 'center', padding: '0.75rem 1rem', color: 'var(--error)' }}>20× seat fee</td>
                  <td style={{ textAlign: 'center', padding: '0.75rem 1rem', color: 'var(--success)', fontWeight: 700 }}>
                    {isCommercial ? 'Still $25/month' : 'Unlimited users'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="landing-section landing-section-alt">
        <div className="max-w-3xl text-center mb-12">
          <h2>
            {isCommercial
              ? 'One workspace price. Unlimited users.'
              : 'Self-hosted sovereignty. Unlimited users.'}
          </h2>
          <p className="mt-4 text-secondary">
            {isCommercial
              ? 'Seat-based storage: price rises with every user. TeamVault: one workspace price, unlimited users.'
              : 'Seat-based cloud storage locks you in. TeamVault Community gives your team full data ownership with unlimited users.'}
          </p>
        </div>
        <div className="landing-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', maxWidth: '1000px', width: '100%' }}>
          <div className="landing-card" style={{ borderLeft: '4px solid var(--error)' }}>
            <h3 className="mb-4 text-error">The Old Way</h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <li style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9375rem' }}>❌ Permanent, public links that never expire.</li>
              <li style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9375rem' }}>❌ Ex-employees retain access to synced folders.</li>
              <li style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9375rem' }}>❌ No visibility into who downloaded what and when.</li>
              <li style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9375rem' }}>❌ Files are easily leaked without any traceability.</li>
            </ul>
          </div>
          <div className="landing-card" style={{ borderLeft: '4px solid var(--success)' }}>
            <h3 className="mb-4 text-success"> The TeamVault Way</h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <li style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9375rem' }}>✅ Temporary, 120-second access tokens only.</li>
              <li style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9375rem' }}>✅ Instant server-side revocation for all devices.</li>
              <li style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9375rem' }}>
                {isCommercial
                  ? '✅ Tamper-resistant audit history, with retention based on plan.'
                  : '✅ Tamper-resistant audit history with full forensic logs.'}
              </li>
              <li style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9375rem' }}>✅ Dynamic PDF watermarking with downloader info.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Target Audience */}
      <section className="landing-section">
        <div className="landing-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', maxWidth: '1000px', width: '100%', alignItems: 'center' }}>
          <div>
            <h2 className="mb-4">Built for teams that share sensitive files.</h2>
            <p className="text-secondary mb-4">
              {isCommercial
                ? 'Your team changes. Your bill shouldn\'t. TeamVault charges for the workspace — not every seat.'
                : 'Your team changes. Your control stays absolute. TeamVault provides complete vault security with unlimited collaborators.'}
            </p>
            <p className="text-secondary">Best for teams that regularly share sensitive files with employees, contractors, clients, or outside partners.</p>
          </div>
          <div className="landing-card" style={{ background: 'var(--bg-subtle)' }}>
            <h3 className="mb-4">Perfect for:</h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <li style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}><span style={{ color: 'var(--success)' }}>✓</span> Development teams</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', paddingLeft: '1.75rem' }}>Give developers, QA, contractors, and customers secure access without per-user licensing.</span>
              </li>
              <li style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}><span style={{ color: 'var(--success)' }}>✓</span> Digital Agencies</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', paddingLeft: '1.75rem' }}>
                  {isCommercial
                    ? 'Share files with every client without paying for every client login.'
                    : 'Share files with every client with strict access control and complete visibility.'}
                </span>
              </li>
              <li style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}><span style={{ color: 'var(--success)' }}>✓</span> Startups &amp; Fundraising</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', paddingLeft: '1.75rem' }}>
                  {isCommercial
                    ? 'A simple secure data room for investors, attorneys, and advisors without traditional VDR pricing.'
                    : 'A simple secure data room for investors, attorneys, and advisors with watermarking and download logs.'}
                </span>
              </li>
              <li style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}><span style={{ color: 'var(--success)' }}>✓</span> Legal &amp; Professional Services</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', paddingLeft: '1.75rem' }}>Securely exchange client files while keeping access, downloads, and changes auditable.</span>
              </li>
              <li style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}><span style={{ color: 'var(--success)' }}>✓</span> Operations &amp; HR</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', paddingLeft: '1.75rem' }}>Manage onboarding, offboarding, and sensitive documents with instant revocation when relationships end.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  )
}
