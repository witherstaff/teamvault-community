'use client'
import { useUser } from '@auth0/nextjs-auth0/client'
import { useRouter, usePathname, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

function FolderIcon() {
    return (
        <svg viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
    )
}

function GridIcon() {
    return (
        <svg viewBox="0 0 20 20" fill="currentColor">
            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
    )
}

function UsersIcon() {
    return (
        <svg viewBox="0 0 20 20" fill="currentColor">
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
        </svg>
    )
}

function ShieldIcon() {
    return (
        <svg viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
    )
}

function LogOutIcon() {
    return (
        <svg viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 000-2H4V5h7a1 1 0 000-2H3zm12.293 4.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L16.586 12H8a1 1 0 010-2h8.586l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
    )
}

function TrashIcon() {
    return (
        <svg viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
    )
}

export default function VaultLayout({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useUser()
    const router = useRouter()
    const pathname = usePathname()
    const params = useParams()
    const urlWorkspaceId = params?.workspaceId as string

    const [darkMode, setDarkMode] = useState(false)
    const [isAdmin, setIsAdmin] = useState(false)
    const [workspaceName, setWorkspaceName] = useState('TeamVault')
    const [isVerifying, setIsVerifying] = useState(true)
    const [authError, setAuthError] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(false)

    // Check window width after mount to set initial sidebar state
    useEffect(() => {
        if (window.innerWidth > 768) {
            setSidebarOpen(true)
        }
    }, [])

    useEffect(() => {
        if (!isLoading && !user) {
            router.replace('/')
        }
    }, [user, isLoading, router])

    useEffect(() => {
        const saved = localStorage.getItem('tv-theme')
        if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            setDarkMode(true)
            document.documentElement.classList.add('dark')
        }
    }, [])

    useEffect(() => {
        if (!user) {
            setIsVerifying(false)
            return
        }
        const workspaceId = urlWorkspaceId
        if (!workspaceId) {
            setIsVerifying(false)
            return
        }

        fetch(`/api/user/membership?workspace_id=${workspaceId}`, { credentials: 'same-origin' })
            .then(res => {
                if (res.status === 401 || res.status === 403) setAuthError(true)
                return res.ok ? res.json() : null
            })
            .then(data => {
                if (data?.role === 'admin') setIsAdmin(true)
                if (data?.workspace_name) setWorkspaceName(data.workspace_name)
            })
            .catch(() => { })
            .finally(() => setIsVerifying(false))
    }, [user])

    const toggleTheme = () => {
        const next = !darkMode
        setDarkMode(next)
        document.documentElement.classList.toggle('dark', next)
        localStorage.setItem('tv-theme', next ? 'dark' : 'light')
    }

    if (isLoading || isVerifying) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
                <div style={{ textAlign: 'center' }}>
                    <Image src="/images/teamvault-shield-name.png" alt="TeamVault Logo" width={180} height={40} style={{ margin: '0 auto 1rem', width: 'auto', height: 40 }} priority />
                    <p className="text-muted text-sm">Verifying access…</p>
                </div>
            </div>
        )
    }

    if (!user) return null

    if (authError) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
                <div style={{ textAlign: 'center', maxWidth: 420, padding: '2.5rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <Image src="/images/teamvault-shield-name.png" alt="TeamVault Logo" width={180} height={40} style={{ margin: '0 auto 1.5rem', width: 'auto', height: 40 }} priority />
                    <h1 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#EF4444', fontWeight: 600 }}>Access Denied</h1>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                        The email address <b style={{ color: 'var(--text-primary)' }}>{user.email}</b> is either not registered or has not been invited to this workspace. Please verify you are using the correct account.
                    </p>
                    <a href="/auth/logout" className="btn btn-primary w-full" style={{ display: 'block', padding: '0.75rem 1rem', textAlign: 'center' }}>
                        Sign in with a different account
                    </a>
                </div>
            </div>
        )
    }

    const nav = [
        { href: `/vault/${urlWorkspaceId}`,             label: 'File Vault',   icon: FolderIcon },
        ...(isAdmin ? [
            { href: `/vault/${urlWorkspaceId}/admin`,       label: 'Admin Panel',  icon: ShieldIcon },
            { href: `/vault/${urlWorkspaceId}/recycle-bin`, label: 'Recycle Bin',  icon: TrashIcon  },
        ] : []),
    ]

    return (
        <div className="app-shell">
            {/* Sidebar Toggle Button */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{
                    position: 'absolute', // Absolute to app-shell
                    bottom: '1.5rem',
                    left: sidebarOpen ? '256px' : '1.5rem',
                    zIndex: 60,
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--surface-raised)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'left var(--transition)',
                    fontWeight: 700,
                    letterSpacing: '-1px'
                }}
                title={sidebarOpen ? "Close Sidebar" : "Open Sidebar"}
            >
                {sidebarOpen ? '<<' : '>>'}
            </button>

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? '' : 'closed'}`}>
                <div className="sidebar-logo">
                    <Image
                        src="/images/teamvault-shield-name.png"
                        alt="TeamVault"
                        width={150}
                        height={40}
                        style={{ objectFit: 'contain' }}
                        priority
                    />
                </div>

                <div className="sidebar-section">
                    <div className="sidebar-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.85rem' }}>{workspaceName}</span>
                        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Navigation</span>
                    </div>
                    {nav.map(({ href, label, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            className={`sidebar-item ${pathname === href || (href !== `/vault/${urlWorkspaceId}` && pathname.startsWith(href)) ? 'active' : ''}`}
                        >
                            <Icon />
                            {label}
                        </Link>
                    ))}
                </div>

                {/* Bottom section */}
                <div style={{ marginTop: 'auto', padding: '0.75rem' }}>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {/* User */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.75rem' }}>
                            {user.picture && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={user.picture} alt="" style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0 }} />
                            )}
                            <div style={{ overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                    {user.name}
                                    {isAdmin && <span className="badge badge-admin" style={{ fontSize: '0.6rem', padding: '0.125rem 0.375rem' }}>Admin</span>}
                                </div>
                                <div style={{ fontSize: '0.6875rem', color: 'var(--sidebar-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                            </div>
                            <div className="status-dot" title="Session active" style={{ flexShrink: 0 }} />
                        </div>

                        {/* Theme toggle */}
                        <button className="sidebar-item" onClick={toggleTheme}>
                            <GridIcon />
                            {darkMode ? 'Light mode' : 'Dark mode'}
                        </button>

                        {/* Logout */}
                        <a href="/auth/logout" className="sidebar-item">
                            <LogOutIcon />
                            Sign out
                        </a>
                    </div>
                </div>
            </aside>

            {/* Main area */}
            <div className="main-area" style={{ transition: 'margin-left var(--transition)', marginLeft: 0 }}>
                {children}

                {/* Mobile overlay */}
                {sidebarOpen && (
                    <div
                        className="mobile-overlay"
                        onClick={() => setSidebarOpen(false)}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.5)',
                            zIndex: 40,
                            opacity: 1,
                            transition: 'opacity var(--transition)',
                            display: 'none' // hidden by default, shown via media query if needed
                        }}
                    >
                        <style dangerouslySetInnerHTML={{
                            __html: `
                            @media (max-width: 768px) {
                                .mobile-overlay { display: block !important; }
                            }
                        `}} />
                    </div>
                )}
            </div>
        </div>
    )
}
