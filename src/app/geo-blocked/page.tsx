'use client'
import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

interface BlockInfo {
    ip: string
    countryCode: string | null
    countryName: string | null
    region: string | null
    city: string | null
    bypassAllowed: boolean
    userEmail: string | null
}

function GeoBlockedContent() {
    const params = useSearchParams()
    const workspaceId = params.get('workspace_id') ?? ''
    const returnTo = params.get('return_to') ?? '/vault'
    const errorParam = params.get('error') ?? ''

    const [info, setInfo] = useState<BlockInfo | null>(null)
    const [loading, setLoading] = useState(true)

    // Bypass UI state
    const [codeSent, setCodeSent] = useState(false)
    const [sending, setSending] = useState(false)
    const [code, setCode] = useState('')
    const [verifying, setVerifying] = useState(false)
    const [verifyError, setVerifyError] = useState('')
    const [sendError, setSendError] = useState('')

    useEffect(() => {
        if (!workspaceId) { setLoading(false); return }
        fetch(`/api/geo/block-info?workspace_id=${workspaceId}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setInfo(d) })
            .finally(() => setLoading(false))
    }, [workspaceId])

    const requestCode = async () => {
        setSending(true); setSendError('')
        try {
            const res = await fetch('/api/geo/request-bypass', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspace_id: workspaceId }),
            })
            if (res.ok) {
                setCodeSent(true)
            } else {
                const e = await res.json()
                setSendError(e.error || 'Failed to send code')
            }
        } catch {
            setSendError('Network error — please try again')
        } finally {
            setSending(false)
        }
    }

    const verifyCode = async () => {
        if (!code.trim()) return
        setVerifying(true); setVerifyError('')
        try {
            const res = await fetch('/api/geo/verify-bypass', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspace_id: workspaceId, code: code.trim().toUpperCase() }),
            })
            if (res.ok) {
                // Server sets the bypass cookie in Set-Cookie; redirect back to vault.
                window.location.href = decodeURIComponent(returnTo)
            } else {
                const e = await res.json()
                setVerifyError(e.error === 'locked'
                    ? 'Too many incorrect attempts. Please request a new code.'
                    : e.error === 'expired'
                        ? 'Code has expired. Please request a new one.'
                        : 'Invalid code. Please check and try again.')
                if (e.error === 'locked' || e.error === 'expired') {
                    setCodeSent(false); setCode('')
                }
            }
        } catch {
            setVerifyError('Network error — please try again')
        } finally {
            setVerifying(false)
        }
    }

    const locationParts = [info?.city, info?.region, info?.countryName].filter(Boolean)
    const locationStr = locationParts.length ? locationParts.join(', ') : null

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg, #f9fafb)', padding: '2rem',
            fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        }}>
            <div style={{
                background: 'var(--surface, #fff)', border: '1px solid var(--border, #e5e7eb)',
                borderRadius: '12px', padding: '2.5rem', maxWidth: '480px', width: '100%',
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔒</div>
                    <h1 style={{ fontSize: '1.375rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-primary, #111)' }}>
                        Access Restricted
                    </h1>
                    <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: '0.9375rem', margin: 0 }}>
                        Your location is not permitted to access this workspace.
                    </p>
                </div>

                {/* Location info card */}
                {!loading && info && (
                    <div style={{
                        background: 'var(--bg-subtle, #f3f4f6)', borderRadius: '8px',
                        padding: '1rem 1.25rem', marginBottom: '1.5rem',
                        fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.375rem',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted, #6b7280)' }}>Your IP</span>
                            <span style={{ fontFamily: 'monospace', color: 'var(--text-primary, #111)' }}>{info.ip}</span>
                        </div>
                        {locationStr && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted, #6b7280)' }}>Location</span>
                                <span style={{ color: 'var(--text-primary, #111)' }}>{locationStr}</span>
                            </div>
                        )}
                        {info.countryCode && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted, #6b7280)' }}>Country code</span>
                                <span style={{ fontFamily: 'monospace', color: 'var(--text-primary, #111)' }}>{info.countryCode}</span>
                            </div>
                        )}
                    </div>
                )}

                {loading && (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted, #6b7280)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                        Loading location info…
                    </div>
                )}

                {/* Bypass section */}
                {!loading && info?.bypassAllowed && (
                    <div style={{ borderTop: '1px solid var(--border, #e5e7eb)', paddingTop: '1.5rem' }}>
                        {!codeSent ? (
                            <>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #374151)', marginBottom: '1rem', margin: '0 0 1rem 0' }}>
                                    {info.userEmail
                                        ? <>A one-time bypass code can be sent to <strong>{info.userEmail}</strong>.</>
                                        : <>A one-time bypass code can be emailed to you.</>}
                                    {' '}The code is valid for 5 minutes.
                                </p>
                                {sendError && (
                                    <div style={{ color: 'var(--error, #ef4444)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{sendError}</div>
                                )}
                                <button
                                    onClick={requestCode}
                                    disabled={sending}
                                    style={{
                                        width: '100%', padding: '0.625rem 1rem',
                                        background: 'var(--accent, #2563eb)', color: '#fff',
                                        border: 'none', borderRadius: '6px', fontSize: '0.9375rem',
                                        fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer',
                                        opacity: sending ? 0.7 : 1,
                                    }}
                                >
                                    {sending ? 'Sending…' : 'Send Bypass Code'}
                                </button>
                            </>
                        ) : (
                            <>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #374151)', margin: '0 0 1rem 0' }}>
                                    A bypass code has been sent to your email. Enter it below:
                                </p>
                                <input
                                    type="text"
                                    value={code}
                                    onChange={e => setCode(e.target.value.toUpperCase())}
                                    onKeyDown={e => e.key === 'Enter' && verifyCode()}
                                    placeholder="XXXXXXXX"
                                    maxLength={8}
                                    style={{
                                        width: '100%', padding: '0.625rem 0.875rem',
                                        border: '1px solid var(--border, #e5e7eb)',
                                        borderRadius: '6px', fontSize: '1.25rem',
                                        fontFamily: 'monospace', letterSpacing: '0.2em',
                                        textAlign: 'center', marginBottom: '0.75rem',
                                        boxSizing: 'border-box',
                                        background: 'var(--surface, #fff)',
                                        color: 'var(--text-primary, #111)',
                                    }}
                                />
                                {verifyError && (
                                    <div style={{ color: 'var(--error, #ef4444)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{verifyError}</div>
                                )}
                                <button
                                    onClick={verifyCode}
                                    disabled={verifying || code.length < 6}
                                    style={{
                                        width: '100%', padding: '0.625rem 1rem',
                                        background: 'var(--accent, #2563eb)', color: '#fff',
                                        border: 'none', borderRadius: '6px', fontSize: '0.9375rem',
                                        fontWeight: 600, cursor: (verifying || code.length < 6) ? 'not-allowed' : 'pointer',
                                        opacity: (verifying || code.length < 6) ? 0.6 : 1,
                                    }}
                                >
                                    {verifying ? 'Verifying…' : 'Verify Code'}
                                </button>
                                <button
                                    onClick={() => { setCodeSent(false); setCode(''); setSendError(''); setVerifyError('') }}
                                    style={{
                                        width: '100%', marginTop: '0.5rem', padding: '0.5rem',
                                        background: 'transparent', border: 'none',
                                        fontSize: '0.8125rem', color: 'var(--text-muted, #6b7280)',
                                        cursor: 'pointer', textDecoration: 'underline',
                                    }}
                                >
                                    Resend code
                                </button>
                            </>
                        )}
                    </div>
                )}

                {!loading && !info?.bypassAllowed && (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted, #6b7280)', textAlign: 'center', marginTop: '0.5rem' }}>
                        Contact your workspace administrator if you believe this is an error.
                    </p>
                )}

                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <a
                        href="/auth/logout"
                        style={{ fontSize: '0.8125rem', color: 'var(--text-muted, #6b7280)', textDecoration: 'underline' }}
                    >
                        Sign out
                    </a>
                </div>
            </div>
        </div>
    )
}

export default function GeoBlockedPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: '#6b7280' }}>Loading…</div>
            </div>
        }>
            <GeoBlockedContent />
        </Suspense>
    )
}
