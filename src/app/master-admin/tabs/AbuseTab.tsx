'use client'

import React, { useState, useEffect } from 'react'
import { formatBytes, PlanBadge } from '../components/shared'

export type HighDownloadFile = {
    objectId: string
    fileName: string
    sizeBytes: number
    mimeType: string | null
    checksumSha256: string | null
    isDeleted: boolean
    workspaceId: string
    workspaceName: string
    planId: string
    downloadCount: number
    uniqueIpCount: number
    uniqueViewerKeysUsed: number
    firstDownloadedAt: string
    lastDownloadedAt: string
    isSuspicious: boolean
    riskFactors: string[]
}

export default function AbuseTab() {
    const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d' | 'all'>('24h')
    const [files, setFiles] = useState<HighDownloadFile[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [actionMsg, setActionMsg] = useState<{ id: string; msg: string; ok: boolean } | null>(null)

    const loadData = async () => {
        setLoading(true)
        setError('')
        try {
            const res = await fetch(`/api/master-admin/abuse/high-downloads?timeframe=${timeframe}&limit=50`)
            if (!res.ok) throw new Error('Failed to load abuse monitoring data')
            const data = await res.json()
            setFiles(data.highDownloadFiles || [])
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [timeframe]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleTakedown = async (objectId: string, fileName: string) => {
        if (!confirm(`Are you sure you want to permanently take down and purge "${fileName}"?`)) return
        try {
            const res = await fetch('/api/master-admin/takedown', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'purge_file', objectId, reason: 'High-download abuse takedown' }),
            })
            const data = await res.json()
            if (res.ok) {
                setActionMsg({ id: objectId, msg: `Purged "${fileName}"`, ok: true })
                loadData()
            } else {
                setActionMsg({ id: objectId, msg: data.error || 'Failed to purge file', ok: false })
            }
        } catch (e: any) {
            setActionMsg({ id: objectId, msg: e.message, ok: false })
        }
    }

    const handleSuspendWorkspace = async (workspaceId: string, wsName: string) => {
        if (!confirm(`Are you sure you want to SUSPEND workspace "${wsName}" and revoke all its API keys?`)) return
        try {
            const res = await fetch('/api/master-admin/takedown', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'suspend_workspace', workspaceId, reason: 'Abuse monitoring suspension' }),
            })
            const data = await res.json()
            if (res.ok) {
                setActionMsg({ id: workspaceId, msg: `Suspended "${wsName}"`, ok: true })
                loadData()
            } else {
                setActionMsg({ id: workspaceId, msg: data.error || 'Failed to suspend workspace', ok: false })
            }
        } catch (e: any) {
            setActionMsg({ id: workspaceId, msg: e.message, ok: false })
        }
    }

    return (
        <div>
            {/* Filter Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Timeframe:</span>
                    {(['24h', '7d', '30d', 'all'] as const).map(tf => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={timeframe === tf ? 'btn btn-primary' : 'btn btn-secondary'}
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                        >
                            {tf.toUpperCase()}
                        </button>
                    ))}
                </div>
                <button onClick={loadData} className="btn btn-secondary" style={{ fontSize: '0.875rem' }}>
                    Refresh
                </button>
            </div>

            {actionMsg && (
                <div style={{ padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1rem', background: actionMsg.ok ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: actionMsg.ok ? 'var(--success)' : 'var(--error)', fontSize: '0.875rem' }}>
                    {actionMsg.msg}
                </div>
            )}

            {loading && <div className="text-muted text-sm" style={{ padding: '2rem', textAlign: 'center' }}>Analyzing download traffic…</div>}
            {error && <div className="text-error" style={{ padding: '1rem' }}>{error}</div>}

            {!loading && !error && files.length === 0 && (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No high-download anomalies detected in this timeframe.
                </div>
            )}

            {!loading && !error && files.length > 0 && (
                <div className="card" style={{ overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)', textAlign: 'left' }}>
                                <th style={{ padding: '0.75rem 1rem' }}>File Name</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Workspace</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Plan</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Downloads</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Unique IPs</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Risk Factors</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {files.map(f => (
                                <tr key={f.objectId} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                        <div style={{ fontWeight: 600 }}>{f.fileName}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {formatBytes(f.sizeBytes)} • {f.mimeType || 'unknown'} {f.isDeleted ? '• (PURGED)' : ''}
                                        </div>
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                        <div>{f.workspaceName}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{f.workspaceId.slice(0, 8)}…</div>
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                        <PlanBadge planId={f.planId} />
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: f.downloadCount > 1000 ? 'var(--error)' : 'inherit' }}>
                                        {f.downloadCount.toLocaleString()}
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem', color: f.uniqueIpCount > 100 ? '#f59e0b' : 'inherit' }}>
                                        {f.uniqueIpCount.toLocaleString()}
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                        {f.riskFactors.map(rf => (
                                            <span key={rf} style={{ display: 'inline-block', fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: 4, background: 'rgba(239, 68, 68, 0.15)', color: 'var(--error)', marginRight: '0.3rem', textTransform: 'uppercase' }}>
                                                {rf.replace('_', ' ')}
                                            </span>
                                        ))}
                                        {f.riskFactors.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Normal</span>}
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            {!f.isDeleted && (
                                                <button
                                                    onClick={() => handleTakedown(f.objectId, f.fileName)}
                                                    className="btn btn-secondary"
                                                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--error)' }}
                                                >
                                                    Takedown File
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleSuspendWorkspace(f.workspaceId, f.workspaceName)}
                                                className="btn btn-secondary"
                                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                            >
                                                Suspend WS
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
