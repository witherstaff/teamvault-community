'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Group, UserItem } from './types'

function ManageMembersModal({ workspaceId, group, onClose }: { workspaceId: string, group: Group, onClose: () => void }) {
    const [members, setMembers] = useState<UserItem[]>([])
    const [allWorkspaceUsers, setAllWorkspaceUsers] = useState<UserItem[]>([])
    const [loading, setLoading] = useState(true)
    const [showUserPicker, setShowUserPicker] = useState(false)
    const [msg, setMsg] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [mRes, uRes] = await Promise.all([
                fetch(`/api/admin/groups/members?workspace_id=${workspaceId}&group_id=${group.id}`),
                fetch(`/api/admin/users/list?workspace_id=${workspaceId}`)
            ])
            if (mRes.ok) setMembers(await mRes.json())
            if (uRes.ok) setAllWorkspaceUsers(await uRes.json())
        } finally {
            setLoading(false)
        }
    }, [workspaceId, group.id])

    useEffect(() => { load() }, [load])

    const addUser = async (userId: string) => {
        setShowUserPicker(false)
        const res = await fetch('/api/admin/groups/add-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspace_id: workspaceId, group_id: group.id, user_id: userId })
        })
        if (res.ok) {
            load()
            setMsg('✓ User added')
        } else {
            const e = await res.json()
            setMsg('Error: ' + (e.error || 'Failed'))
        }
    }

    const removeUser = async (userId: string) => {
        const res = await fetch('/api/admin/groups/remove-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspace_id: workspaceId, group_id: group.id, user_id: userId })
        })
        if (res.ok) {
            load()
            setMsg('✓ User removed')
        } else {
            const e = await res.json()
            setMsg('Error: ' + (e.error || 'Failed'))
        }
    }

    const availableUsers = allWorkspaceUsers.filter(u => !members.find(m => m.id === u.id))

    return (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: 500 }}>
                <div className="modal-header">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ margin: 0 }}>Manage Members: {group.name}</h3>
                        {group.is_system && <span className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>System-managed memberships. Manual changes may be overwritten.</span>}
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    {msg && <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: msg.startsWith('✓') ? 'var(--success)' : 'var(--error)' }}>{msg}</div>}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h4 style={{ margin: 0, fontSize: '0.9375rem' }}>Current Members ({members.length})</h4>
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowUserPicker(true)} disabled={loading || group.is_system}>+ Add Member</button>
                    </div>

                    {loading ? (
                        <div className="empty-state" style={{ padding: '2rem' }}>Loading…</div>
                    ) : members.length === 0 ? (
                        <div className="empty-state" style={{ padding: '2rem' }}>No members in this group.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 300, overflowY: 'auto' }}>
                            {members.map(m => (
                                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0.75rem', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{m.name || 'No name'}</span>
                                        <span className="text-muted text-xs">{m.email}</span>
                                    </div>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => removeUser(m.id)}
                                        style={{ color: '#EF4444', padding: '0.25rem' }}
                                        disabled={group.is_system}
                                        title={group.is_system ? "System group memberships are managed automatically" : "Remove user from group"}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {showUserPicker && (
                <div className="modal-backdrop" style={{ zIndex: 1001 }} onClick={e => e.target === e.currentTarget && setShowUserPicker(false)}>
                    <div className="modal" style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <h3>Add User to Group</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowUserPicker(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: 300, overflowY: 'auto' }}>
                            {availableUsers.length === 0 ? (
                                <div className="empty-state" style={{ padding: '1rem' }}>All users are already in this group.</div>
                            ) : (
                                availableUsers.map(u => (
                                    <button
                                        key={u.id}
                                        onClick={() => addUser(u.id)}
                                        style={{
                                            display: 'flex', flexDirection: 'column', width: '100%',
                                            padding: '0.625rem 0.75rem', border: 'none', background: 'none',
                                            color: 'var(--text-primary)', cursor: 'pointer',
                                            textAlign: 'left', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit',
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--row-hover)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                    >
                                        <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{u.name || 'No name'}</span>
                                        <span className="text-muted text-xs">{u.email}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function GroupsTab({ workspaceId }: { workspaceId: string }) {
    const [groups, setGroups] = useState<Group[]>([])
    const [newName, setNewName] = useState('')
    const [creating, setCreating] = useState(false)
    const [msg, setMsg] = useState('')
    const [manageGroup, setManageGroup] = useState<Group | null>(null)

    const load = useCallback(async () => {
        const res = await fetch(`/api/admin/groups/list?workspace_id=${workspaceId}`)
        if (res.ok) setGroups(await res.json())
    }, [workspaceId])

    useEffect(() => { load() }, [load])

    const create = async () => {
        setCreating(true); setMsg('')
        const res = await fetch('/api/admin/groups/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspace_id: workspaceId, name: newName.trim() }),
        })
        setCreating(false)
        if (res.ok) { const d = await res.json(); setGroups((g) => [...g, d.group]); setNewName(''); setMsg('✓ Group created') }
        else { const e = await res.json(); setMsg('Error: ' + (e.error || 'Failed')) }
    }

    const deleteGroup = async (groupId: string) => {
        await fetch('/api/admin/groups/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspace_id: workspaceId, group_id: groupId }),
        })
        setGroups((g) => g.filter((x) => x.id !== groupId))
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card">
                <div className="card-header"><h3>Create Group</h3></div>
                <div style={{ padding: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                    <div className="field" style={{ flex: 1 }}>
                        <label className="label">Group Name</label>
                        <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Dev Team" onKeyDown={(e) => e.key === 'Enter' && create()} />
                    </div>
                    <button className="btn btn-primary" onClick={create} disabled={!newName.trim() || creating}>{creating ? 'Creating…' : 'Create'}</button>
                    {msg && <span style={{ fontSize: '0.875rem', color: msg.startsWith('✓') ? 'var(--success)' : 'var(--error)' }}>{msg}</span>}
                </div>
            </div>

            <div className="card">
                <div className="card-header"><h3>Groups</h3></div>
                {groups.length === 0
                    ? <div className="empty-state">No groups yet. Create one above.</div>
                    : (
                        <div className="table-wrap">
                            <table>
                                <thead><tr><th>Name</th><th style={{ width: 80 }}></th></tr></thead>
                                <tbody>
                                    {groups.map((g) => (
                                        <tr key={g.id}>
                                            <td style={{ fontWeight: 500 }}>
                                                {g.name}
                                                {g.is_system && <span className="badge badge-admin" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>System</span>}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                    <button
                                                        className="btn btn-secondary btn-sm"
                                                        onClick={() => setManageGroup(g)}
                                                    >
                                                        Members
                                                    </button>
                                                    <button
                                                        className="btn btn-destructive btn-sm"
                                                        onClick={() => deleteGroup(g.id)}
                                                        disabled={g.is_system}
                                                        title={g.is_system ? "System groups cannot be deleted" : ""}
                                                    >
                                                        Delete
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
            {manageGroup && (
                <ManageMembersModal
                    workspaceId={workspaceId}
                    group={manageGroup}
                    onClose={() => setManageGroup(null)}
                />
            )}
        </div>
    )
}
