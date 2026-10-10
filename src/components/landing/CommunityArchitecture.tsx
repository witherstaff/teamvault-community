'use client'

import React from 'react'
import Link from 'next/link'

export function CommunityArchitecture() {
  return (
    <section id="architecture" className="landing-section landing-section-alt">
      <div className="max-w-3xl text-center mb-12">
        <h2>Open Architecture. Complete Ownership.</h2>
        <p className="mt-4 text-secondary">
          Deploy TeamVault Community on your own infrastructure. Connect any S3-compatible storage backend with zero vendor lock-in and unlimited team members.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', width: '100%', maxWidth: '1200px' }}>
        <div className="landing-card">
          <div className="landing-card-icon">🗄️</div>
          <div className="text-sm font-semibold text-accent mb-2 uppercase tracking-wide">Bring Your Own Storage</div>
          <p className="text-sm text-secondary mb-3">Seamless integration with any S3-compatible object storage provider:</p>
          <ul style={{ fontSize: '0.875rem' }}>
            <li>Cloudflare R2 (Zero egress fees)</li>
            <li>Amazon Web Services (AWS S3)</li>
            <li>Wasabi Hot Cloud Storage</li>
            <li>Backblaze B2 &amp; DigitalOcean Spaces</li>
            <li>Local / Private MinIO &amp; Ceph RGW</li>
          </ul>
        </div>

        <div className="landing-card">
          <div className="landing-card-icon">🔐</div>
          <div className="text-sm font-semibold text-accent mb-2 uppercase tracking-wide">Enterprise Security Stack</div>
          <p className="text-sm text-secondary mb-3">Engineered for defense-in-depth and strict confidentiality:</p>
          <ul style={{ fontSize: '0.875rem' }}>
            <li>AES-256 encrypted storage at rest</li>
            <li>120-second single-use token delivery</li>
            <li>Dynamic PDF downloader watermarking</li>
            <li>Verified downloads with IP/Email allowlists</li>
            <li>Tamper-resistant audit log trail</li>
          </ul>
        </div>

        <div className="landing-card">
          <div className="landing-card-icon">🖥️</div>
          <div className="text-sm font-semibold text-accent mb-2 uppercase tracking-wide">TeamVault Drive Sync</div>
          <p className="text-sm text-secondary mb-3">Native desktop client built with Go and modern web view:</p>
          <ul style={{ fontSize: '0.875rem' }}>
            <li>Windows (.msi) installer available</li>
            <li>Linux native binary available</li>
            <li>Bidirectional background sync engine</li>
            <li>System tray integration &amp; notifications</li>
            <li>Secure PKCE OAuth authentication</li>
          </ul>
        </div>
      </div>

      <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href="/tutorial" className="btn btn-secondary">
          Read the Setup Guide →
        </a>
        <a href="/auth/login?returnTo=/vault" className="btn btn-primary">
          Access Your Vault →
        </a>
      </div>
    </section>
  )
}
