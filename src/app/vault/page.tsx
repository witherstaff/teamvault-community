'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@auth0/nextjs-auth0/client'
import Link from 'next/link'

function FolderIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
    )
}

type WorkspaceRole = {
    id: string
    name: string
    role: string
    status?: string
}

const IS_COMMERCIAL = process.env.NEXT_PUBLIC_COMMERCIAL_MODE === 'true'

export default function WorkspacePortal() {
    const { user, isLoading: isUserLoading } = useUser()
    const router = useRouter()
    const [workspaces, setWorkspaces] = useState<WorkspaceRole[]>([])
    const [loadingWs, setLoadingWs] = useState(true)
    const [error, setError] = useState('')
    const [actionLoading, setActionLoading] = useState(false)

    // Community Create Workspace Modal state
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newWsName, setNewWsName] = useState('')
    const [createWsError, setCreateWsError] = useState('')

    const handleCreateWorkspace = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newWsName.trim()) return

        setActionLoading(true)
        setCreateWsError('')

        try {
            const res = await fetch('/api/user/workspaces/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newWsName.trim() }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to create workspace')
            if (data.workspace_id) {
                router.push(`/vault/${data.workspace_id}`)
            } else {
                window.location.reload()
            }
        } catch (err: any) {
            console.error('Workspace creation error:', err)
            setCreateWsError(err.message || 'Failed to create workspace')
            setActionLoading(false)
        }
    }

    const startCheckout = async () => {
        setActionLoading(true)
        setError('')
        try {
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId: 'team' }),
            })
            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || `Server error (${res.status})`)
            }
            if (data.url) {
                window.location.href = data.url
            } else {
                throw new Error('No checkout URL returned')
            }
        } catch (e: any) {
            console.error('Failed to start trial', e)
            setError(e.message || 'Failed to start checkout process. Please try again.')
            setActionLoading(false)
        }
    }

    const onAddWorkspaceClick = () => {
        if (IS_COMMERCIAL) {
            startCheckout()
        } else {
            setShowCreateModal(true)
        }
    }

    useEffect(() => {
        if (isUserLoading) return
        if (!user) {
            router.push('/auth/login?returnTo=/vault')
            return
        }

        // Restore a deep link URL that was saved before the Auth0 login redirect
        const pending = localStorage.getItem('tv_pending_redirect')
        if (pending) {
            localStorage.removeItem('tv_pending_redirect')
            window.location.href = pending
            return
        }

        const isCheckoutSuccess = window.location.search.includes('checkout=success')
        let checkoutRetries = 0
        const MAX_CHECKOUT_RETRIES = 15 // 30 seconds total

        const trialIntent = localStorage.getItem('tv_trial_intent') === '1'
        if (trialIntent) localStorage.removeItem('tv_trial_intent')

        const checkWorkspaces = () => {
            fetch('/api/user/workspaces')
                .then(res => {
                    if (res.status === 401) return [] // Unrecognized user = 0 workspaces
                    if (!res.ok) throw new Error('Failed to load workspaces')
                    return res.json()
                })
                .then(data => {
                    if (data.length === 1 && !trialIntent) {
                        // Auto-redirect if they have exactly one workspace (unless they clicked Start Trial)
                        router.push(`/vault/${data[0].id}`)
                    } else if (data.length > 1 || (data.length === 1 && trialIntent)) {
                        // Show workspace selection screen
                        setWorkspaces(data)
                        setLoadingWs(false)
                    } else if (isCheckoutSuccess && checkoutRetries < MAX_CHECKOUT_RETRIES) {
                        // Webhook may still be processing — poll until workspace appears
                        checkoutRetries++
                        setTimeout(checkWorkspaces, 2000)
                    } else {
                        if (isCheckoutSuccess) {
                            setError('Your workspace is taking longer than expected to set up. Please contact support or try refreshing the page in a minute.')
                        }
                        setWorkspaces(data)
                        setLoadingWs(false)
                    }
                })
                .catch(err => {
                    setError(err.message)
                    setLoadingWs(false)
                })
        }

        checkWorkspaces()
    }, [user, isUserLoading, router])

    const isCheckoutProcessing = loadingWs && typeof window !== 'undefined' && window.location.search.includes('checkout=success')

    if (isUserLoading || loadingWs) {
        return (
            <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
                <span className="text-muted text-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexDirection: 'column' }}>
                    <span style={{ animation: 'spin 1s linear infinite', fontSize: '2rem', marginBottom: '1rem' }}>⏳</span>
                    {isCheckoutProcessing ? 'Setting up your new workspace...' : 'Loading your workspaces...'}
                </span>
            </div>
        )
    }

    if (error) {
        return (
            <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', background: 'var(--bg)' }}>
                <span className="text-error font-medium">{error}</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={() => window.location.reload()}>Retry</button>
                    <Link href="/" className="btn btn-secondary">Return Home</Link>
                </div>
            </div>
        )
    }

    if (workspaces.length === 0) {
        return (
            <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', background: 'var(--bg)' }}>
                <div style={{ fontSize: '3rem' }}>🚀</div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Welcome to TeamVault</h2>
                <p className="text-muted" style={{ maxWidth: 400, textAlign: 'center' }}>
                    You don't belong to any workspaces yet. You can create a new workspace or wait for an invitation.
                </p>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button onClick={onAddWorkspaceClick} disabled={actionLoading} className="btn btn-primary">
                        {actionLoading ? 'Loading...' : (IS_COMMERCIAL ? 'Start 14-Day Free Trial' : 'Create Your First Workspace')}
                    </button>
                    <a href="/auth/logout" className="btn btn-secondary">Sign Out</a>
                </div>

                {showCreateModal && (
                    <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '1.5rem', background: 'var(--surface)' }}>
                            <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Create New Workspace</h3>
                            <form onSubmit={handleCreateWorkspace}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label className="text-sm text-secondary" style={{ display: 'block', marginBottom: '0.5rem' }}>Workspace Name</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="e.g. Acme Vault"
                                        value={newWsName}
                                        onChange={e => setNewWsName(e.target.value)}
                                        required
                                        autoFocus
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                {createWsError && <p className="text-error text-xs mb-3">{createWsError}</p>}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)} disabled={actionLoading}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" disabled={actionLoading || !newWsName.trim()}>
                                        {actionLoading ? 'Creating...' : 'Create Workspace'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{
                height: 64,
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 2rem',
                background: 'var(--surface)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.02em', color: 'var(--accent)' }}>TeamVault</div>
                    <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>Workspaces</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className="text-muted text-sm">{user?.email}</span>
                    <a href="/auth/logout" className="btn btn-ghost btn-sm">Sign Out</a>
                </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: '3rem 2rem', maxWidth: 1000, margin: '0 auto', width: '100%' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Select a Workspace</h1>
                    <p className="text-muted">Choose a workspace to access its encrypted file vault and settings.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    {workspaces.map(ws => (
                        <Link
                            key={ws.id}
                            href={`/vault/${ws.id}`}
                            className="card"
                            style={{
                                padding: '1.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                textDecoration: 'none',
                                color: 'inherit',
                                transition: 'transform 0.15s, box-shadow 0.15s',
                                cursor: 'pointer',
                                border: '1px solid var(--border)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)'
                                e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)'
                                e.currentTarget.style.borderColor = 'var(--accent)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)'
                                e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                                e.currentTarget.style.borderColor = 'var(--border)'
                            }}
                        >
                            <div style={{
                                width: 48, height: 48,
                                borderRadius: '12px',
                                background: 'var(--surface-active)',
                                color: 'var(--accent)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <FolderIcon />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: '1.125rem', marginBottom: '0.25rem' }}>{ws.name}</div>
                                <div className="mono text-muted text-xs">{ws.id.slice(0, 13)}...</div>
                            </div>
                            <div>
                                {ws.status === 'invited' ? (
                                    <span className="badge badge-invited">Invited</span>
                                ) : (
                                    <span className={`badge badge-${ws.role === 'admin' ? 'admin' : 'active'}`}>
                                        {ws.role === 'admin' ? 'Admin' : 'Member'}
                                    </span>
                                )}
                            </div>
                        </Link>
                    ))}

                    {/* Add Workspace Button */}
                    <button
                        onClick={onAddWorkspaceClick}
                        disabled={actionLoading}
                        className="card"
                        style={{
                            padding: '1.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            background: 'transparent',
                            border: '1px dashed var(--border-strong)',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            transition: 'all 0.15s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--accent)'
                            e.currentTarget.style.color = 'var(--accent)'
                            e.currentTarget.style.backgroundColor = 'var(--accent-subtle)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-strong)'
                            e.currentTarget.style.color = 'var(--text-secondary)'
                            e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                    >
                        <div style={{
                            width: 48, height: 48,
                            borderRadius: '12px',
                            background: 'var(--bg-subtle)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.5rem', fontWeight: 300
                        }}>+</div>
                        <div style={{ flex: 1, textAlign: 'left' }}>
                            <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>Create New Workspace</div>
                        </div>
                    </button>

                </div>
            </div>

            {/* Create Workspace Modal */}
            {showCreateModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        <h3 style={{ marginBottom: '1rem', fontWeight: 600, fontSize: '1.25rem' }}>Create New Workspace</h3>
                        <form onSubmit={handleCreateWorkspace}>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label className="text-sm text-secondary" style={{ display: 'block', marginBottom: '0.5rem' }}>Workspace Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g. Acme Vault"
                                    value={newWsName}
                                    onChange={e => setNewWsName(e.target.value)}
                                    required
                                    autoFocus
                                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border)' }}
                                />
                            </div>
                            {createWsError && <p className="text-error text-xs mb-3">{createWsError}</p>}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)} disabled={actionLoading}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={actionLoading || !newWsName.trim()}>
                                    {actionLoading ? 'Creating...' : 'Create Workspace'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}} />
        </div>
    )
}
