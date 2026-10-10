'use client'

import React, { useEffect, useState } from 'react'
import { useUser } from '@auth0/nextjs-auth0/client'
import { useRouter } from 'next/navigation'
import { TabBtn, Stats } from './components/shared'
import StatsTab from './tabs/StatsTab'
import WorkspacesTab from './tabs/WorkspacesTab'
import AbuseTab from './tabs/AbuseTab'
import EnvCheckTab, { EnvCheckResponse } from './EnvCheckTab'

export default function MasterAdminPage() {
    const { user, isLoading: userLoading } = useUser()
    const router = useRouter()
    const [tab, setTab] = useState<'stats' | 'workspaces' | 'abuse' | 'env'>('stats')
    const [envSummary, setEnvSummary] = useState<EnvCheckResponse['summary'] | null>(null)
    const [stats, setStats] = useState<Stats | null>(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const [refreshed, setRefreshed] = useState<Date | null>(null)

    const loadStats = async () => {
        setLoading(true)
        setError('')
        try {
            const res = await fetch('/api/master-admin/stats')
            if (res.status === 401) { router.push('/auth/login?returnTo=/master-admin'); return }
            if (res.status === 403) { setError('Access denied.'); setLoading(false); return }
            if (!res.ok) throw new Error('Failed to load stats')
            setStats(await res.json())
            setRefreshed(new Date())
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (userLoading) return
        if (!user) { router.push('/auth/login?returnTo=/master-admin'); return }
        loadStats()
    }, [user, userLoading]) // eslint-disable-line react-hooks/exhaustive-deps

    if (userLoading || loading) {
        return (
            <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
                <span className="text-muted text-sm">Loading…</span>
            </div>
        )
    }

    if (error) {
        return (
            <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', background: 'var(--bg)' }}>
                <span className="text-error">{error}</span>
                <a href="/" className="btn btn-secondary">Home</a>
            </div>
        )
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Master Admin</h1>
                        <span className="text-muted text-sm">TeamVault Service Console</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {tab === 'stats' && refreshed && (
                            <span className="text-muted text-xs">Updated {refreshed.toLocaleTimeString()}</span>
                        )}
                        {tab === 'stats' && (
                            <button onClick={loadStats} className="btn btn-secondary" style={{ fontSize: '0.875rem' }}>Refresh</button>
                        )}
                        <a href="/vault" className="btn btn-ghost" style={{ fontSize: '0.875rem' }}>Back to Vault</a>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', alignItems: 'center' }}>
                    <TabBtn label="Stats" active={tab === 'stats'} onClick={() => setTab('stats')} />
                    <TabBtn label="Workspaces" active={tab === 'workspaces'} onClick={() => setTab('workspaces')} />
                    <TabBtn label="Abuse & High Downloads" active={tab === 'abuse'} onClick={() => setTab('abuse')} />
                    <button
                        onClick={() => setTab('env')}
                        style={{
                            padding: '0.625rem 1.25rem',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                            border: 'none',
                            background: 'transparent',
                            color: tab === 'env' ? 'var(--accent)' : 'var(--text-secondary)',
                            borderBottom: tab === 'env' ? '2px solid var(--accent)' : '2px solid transparent',
                            transition: 'all 150ms',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}
                    >
                        <span>Environment Variables</span>
                        {envSummary && envSummary.requiredMissingCount > 0 && (
                            <span
                                style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    padding: '0.1rem 0.45rem',
                                    borderRadius: '10px',
                                    background: 'var(--error)',
                                    color: '#FFFFFF',
                                    lineHeight: 1.2,
                                }}
                            >
                                {envSummary.requiredMissingCount}
                            </span>
                        )}
                    </button>
                </div>

                {tab === 'stats' && stats && <StatsTab stats={stats} onRefresh={loadStats} refreshed={refreshed} />}
                {tab === 'workspaces' && <WorkspacesTab />}
                {tab === 'abuse' && <AbuseTab />}
                {tab === 'env' && <EnvCheckTab onSummaryLoaded={setEnvSummary} />}

            </div>
        </div>
    )
}
