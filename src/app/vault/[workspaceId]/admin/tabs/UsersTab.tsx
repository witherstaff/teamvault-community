'use client'
import { useState, useEffect, useCallback } from 'react'
import type { UserRow } from './types'
import { CountryPicker } from '@/components/CountryPicker'

// ---------------------------------------------------------------------------
// Per-user geofencing override modal
// ---------------------------------------------------------------------------
function GeoOverrideModal({
    workspaceId,
    user,
    onClose,
}: {
    workspaceId: string
    user: UserRow
    onClose: () => void
}) {
    const [countryOverride, setCountryOverride] = useState<string[]>([])
    const [bypassAllowed, setBypassAllowed] = useState<boolean | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState('')

    useEffect(() => {
        fetch(`/api/admin/users/geo?workspace_id=${workspaceId}&user_id=${user.id}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                if (d) {
                    setCountryOverride(d.geo_country_override ?? [])
                    setBypassAllowed(d.geo_bypass_allowed)   // null = inherit
                }
            })
            .finally(() => setLoading(false))
    }, [workspaceId, user.id])

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    const save = async () => {
        setSaving(true); setMsg('')
        const res = await fetch('/api/admin/users/geo', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                workspace_id: workspaceId,
                user_id: user.id,
                geo_country_override: countryOverride,
                geo_bypass_allowed: bypassAllowed,
            }),
        })
        setSaving(false)
        if (res.ok) {
            setMsg('✓ Saved')
        } else {
            const e = await res.json()
            setMsg('Error: ' + (e.error || 'Failed'))
        }
    }

    return (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: '460px', width: '100%' }}>
                <div className="modal-header">
                    <h3 style={{ margin: 0 }}>Geo Override — {user.name || user.email}</h3>
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    {loading ? (
                        <div className="text-muted text-sm">Loading…</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="field">
                                <label className="label">Country Override</label>
                                <CountryPicker value={countryOverride} onChange={setCountryOverride} />
                                <span className="text-muted text-xs" style={{ marginTop: '0.375rem', display: 'block' }}>
                                    Countries that bypass the workspace allowlist for this user only. Leave empty to use workspace defaults.
                                </span>
                            </div>

                            <div className="field">
                                <label className="label">Bypass Code Permission</label>
                                <select
                                    className="input"
                                    style={{ width: 'auto' }}
                                    value={bypassAllowed === null ? 'inherit' : bypassAllowed ? 'allow' : 'deny'}
                                    onChange={e => {
                                        const v = e.target.value
                                        setBypassAllowed(v === 'inherit' ? null : v === 'allow')
                                    }}
                                >
                                    <option value="inherit">Inherit workspace default</option>
                                    <option value="allow">Allow bypass codes for this user</option>
                                    <option value="deny">Deny bypass codes for this user</option>
                                </select>
                            </div>

                            {msg && (
                                <span style={{ fontSize: '0.875rem', color: msg.startsWith('✓') ? 'var(--success)' : 'var(--error)' }}>
                                    {msg}
                                </span>
                            )}
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={save} disabled={saving || loading}>
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Main users tab
// ---------------------------------------------------------------------------
export default function UsersTab({ workspaceId }: { workspaceId: string }) {
    const [users, setUsers] = useState<UserRow[]>([])
    const [loading, setLoading] = useState(true)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteRole, setInviteRole] = useState<'admin' | 'user'>('user')
    const [inviteUpload, setInviteUpload] = useState(false)
    const [inviting, setInviting] = useState(false)
    const [msg, setMsg] = useState('')
    const [confirmDisable, setConfirmDisable] = useState<UserRow | null>(null)
    const [disableError, setDisableError] = useState('')
    const [changingRole, setChangingRole] = useState<string | null>(null)
    const [geoUser, setGeoUser] = useState<UserRow | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        const res = await fetch(`/api/admin/users/list?workspace_id=${workspaceId}`)
        if (res.ok) setUsers(await res.json())
        setLoading(false)
    }, [workspaceId])

    useEffect(() => { load() }, [load])

    const invite = async () => {
        setInviting(true); setMsg('')
        const res = await fetch('/api/admin/users/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspace_id: workspaceId, email: inviteEmail, role: inviteRole, can_upload: inviteUpload }),
        })
        setInviting(false)
        if (res.ok) { setMsg('✓ Invited ' + inviteEmail); setInviteEmail(''); load() }
        else { const e = await res.json(); setMsg('Error: ' + (typeof e.error === 'string' ? e.error : 'Failed')) }
    }

    const doSetStatus = async (userId: string, status: 'active' | 'disabled') => {
        setDisableError('')
        const res = await fetch('/api/admin/users/set-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspace_id: workspaceId, user_id: userId, status }),
        })
        if (res.ok) {
            setConfirmDisable(null)
            load()
        } else {
            const e = await res.json()
            setDisableError(typeof e.error === 'string' ? e.error : 'Failed')
        }
    }

    const handleDisableClick = (u: UserRow) => {
        if (u.role === 'admin') {
            setDisableError('')
            setConfirmDisable(u)
        } else {
            doSetStatus(u.id, 'disabled')
        }
    }

    const toggleUpload = async (u: UserRow) => {
        await fetch('/api/admin/users/set-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspace_id: workspaceId, user_id: u.id, can_upload: !u.can_upload }),
        })
        load()
    }

    const toggleRole = async (userId: string, newRole: 'admin' | 'user') => {
        setChangingRole(userId)
        try {
            const res = await fetch('/api/admin/users/set-role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspace_id: workspaceId, user_id: userId, role: newRole }),
            })
            if (!res.ok) {
                const e = await res.json()
                alert('Error: ' + (e.error || 'Failed to update role'))
            }
        } finally {
            setChangingRole(null)
            load()
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Invite form */}
            <div className="card">
                <div className="card-header"><h3>Invite User</h3></div>
                <div style={{ padding: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
                    <div className="field" style={{ flex: '1 1 220px' }}>
                        <label className="label">Email</label>
                        <input className="input" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="user@company.com" onKeyDown={(e) => e.key === 'Enter' && inviteEmail && invite()} />
                    </div>
                    <div className="field">
                        <label className="label">Role</label>
                        <select className="input" style={{ width: 'auto' }} value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'admin' | 'user')}>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', cursor: 'pointer', paddingBottom: '0.125rem' }}>
                        <input type="checkbox" checked={inviteUpload} onChange={(e) => setInviteUpload(e.target.checked)} /> Can upload
                    </label>
                    <button className="btn btn-primary" onClick={invite} disabled={!inviteEmail || inviting}>{inviting ? 'Inviting…' : 'Send Invite'}</button>
                    {msg && <span style={{ fontSize: '0.875rem', color: msg.startsWith('✓') ? 'var(--success)' : 'var(--error)' }}>{msg}</span>}
                </div>
            </div>

            {/* Users table */}
            <div className="card">
                <div className="card-header">
                    <h3>Members</h3>
                    <button className="btn btn-secondary btn-sm" onClick={load}>Refresh</button>
                </div>
                {loading
                    ? <div className="empty-state">Loading…</div>
                    : users.length === 0
                        ? <div className="empty-state">No members yet. Invite someone above.</div>
                        : (
                            <div className="table-wrap">
                                <table>
                                    <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Upload</th><th>Status</th><th>Geo</th><th></th></tr></thead>
                                    <tbody>
                                        {users.map((u) => (
                                            <tr key={u.id}>
                                                <td style={{ fontWeight: 500 }}>{u.name || '—'}</td>
                                                <td className="mono">{u.email}</td>
                                                <td>
                                                    <select
                                                        className="input"
                                                        style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.8125rem', height: '1.75rem', minHeight: 'unset' }}
                                                        value={u.role}
                                                        disabled={changingRole === u.id || u.status !== 'active'}
                                                        onChange={(e) => toggleRole(u.id, e.target.value as 'admin' | 'user')}
                                                    >
                                                        <option value="user">User</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                </td>
                                                <td>
                                                    <button
                                                        className={`btn btn-sm ${u.can_upload ? 'btn-primary' : 'btn-secondary'}`}
                                                        onClick={() => toggleUpload(u)}
                                                        style={{ minWidth: 50 }}
                                                    >
                                                        {u.can_upload ? '✓ Yes' : '— No'}
                                                    </button>
                                                </td>
                                                <td><span className={`badge badge-${u.status}`}>{u.status}</span></td>
                                                <td>
                                                    {(() => {
                                                        const hasOverride = (u.geo_country_override?.length ?? 0) > 0 || u.geo_bypass_allowed !== null
                                                        return (
                                                            <button
                                                                className={`btn btn-sm ${hasOverride ? 'btn-primary' : 'btn-secondary'}`}
                                                                onClick={() => setGeoUser(u)}
                                                                title={hasOverride ? 'Geo overrides active for this user' : 'Configure geofencing override for this user'}
                                                                style={{ fontSize: '0.75rem' }}
                                                            >
                                                                🌍 Geo{hasOverride && ' ●'}
                                                            </button>
                                                        )
                                                    })()}
                                                </td>
                                                <td>
                                                    {u.status === 'active'
                                                        ? <button className="btn btn-destructive btn-sm" onClick={() => handleDisableClick(u)}>Disable</button>
                                                        : u.status === 'disabled'
                                                            ? <button className="btn btn-secondary btn-sm" onClick={() => doSetStatus(u.id, 'active')}>Enable</button>
                                                            : <span className="text-muted text-xs">Pending</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
            </div>

            {/* Confirm disable admin dialog */}
            {confirmDisable && (
                <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setConfirmDisable(null)}>
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Disable Admin</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDisable(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to disable <b>{confirmDisable.email}</b>?</p>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--warning)' }}>This user has the <b>admin</b> role. They will lose access to the workspace until re-enabled.</p>
                            {disableError && <p style={{ fontSize: '0.875rem', color: 'var(--error)', fontWeight: 500 }}>{disableError}</p>}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setConfirmDisable(null)}>Cancel</button>
                            <button className="btn" style={{ background: '#EF4444', color: 'white' }} onClick={() => doSetStatus(confirmDisable.id, 'disabled')}>Disable</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Geo override modal */}
            {geoUser && (
                <GeoOverrideModal
                    workspaceId={workspaceId}
                    user={geoUser}
                    onClose={() => setGeoUser(null)}
                />
            )}
        </div>
    )
}
