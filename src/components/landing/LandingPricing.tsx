'use client'

import React from 'react'
import Link from 'next/link'

interface LandingPricingProps {
  checkoutLoading: string | null
  onStartCheckout: (planId: string) => void
  isCommercial?: boolean
}

export function LandingPricing({ checkoutLoading, onStartCheckout, isCommercial = true }: LandingPricingProps) {
  if (!isCommercial) return null

  return (
    <section id="pricing" className="landing-section landing-section-alt">
      <div className="max-w-3xl text-center mb-12">
        <h2>Pay for storage, not seats.</h2>
        <p className="mt-4 text-secondary">
          {isCommercial
            ? 'Your team changes. Your bill shouldn\'t. Add employees, contractors, clients, and partners at any scale — your monthly price stays the same.'
            : 'Deploy TeamVault on your own cloud infrastructure. Add employees, contractors, clients, and partners with no per-user licensing fees.'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', width: '100%', maxWidth: '1300px' }}>
        <div className="landing-card">
          <div className="text-sm font-semibold text-muted mb-2 uppercase tracking-wide">Team</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            {isCommercial ? '$25' : '1 TB'}
            <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>{isCommercial ? '/mo' : ' quota'}</span>
          </div>
          <p className="mb-4" style={{ fontWeight: 500 }}>Team file security. Unlimited users.</p>
          <ul>
            <li>1 TB encrypted storage {isCommercial ? 'included' : 'quota'}</li>
            <li>Role-based access control</li>
            <li>TeamVault Drive (Win/Mac/Linux)</li>
            <li>100 Verified Downloads /mo</li>
            <li>90-day audit history</li>
          </ul>
          <button onClick={() => onStartCheckout('team')} disabled={checkoutLoading !== null} className="btn btn-secondary" style={{ width: '100%', marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
            {checkoutLoading === 'team'
              ? 'Loading...'
              : isCommercial
              ? 'Start 14-day free trial'
              : 'Deploy Team Plan'}
          </button>
        </div>

        <div className="landing-card" style={{ outline: '2px solid var(--accent)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '-12px', right: '1.5rem', background: 'var(--accent)', color: 'white', fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>POPULAR</div>
          <div className="text-sm font-semibold text-accent mb-2 uppercase tracking-wide">Pro</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            {isCommercial ? '$99' : '5 TB'}
            <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>{isCommercial ? '/mo' : ' quota'}</span>
          </div>
          <p className="mb-4" style={{ fontWeight: 500 }}>Secure file collaboration for growing teams.</p>
          <ul>
            <li>5 TB encrypted storage {isCommercial ? 'included' : 'quota'}</li>
            <li>Role-based access control</li>
            <li>TeamVault Drive (Win/Mac/Linux)</li>
            <li>500 Verified Downloads /mo</li>
            <li>1-year audit history</li>
            <li>{isCommercial ? 'Priority Support' : 'Folder-level ACLs'}</li>
          </ul>
          <button onClick={() => onStartCheckout('pro')} disabled={checkoutLoading !== null} className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
            {checkoutLoading === 'pro'
              ? 'Loading...'
              : isCommercial
              ? 'Create your team vault'
              : 'Deploy Pro Plan'}
          </button>
        </div>

        <div className="landing-card">
          <div className="text-sm font-semibold text-muted mb-2 uppercase tracking-wide">Business</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            {isCommercial ? '$199' : '8 TB'}
            <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>{isCommercial ? '/mo' : ' quota'}</span>
          </div>
          <p className="mb-4" style={{ fontWeight: 500 }}>Advanced file security for organizations.</p>
          <ul>
            <li>Long-term audit history retention</li>
            <li>Role-based access control</li>
            <li>5,000 Verified Downloads /mo</li>
            <li>8 TB encrypted storage {isCommercial ? 'included' : 'quota'}</li>
            <li>{isCommercial ? '24/7 Priority Support' : 'Geofencing & IP rules'}</li>
            <li>Custom branding &amp; administration</li>
            <li>TeamVault Drive (Win/Mac/Linux)</li>
          </ul>
          <button onClick={() => onStartCheckout('business')} disabled={checkoutLoading !== null} className="btn btn-secondary" style={{ width: '100%', marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
            {checkoutLoading === 'business'
              ? 'Loading...'
              : isCommercial
              ? 'Start free trial'
              : 'Deploy Business Plan'}
          </button>
        </div>

        <div className="landing-card" style={{ background: 'var(--bg-subtle)', border: '1px dashed var(--border)' }}>
          <div className="text-sm font-semibold text-muted mb-2 uppercase tracking-wide">Enterprise</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Custom</div>
          <p className="mb-4" style={{ fontWeight: 500 }}>Custom capacity and dedicated support for large organizations.</p>
          <ul>
            <li>Custom storage capacity</li>
            <li>Unlimited Verified Downloads</li>
            <li>Indefinite audit history</li>
            <li>Dedicated account manager</li>
            <li>Custom SLAs &amp; onboarding</li>
            <li>Volume pricing</li>
          </ul>
          <a href="mailto:enterprise@teamvault.cloud" className="btn btn-secondary" style={{ width: '100%', marginTop: '1.5rem', display: 'flex', justifyContent: 'center', textDecoration: 'none' }}>
            Contact TeamVault
          </a>
        </div>
      </div>

      {isCommercial && (
        <div style={{ marginTop: '2rem', padding: '1rem 1.5rem', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--border)', maxWidth: '900px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>🤖 Running Autonomous AI Agents?</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Provision vaults programmatically via HTTP 402 with USDC payments on Base network.</div>
          </div>
          <Link href="/agent" className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap' }}>
            Agent API &amp; Pricing →
          </Link>
        </div>
      )}

      <p className="text-sm text-muted mt-8">
        {isCommercial
          ? 'Start with a 14-day full-access trial — no credit card required. Your team changes. Your bill shouldn\'t.'
          : 'TeamVault Community is a source-available, self-hostable edition. Bring your own S3-compatible bucket (R2, AWS, Wasabi, MinIO).'}
      </p>
    </section>
  )
}
