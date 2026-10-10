'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import EnvCheckTab from '../master-admin/EnvCheckTab'

export default function InstallCheckPage() {
    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem 1.5rem', color: 'var(--text-primary)' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Image
                            src="/images/teamvault-shield-name.png"
                            alt="TeamVault"
                            width={160}
                            height={36}
                            style={{ width: 'auto', height: 32 }}
                            priority
                        />
                        <div style={{ height: 24, width: 1, background: 'var(--border)' }} />
                        <div>
                            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Installation & Environment Checker</h1>
                            <span className="text-muted text-xs">Diagnostic tool for initial deployment & self-hosting setup</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Link href="/" className="btn btn-ghost" style={{ fontSize: '0.85rem' }}>
                            Homepage
                        </Link>
                        <Link href="/auth/login" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                            Proceed to Login →
                        </Link>
                    </div>
                </div>

                {/* Prominent Security Notice Banner */}
                <div
                    style={{
                        background: 'rgba(234, 88, 12, 0.08)',
                        border: '1px solid rgba(234, 88, 12, 0.35)',
                        borderRadius: 'var(--radius)',
                        padding: '1.25rem 1.5rem',
                        marginBottom: '2rem',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                        <span style={{ fontSize: '1.35rem', lineHeight: 1 }}>⚠️</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f97316', marginBottom: '0.35rem' }}>
                                SECURITY NOTICE: REMOVE OR DISABLE THIS PAGE ONCE SYSTEM IS OPERATIONAL
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 0.6rem 0', lineHeight: 1.5 }}>
                                This installation check is publicly accessible without Auth0 authentication so you can verify environment variables, database keys, and storage connectivity before logging in. Secrets are automatically masked, but configuration metadata is visible.
                            </p>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                <strong>To secure your deployment after verification:</strong>
                                <ul style={{ margin: '0.35rem 0 0 1.25rem', padding: 0 }}>
                                    <li>
                                        <strong>Recommended (No code edit):</strong> Add <code>DISABLE_INSTALL_CHECK=true</code> to your environment variables (in Vercel or <code>.env.local</code>).
                                    </li>
                                    <li>
                                        <strong>Permanent:</strong> Delete the <code>src/app/install-check/</code> and <code>src/app/api/install-check/</code> directories from your repository.
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Environment Variable Auditor */}
                <EnvCheckTab apiEndpoint="/api/install-check" showCommercialScope={false} />

                {/* Footer Link */}
                <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                    <span className="text-muted text-xs">
                        TeamVault Community Edition · Self-Hosted Diagnostic Console
                    </span>
                </div>
            </div>
        </div>
    )
}
