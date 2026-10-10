'use client'
import { useState, useEffect } from 'react'
import type { UserItem } from './types'

type FolderItem = { id: string; name: string; path: string }
type GroupItem = { id: string; name: string }

export default function FolderAccessTab({ workspaceId }: { workspaceId: string }) {
    const [folders, setFolders] = useState<FolderItem[]>([])
    const [allUsers, setAllUsers] = useState<UserItem[]>([])
    const [allGroups, setAllGroups] = useState<GroupItem[]>([])
    const [selectedFolder, setSelectedFolder] = useState('')
    const [allowedUserIds, setAllowedUserIds] = useState<string[]>([])
    const [allowedGroupIds, setAllowedGroupIds] = useState<string[]>([])
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState('')
    const [showUserPicker, setShowUserPicker] = useState(false)
    const [showGroupPicker, setShowGroupPicker] = useState(false)
    const [loadingAccess, setLoadingAccess] = useState(false)

    useEffect(() => {
        fetch(`/api/admin/folders/list-all?workspace_id=${workspaceId}`)
            .then(r => r.ok ? r.json() : [])
            .then(setFolders)
        fetch(`/api/admin/users/list?workspace_id=${workspaceId}`)
            .then(r => r.ok ? r.json() : [])
            .then(setAllUsers)
        fetch(`/api/admin/groups/list?workspace_id=${workspaceId}`)
            .then(r => r.ok ? r.json() : [])
            .then(setAllGroups)
    }, [workspaceId])

    useEffect(() => {
        if (!selectedFolder) { setAllowedUserIds([]); setAllowedGroupIds([]); setMsg(''); return }
        setLoadingAccess(true)
        fetch(`/api/admin/folders/get-access?workspace_id=${workspaceId}&folder_id=${selectedFolder}`)
            .then(r => r.ok ? r.json() : { users: [], groups: [] })
            .then((d: { users: string[]; groups: string[] }) => {
                setAllowedUserIds(d.users)
                setAllowedGroupIds(d.groups)
                setMsg('')
            })
            .finally(() => setLoadingAccess(false))
    }, [selectedFolder, workspaceId])

    const save = async () => {
        setSaving(true); setMsg('')
        const res = await fetch('/api/admin/folders/set-access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspace_id: workspaceId, folder_id: selectedFolder, allow_users: allowedUserIds, allow_groups: allowedGroupIds }),
        })
        setSaving(false)
        if (res.ok) setMsg('✓ Access saved')
        else { const e = await res.json(); setMsg('Error: ' + (e.error || 'Failed')) }
    }

    const removeUser = (uid: string) => setAllowedUserIds(ids => ids.filter(id => id !== uid))
    const removeGroup = (gid: string) => setAllowedGroupIds(ids => ids.filter(id => id !== gid))
    const addUser = (uid: string) => { setAllowedUserIds(ids => [...ids, uid]); setShowUserPicker(false) }
    const addGroup = (gid: string) => { setAllowedGroupIds(ids => [...ids, gid]); setShowGroupPicker(false) }

    const userLabel = (uid: string) => {
        const u = allUsers.find(x => x.id === uid)
        return u ? `${u.name || 'No name'} (${u.email})` : uid.slice(0, 8) + '…'
    }
    const groupLabel = (gid: string) => {
        const g = allGroups.find(x => x.id === gid)
        return g ? g.name : gid.slice(0, 8) + '…'
    }

    const availableUsers = allUsers.filter(u => !allowedUserIds.includes(u.id))
    const availableGroups = allGroups.filter(g => !allowedGroupIds.includes(g.id))
    const hasNoRestrictions = allowedUserIds.length === 0 && allowedGroupIds.length === 0

    return (
        <div className="card">
            <div className="card-header">
                <h3>Set Folder Access</h3>
                <span className="text-muted text-sm">Restrict who can view a folder. No entries = open to all members.</span>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Folder picker */}
                <div className="field">
                    <label className="label">Folder</label>
                    <select className="input" value={selectedFolder} onChange={e => setSelectedFolder(e.target.value)}>
                        <option value="">Select a folder…</option>
                        {folders.map(f => <option key={f.id} value={f.id}>{f.path}</option>)}
                    </select>
                </div>

                {selectedFolder && !loadingAccess && (
                    <>
                        {/* Allowed Users */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <label className="label" style={{ margin: 0 }}>Allowed Users</label>
                                <button className="btn btn-secondary btn-sm" onClick={() => setShowUserPicker(true)} disabled={availableUsers.length === 0}>+ Add User</button>
                            </div>
                            {allowedUserIds.length === 0
                                ? <p className="text-muted text-sm" style={{ padding: '0.5rem 0' }}>No user restrictions — all members can access.</p>
                                : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                        {allowedUserIds.map(uid => (
                                            <div key={uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                                <span style={{ fontSize: '0.875rem' }}>{userLabel(uid)}</span>
                                                <button className="btn btn-ghost btn-sm" onClick={() => removeUser(uid)} style={{ color: '#EF4444', padding: '0.125rem 0.375rem' }}>✕</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                        </div>

                        {/* Allowed Groups */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <label className="label" style={{ margin: 0 }}>Allowed Groups</label>
                                <button className="btn btn-secondary btn-sm" onClick={() => setShowGroupPicker(true)} disabled={availableGroups.length === 0}>+ Add Group</button>
                            </div>
                            {allowedGroupIds.length === 0
                                ? <p className="text-muted text-sm" style={{ padding: '0.5rem 0' }}>No group restrictions.</p>
                                : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                        {allowedGroupIds.map(gid => (
                                            <div key={gid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{groupLabel(gid)}</span>
                                                <button className="btn btn-ghost btn-sm" onClick={() => removeGroup(gid)} style={{ color: '#EF4444', padding: '0.125rem 0.375rem' }}>✕</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                        </div>

                        {hasNoRestrictions && (
                            <div style={{ padding: '0.75rem', background: 'rgba(59,130,246,0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(59,130,246,0.2)' }}>
                                <p style={{ fontSize: '0.8125rem', color: 'var(--accent)' }}>ℹ️ This folder is open to all workspace members. Add users or groups above to restrict access.</p>
                            </div>
                        )}

                        {/* Save */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Access'}</button>
                            {msg && <span style={{ fontSize: '0.875rem', color: msg.startsWith('✓') ? 'var(--success)' : 'var(--error)' }}>{msg}</span>}
                        </div>
                    </>
                )}

                {loadingAccess && <p className="text-muted text-sm">Loading access rules…</p>}
            </div>

            {/* User picker modal */}
            {showUserPicker && (
                <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowUserPicker(false)}>
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Add User</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowUserPicker(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: 300, overflowY: 'auto' }}>
                            {availableUsers.length === 0
                                ? <p className="text-muted">All users are already added.</p>
                                : availableUsers.map(u => (
                                    <button key={u.id} onClick={() => addUser(u.id)} style={{
                                        display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
                                        padding: '0.625rem 0.75rem', border: 'none', background: 'none',
                                        color: 'var(--text-primary)', fontSize: '0.875rem', cursor: 'pointer',
                                        textAlign: 'left', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit',
                                    }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--row-hover)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                    >
                                        <span style={{ fontWeight: 500 }}>{u.name || 'No name'}</span>
                                        <span className="text-muted">({u.email})</span>
                                    </button>
                                ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Group picker modal */}
            {showGroupPicker && (
                <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowGroupPicker(false)}>
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Add Group</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowGroupPicker(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: 300, overflowY: 'auto' }}>
                            {availableGroups.length === 0
                                ? <p className="text-muted">All groups are already added.</p>
                                : availableGroups.map(g => (
                                    <button key={g.id} onClick={() => addGroup(g.id)} style={{
                                        display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
                                        padding: '0.625rem 0.75rem', border: 'none', background: 'none',
                                        color: 'var(--text-primary)', fontSize: '0.875rem', cursor: 'pointer',
                                        textAlign: 'left', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit',
                                        fontWeight: 500,
                                    }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--row-hover)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                    >
                                        {g.name}
                                    </button>
                                ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
