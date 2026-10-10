'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import UsersTab from './tabs/UsersTab'
import InvitedTab from './tabs/InvitedTab'
import GroupsTab from './tabs/GroupsTab'
import FolderAccessTab from './tabs/FolderAccessTab'
import AuditLogTab from './tabs/AuditLogTab'
import SettingsTab from './tabs/SettingsTab'
import VerifiedLogTab from './tabs/VerifiedLogTab'

type Tab = 'users' | 'invited' | 'groups' | 'access' | 'audit' | 'verified' | 'settings'

const TAB_LABELS: Record<Tab, string> = {
    users: 'Users',
    invited: 'Invited',
    groups: 'Groups',
    access: 'Folder Access',
    audit: 'Audit Log',
    verified: 'Verified Log',
    settings: 'Settings',
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '0.625rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                fontFamily: 'inherit',
                cursor: 'pointer',
                border: 'none',
                background: 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'all 150ms',
            }}
        >
            {label}
        </button>
    )
}

export default function AdminPage() {
    const params = useParams()
    const workspaceId = params?.workspaceId as string
    const [tab, setTab] = useState<Tab>('users')
    const [roleCheck, setRoleCheck] = useState<'loading' | 'admin' | 'denied'>('loading')

    useEffect(() => {
        if (!workspaceId) return
        fetch(`/api/user/membership?workspace_id=${workspaceId}`)
            .then(r => r.ok ? r.json() : Promise.reject(r.status))
            .then(data => setRoleCheck(data.role === 'admin' ? 'admin' : 'denied'))
            .catch(() => setRoleCheck('denied'))
    }, [workspaceId])

    if (roleCheck === 'loading') {
        return (
            <>
                <div className="topbar">
                    <h2 style={{ fontSize: '1rem' }}>Admin Panel</h2>
                </div>
                <div className="content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                    <p className="text-muted">Checking permissions…</p>
                </div>
            </>
        )
    }

    if (roleCheck === 'denied') {
        return (
            <>
                <div className="topbar">
                    <h2 style={{ fontSize: '1rem' }}>Admin Panel</h2>
                </div>
                <div className="content">
                    <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: 480, margin: '2rem auto' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
                        <h3 style={{ marginBottom: '0.5rem' }}>Access Denied</h3>
                        <p className="text-muted" style={{ marginBottom: '1.5rem', lineHeight: 1.6 }}>
                            You do not have admin access to this workspace. Contact a workspace admin if you believe this is an error.
                        </p>
                        <a href={`/vault/${workspaceId}`} className="btn btn-primary">Back to Vault</a>
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            <div className="topbar">
                <h2 style={{ fontSize: '1rem' }}>Admin Panel</h2>
                <span className="badge badge-admin" style={{ marginLeft: '0.5rem' }}>Admin</span>
                {workspaceId && <span className="mono text-muted text-xs" style={{ marginLeft: 'auto' }}>{workspaceId.slice(0, 8)}…</span>}
            </div>

            <div className="content">
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', background: 'var(--surface)', borderRadius: 'var(--radius) var(--radius) 0 0', padding: '0 0.5rem', overflowX: 'auto' }}>
                    {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
                        <TabButton key={t} label={TAB_LABELS[t]} active={tab === t} onClick={() => setTab(t)} />
                    ))}
                </div>

                {!workspaceId ? (
                    <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                        <p>Set <code className="mono">NEXT_PUBLIC_DEFAULT_WORKSPACE_ID</code> in your <code className="mono">.env.local</code> to use the admin panel.</p>
                    </div>
                ) : (
                    <>
                        {tab === 'users' && <UsersTab workspaceId={workspaceId} />}
                        {tab === 'invited' && <InvitedTab workspaceId={workspaceId} />}
                        {tab === 'groups' && <GroupsTab workspaceId={workspaceId} />}
                        {tab === 'access' && <FolderAccessTab workspaceId={workspaceId} />}
                        {tab === 'audit' && <AuditLogTab workspaceId={workspaceId} />}
                        {tab === 'verified' && <VerifiedLogTab workspaceId={workspaceId} />}
                        {tab === 'settings' && <SettingsTab workspaceId={workspaceId} />}
                    </>
                )}
            </div>
        </>
    )
}
