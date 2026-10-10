'use client'
import { useState, useEffect, useCallback } from 'react'
import type { AuditEvent } from './types'

// ---------------------------------------------------------------------------
// Detail modal
// ---------------------------------------------------------------------------
function EventDetailModal({ event, onClose }: { event: AuditEvent; onClose: () => void }) {
    const md = event.metadata as Record<string, unknown>
    const name = (md.actor_name as string) || event.users?.name
    const email = (md.actor_email as string) || event.users?.email
    const isLogin = event.action === 'AUTH_LOGIN' || event.action === 'DESKTOP_LOGIN'
    const isLogout = event.action === 'AUTH_LOGOUT'
    const isAuthEvent = isLogin || isLogout
    const isGeoEvent = event.action === 'GEO_BLOCK' || event.action === 'GEO_BYPASS_SENT'
        || event.action === 'GEO_BYPASS_SUCCESS' || event.action === 'GEO_BYPASS_FAIL'

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    return (
        <div
            className="modal-backdrop"
            onClick={(e) => e.target === e.currentTarget && onClose()}
            style={{ padding: '2rem', alignItems: 'flex-start', overflowY: 'auto' }}
        >
            <div className="modal" style={{ maxWidth: '580px', width: '100%', maxHeight: 'none', margin: 'auto' }}>
                <div className="modal-header" style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
                    <h3 style={{ margin: 0 }}>Audit Event Details</h3>
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    {/* ── Core fields ── */}
                    <Section title="Event">
                        <Row label="Time"      value={new Date(event.created_at).toUTCString()} mono />
                        <Row label="Action"    value={event.action} />
                        <Row label="Result"    value={event.result} />
                        {event.object_id && <Row label="Object ID" value={event.object_id} mono />}
                    </Section>

                    {/* ── Identity ── */}
                    <Section title="Identity">
                        {(name || email) && <Row label="Actor"    value={[name, email].filter(Boolean).join(' — ')} />}
                        {event.actor_user_id && <Row label="User ID"  value={event.actor_user_id} mono />}
                        {!!md.session_id      && <Row label="Session"  value={md.session_id as string} mono />}
                    </Section>

                    {isGeoEvent ? (
                        <>
                            {/* ── Geo event details ── */}
                            {(event.action === 'GEO_BLOCK' || event.action === 'GEO_BYPASS_SUCCESS' || event.action === 'GEO_BYPASS_FAIL') && (
                                <Section title="Network">
                                    {!!md.ip             && <Row label="IP Address"    value={md.ip as string} mono />}
                                    {!!md.country_name   && <Row label="Country"       value={md.country_name as string} />}
                                    {!!md.country_code   && <Row label="Country Code"  value={md.country_code as string} mono />}
                                    {!!md.region         && <Row label="Region"        value={md.region as string} />}
                                    {!!md.city           && <Row label="City"          value={md.city as string} />}
                                </Section>
                            )}
                            {event.action === 'GEO_BYPASS_SENT' && (
                                <Section title="Bypass Code">
                                    {!!md.recipient_email && <Row label="Sent To"     value={md.recipient_email as string} />}
                                    {!!md.expires_at      && <Row label="Expires At"  value={new Date(md.expires_at as string).toUTCString()} mono />}
                                </Section>
                            )}
                            {event.action === 'GEO_BYPASS_FAIL' && !!md.reason && (
                                <Section title="Failure Details">
                                    <Row label="Reason"   value={String(md.reason)} />
                                    {!!md.attempts && <Row label="Attempts" value={String(md.attempts)} />}
                                </Section>
                            )}
                        </>
                    ) : isAuthEvent ? (
                        <>
                            {/* ── Authentication (login only) ── */}
                            {isLogin && (
                                <Section title="Authentication">
                                    {!!md.auth_method   && <Row label="Method"   value={md.auth_method as string} />}
                                    {!!md.auth_provider && <Row label="Provider" value={md.auth_provider as string} mono />}
                                </Section>
                            )}

                            {/* ── Network ── */}
                            <Section title="Network">
                                {!!md.ip             && <Row label="IP Address"    value={md.ip as string} mono />}
                                {!!md.forwarded_ips  && <Row label="Forwarded IPs" value={md.forwarded_ips as string} mono />}
                                {isLogin && !!md.geo_country && <Row label="Country"   value={md.geo_country as string} />}
                                {isLogin && !!md.geo_region  && <Row label="Region"    value={md.geo_region as string} />}
                                {isLogin && !!md.geo_city    && <Row label="City"      value={md.geo_city as string} />}
                                {isLogin && !!md.geo_isp     && <Row label="ISP / AS"  value={md.geo_isp as string} />}
                                {isLogin && !md.geo_country  && <Row label="GeoIP"     value="Not available (local IP or lookup timed out)" muted />}
                            </Section>

                            {/* ── Device ── */}
                            <Section title="Device">
                                {!!md.ua_browser && <Row label="Browser"    value={md.ua_browser as string} />}
                                {!!md.ua_os      && <Row label="OS"         value={md.ua_os as string} />}
                                {!!md.ua_device  && <Row label="Type"       value={md.ua_device as string} />}
                                {!!md.ua_raw     && <Row label="User Agent" value={md.ua_raw as string} mono small />}
                            </Section>
                        </>
                    ) : (
                        <>
                            {/* ── File / object info ── */}
                            {!!(md.filename || md.file_name || md.name || md.folder_path) && (
                                <Section title="Object">
                                    {!!(md.filename || md.file_name || md.name) && (
                                        <Row
                                            label="File"
                                            value={
                                                md.folder_path
                                                    ? `${md.folder_path} / ${md.filename || md.file_name || md.name}`
                                                    : (md.filename || md.file_name || md.name) as string
                                            }
                                        />
                                    )}
                                    {!!md.folder_path && !(md.filename || md.file_name || md.name) && (
                                        <Row label="Folder" value={md.folder_path as string} />
                                    )}
                                </Section>
                            )}

                            {/* ── Extra metadata ── */}
                            {(() => {
                                const skip = new Set([
                                    'actor_name', 'actor_email', 'filename', 'file_name', 'name',
                                    'folder_path', 'ua_hash', 'ip_hash',
                                ])
                                const extras = Object.entries(md).filter(([k]) => !skip.has(k))
                                if (!extras.length) return null
                                return (
                                    <Section title="Details">
                                        {extras.map(([k, v]) => (
                                            <Row key={k} label={k.replace(/_/g, ' ')} value={String(v)} mono={typeof v === 'number'} />
                                        ))}
                                    </Section>
                                )
                            })()}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <div style={{
                fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.06em', color: 'var(--text-muted)',
                borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem', marginBottom: '0.5rem',
            }}>
                {title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {children}
            </div>
        </div>
    )
}

function Row({ label, value, mono, small, muted }: {
    label: string; value: string; mono?: boolean; small?: boolean; muted?: boolean
}) {
    return (
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', fontSize: '0.875rem' }}>
            <span style={{ minWidth: '110px', color: 'var(--text-muted)', textTransform: 'capitalize', flexShrink: 0 }}>
                {label}
            </span>
            <span style={{
                fontFamily: mono ? 'var(--font-mono)' : undefined,
                fontSize: small ? '0.75rem' : undefined,
                color: muted ? 'var(--text-muted)' : 'var(--text-primary)',
                wordBreak: 'break-all',
            }}>
                {value}
            </span>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Object column summary (table row)
// ---------------------------------------------------------------------------
function ObjectSummary({ e }: { e: AuditEvent }) {
    const md = e.metadata as Record<string, unknown>
    const filename = (md.filename || md.file_name || md.name) as string | undefined
    const folderPath = md.folder_path as string | undefined

    switch (e.action) {
        case 'AUTH_LOGIN':
        case 'DESKTOP_LOGIN': {
            const parts = [md.ua_browser, md.ua_os].filter(Boolean)
            return (
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    {parts.length ? parts.join(' · ') : (md.ip as string) || '—'}
                </span>
            )
        }
        case 'AUTH_LOGOUT': {
            return (
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    {(md.ip as string) || '—'}
                </span>
            )
        }
        case 'FILE_UPLOADED':
        case 'FILE_DELETED':
            return <ObjectFile icon="📄" filename={filename} folderPath={folderPath} />
        case 'FILE_DOWNLOADED':
        case 'DOWNLOAD_LINK_ISSUED':
            return <ObjectFile icon="⬇️" filename={filename} />
        case 'FILE_VIEWED':
            return <ObjectFile icon="👁️" filename={filename} />
        case 'FILE_LINK_COPIED':
            return <ObjectFile icon="🔗" filename={filename} />
        case 'FOLDER_CREATED':
        case 'FOLDER_DELETED':
            return <ObjectFile icon="📁" filename={md.folder_name as string | undefined} />
        case 'FOLDER_ACCESS_CHANGED':
            return <ObjectFile icon="🔒" filename={md.folder_name as string | undefined} />
        case 'OBJECT_RENAMED':
            return (
                <span className="text-secondary font-medium" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem' }}>
                    ✏️ {md.old_name as string} → {md.new_name as string}
                </span>
            )
        case 'GEO_BLOCK':
            return (
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--error)' }}>
                    🌍 {[md.country_name, md.country_code].filter(Boolean).join(' · ') || (md.ip as string) || '—'}
                </span>
            )
        case 'GEO_BYPASS_SENT':
            return (
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    📧 Code sent to {md.recipient_email as string || '—'}
                </span>
            )
        case 'GEO_BYPASS_SUCCESS':
            return (
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--success)' }}>
                    ✓ Bypass verified from {md.ip as string || '—'}
                </span>
            )
        case 'GEO_BYPASS_FAIL':
            return (
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--error)' }}>
                    ✗ {String(md.reason || 'failed')} · {md.ip as string || '—'}
                </span>
            )
        default:
            return null
    }
}

function ObjectFile({ icon, filename, folderPath }: { icon: string; filename?: string; folderPath?: string }) {
    const label = filename
        ? (folderPath ? `${folderPath} / ${filename}` : filename)
        : '—'
    return (
        <span className="text-secondary font-medium" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem' }}>
            {icon} {label}
        </span>
    )
}

// ---------------------------------------------------------------------------
// Main tab
// ---------------------------------------------------------------------------
export default function AuditLogTab({ workspaceId }: { workspaceId: string }) {
    const [events, setEvents] = useState<AuditEvent[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(0)
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState<AuditEvent | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        const res = await fetch(`/api/admin/audit?workspace_id=${workspaceId}&page=${page}&limit=50`)
        if (res.ok) { const d = await res.json(); setEvents(d.events); setTotal(d.total) }
        setLoading(false)
    }, [workspaceId, page])

    useEffect(() => { load() }, [load])

    function resultBadge(r: string) {
        const cls = r === 'allowed' ? 'active' : r === 'denied' ? 'invited' : 'disabled'
        return <span className={`badge badge-${cls}`}>{r}</span>
    }

    return (
        <>
            <div className="card">
                <div className="card-header">
                    <h3>Audit Log</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span className="text-muted text-sm">{total} events</span>
                        <button className="btn btn-secondary btn-sm" onClick={load}>Refresh</button>
                    </div>
                </div>
                {loading
                    ? <div className="empty-state">Loading…</div>
                    : events.length === 0
                        ? <div className="empty-state">No audit events yet.</div>
                        : (
                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Action</th>
                                            <th>Result</th>
                                            <th>Actor</th>
                                            <th>Object / Detail</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {events.map((e) => (
                                            <tr
                                                key={e.id}
                                                style={{ cursor: 'pointer', verticalAlign: 'middle' }}
                                                onClick={() => setSelected(e)}
                                            >
                                                <td className="mono text-sm text-muted" style={{ whiteSpace: 'nowrap' }}>
                                                    {new Date(e.created_at).toLocaleString()}
                                                </td>
                                                <td style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        {e.action}
                                                        {(e.metadata as any)?.client === 'desktop_sync' && (
                                                            <span className="badge badge-admin" style={{ fontSize: '0.65rem', padding: '0.125rem 0.375rem' }}>Desktop App</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>{resultBadge(e.result)}</td>
                                                <td className="text-xs">
                                                    {(() => {
                                                        const md = e.metadata as any || {}
                                                        const name = md.actor_name || e.users?.name
                                                        const email = md.actor_email || e.users?.email
                                                        return (
                                                            <>
                                                                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                                                    {name || email || 'System'}
                                                                </div>
                                                                {e.actor_user_id && (
                                                                    <div className="text-muted mono" style={{ fontSize: '0.625rem' }}>
                                                                        {e.actor_user_id.slice(0, 8)}
                                                                    </div>
                                                                )}
                                                            </>
                                                        )
                                                    })()}
                                                </td>
                                                <td className="mono text-xs text-muted">
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                                                        <ObjectSummary e={e} />
                                                        <span title={e.object_id || ''}>{e.object_id?.slice(0, 8) ?? '—'}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <button
                                                        className="btn btn-ghost btn-sm"
                                                        style={{ fontSize: '0.75rem', padding: '0.125rem 0.375rem' }}
                                                        onClick={(ev) => { ev.stopPropagation(); setSelected(e) }}
                                                        title="View full details"
                                                    >
                                                        ···
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {total > 50 && (
                                    <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                        <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Prev</button>
                                        <span className="text-sm text-muted" style={{ alignSelf: 'center' }}>Page {page + 1}</span>
                                        <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * 50 >= total}>Next →</button>
                                    </div>
                                )}
                            </div>
                        )}
            </div>
            {selected && <EventDetailModal event={selected} onClose={() => setSelected(null)} />}
        </>
    )
}
