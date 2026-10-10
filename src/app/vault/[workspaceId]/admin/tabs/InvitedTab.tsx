'use client'
import { useState, useEffect, useCallback } from 'react'
import type { UserRow } from './types'

export default function InvitedTab({ workspaceId }: { workspaceId: string }) {
    const [invitedUsers, setInvitedUsers] = useState<UserRow[]>([])
    const [loading, setLoading] = useState(true)

    const load = useCallback(async () => {
        setLoading(true)
        const res = await fetch(`/api/admin/users/list?workspace_id=${workspaceId}`)
        if (res.ok) {
            const all: UserRow[] = await res.json()
            setInvitedUsers(all.filter(u => u.status === 'invited'))
        }
        setLoading(false)
    }, [workspaceId])

    useEffect(() => { load() }, [load])

    return (
        <div className="card">
            <div className="card-header">
                <h3>Pending Invites</h3>
                <button className="btn btn-secondary btn-sm" onClick={load}>Refresh</button>
            </div>
            {loading
                ? <div className="empty-state">Loading…</div>
                : invitedUsers.length === 0
                    ? <div className="empty-state">No pending invites. All invited users have logged in.</div>
                    : (
                        <div className="table-wrap">
                            <table>
                                <thead><tr><th>Email</th><th>Role</th><th>Upload</th><th>Invited</th></tr></thead>
                                <tbody>
                                    {invitedUsers.map((u) => (
                                        <tr key={u.id}>
                                            <td className="mono">{u.email}</td>
                                            <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                                            <td>{u.can_upload ? '✓' : '—'}</td>
                                            <td className="text-muted text-sm">{new Date(u.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
        </div>
    )
}
