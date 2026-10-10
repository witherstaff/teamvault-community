'use client'
import { useState, useEffect, useCallback } from 'react'

type VerifiedLogEvent = {
    id: string
    workspace_id: string
    download_token: string
    downloader_email: string
    downloader_ip: string | null
    result: string
    filename: string | null
    folder_path: string | null
    session_id: string | null
    watermarked_checksum: string | null
    file_checksum: string | null
    created_at: string
    vault_objects: { name: string; id: string; checksum_sha256: string | null } | null
    workspaces: { name: string } | null
}

function WatermarkInfoModal({ event, onClose }: { event: VerifiedLogEvent; onClose: () => void }) {
    const filename = event.vault_objects?.name ?? event.filename ?? '—'
    const timestamp = new Date(event.created_at).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC')

    const rows: { label: string; value: string | null; mono?: boolean }[] = [
        { label: 'Source', value: 'TeamVault Secure Repository (TeamVault.cloud)' },
        { label: 'Workspace', value: event.workspaces?.name ?? '—' },
        { label: 'Workspace ID', value: event.workspace_id, mono: true },
        { label: 'File', value: filename },
        { label: 'Folder', value: event.folder_path ?? '—' },
        { label: 'Downloaded By', value: event.downloader_email, mono: true },
        { label: 'Timestamp', value: timestamp, mono: true },
        { label: 'IP Address', value: event.downloader_ip ?? '—', mono: true },
        { label: 'Session ID', value: event.session_id ?? event.download_token, mono: true },
        { label: 'File Checksum (SHA256)', value: event.file_checksum ?? event.vault_objects?.checksum_sha256 ?? '—', mono: true },
        { label: 'Watermark Checksum', value: event.watermarked_checksum ?? '—', mono: true },
    ]

    return (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: 580 }}>
                <div className="modal-header">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                        <h3 style={{ margin: 0 }}>Watermark Information</h3>
                        <span className="text-muted text-xs">Fields embedded in the PDF watermark banner for this download</span>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {rows.map(({ label, value, mono }, i) => (
                        <div key={label} style={{
                            display: 'grid',
                            gridTemplateColumns: '11rem 1fr',
                            gap: '0.5rem',
                            padding: '0.625rem 0',
                            borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
                            alignItems: 'start',
                        }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', paddingTop: '0.1rem' }}>
                                {label}
                            </span>
                            <span style={{
                                fontSize: mono ? '0.75rem' : '0.875rem',
                                fontFamily: mono ? 'var(--font-mono)' : 'inherit',
                                color: 'var(--text-primary)',
                                wordBreak: 'break-all',
                            }}>
                                {value ?? '—'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default function VerifiedLogTab({ workspaceId }: { workspaceId: string }) {
    const [events, setEvents] = useState<VerifiedLogEvent[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(0)
    const [loading, setLoading] = useState(true)
    const [detailEvent, setDetailEvent] = useState<VerifiedLogEvent | null>(null)
    const [monthly, setMonthly] = useState<{ used: number; limit: number | null; plan_name: string } | null>(null)

    const loadStats = useCallback(async () => {
        const res = await fetch(`/api/admin/verified-log/monthly-stats?workspace_id=${workspaceId}`)
        if (res.ok) setMonthly(await res.json())
    }, [workspaceId])

    const load = useCallback(async () => {
        setLoading(true)
        const res = await fetch(`/api/admin/verified-log?workspace_id=${workspaceId}&page=${page}&limit=50`)
        if (res.ok) { const d = await res.json(); setEvents(d.events ?? []); setTotal(d.total ?? 0) }
        setLoading(false)
    }, [workspaceId, page])

    useEffect(() => { load(); loadStats() }, [load, loadStats])

    function resultBadge(r: string) {
        const isAllowed = r === 'allowed'
        return (
            <span className={`badge badge-${isAllowed ? 'active' : 'disabled'}`}>
                {isAllowed ? '✓ allowed' : `✗ ${r.replace('denied_', '')}`}
            </span>
        )
    }

    return (
        <div className="card">
            <div className="card-header">
                <h3>Verified Downloads Log</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {monthly && (() => {
                        const pct = monthly.limit != null && monthly.limit > 0 ? monthly.used / monthly.limit : 0
                        const color = pct >= 1 ? '#EF4444' : pct >= 0.8 ? '#F59E0B' : 'var(--success)'
                        const limitLabel = monthly.limit != null ? monthly.limit.toLocaleString() : 'Unlimited'
                        const titleLabel = monthly.limit != null ? `${monthly.limit} verified downloads/month` : 'Unlimited verified downloads'
                        return (
                            <span title={`${monthly.plan_name} plan · ${titleLabel}`} style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                                padding: '0.25rem 0.625rem',
                                background: 'var(--bg)', border: `1px solid ${color}`,
                                borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                                color, whiteSpace: 'nowrap',
                            }}>
                                <span style={{ opacity: 0.7, fontWeight: 400 }}>This month</span>
                                {monthly.used.toLocaleString()} / {limitLabel}
                            </span>
                        )
                    })()}
                    <span className="text-muted text-sm">{total} events</span>
                    <button className="btn btn-secondary btn-sm" onClick={() => { load(); loadStats() }}>Refresh</button>
                </div>
            </div>
            {loading
                ? <div className="empty-state">Loading…</div>
                : events.length === 0
                    ? <div className="empty-state">No verified download events yet.</div>
                    : (
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>File</th>
                                        <th>User</th>
                                        <th>Time</th>
                                        <th>IP</th>
                                        <th>Result</th>
                                        <th style={{ width: 40 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {events.map(e => (
                                        <tr key={e.id}>
                                            <td style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                                                {e.vault_objects?.name ?? e.filename ?? '—'}
                                            </td>
                                            <td className="mono text-xs">{e.downloader_email}</td>
                                            <td className="text-muted text-sm" style={{ whiteSpace: 'nowrap' }}>
                                                {new Date(e.created_at).toLocaleString()}
                                            </td>
                                            <td className="mono text-xs text-muted">{e.downloader_ip ?? '—'}</td>
                                            <td>{resultBadge(e.result)}</td>
                                            <td>
                                                {e.result === 'allowed' && (
                                                    <button
                                                        title="View watermark information"
                                                        onClick={() => setDetailEvent(e)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            padding: '0.25rem',
                                                            borderRadius: '50%',
                                                            color: 'var(--accent)',
                                                            fontSize: '1rem',
                                                            lineHeight: 1,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            opacity: 0.75,
                                                            transition: 'opacity 0.15s',
                                                        }}
                                                        onMouseEnter={ev => (ev.currentTarget.style.opacity = '1')}
                                                        onMouseLeave={ev => (ev.currentTarget.style.opacity = '0.75')}
                                                    >
                                                        ℹ️
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {total > 50 && (
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem' }}>
                                    <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Prev</button>
                                    <span className="text-muted text-sm" style={{ alignSelf: 'center' }}>Page {page + 1}</span>
                                    <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * 50 >= total}>Next →</button>
                                </div>
                            )}
                        </div>
                    )}
            {detailEvent && (
                <WatermarkInfoModal event={detailEvent} onClose={() => setDetailEvent(null)} />
            )}
        </div>
    )
}
