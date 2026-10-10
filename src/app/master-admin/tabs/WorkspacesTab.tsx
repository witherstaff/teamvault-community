'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { getPlan } from '@/lib/config'
import { Workspace, WorkspaceMember, formatBytes, PlanBadge, INTERNAL_PLANS } from '../components/shared'

// ── Workspace Detail Panel ────────────────────────────────────────

export function WorkspaceDetail({ ws, onClose, onPlanChange }: {
    ws: Workspace
    onClose: () => void
    onPlanChange: (workspaceId: string, planId: string) => Promise<void>
}) {
    const [members, setMembers] = useState<WorkspaceMember[]>([])
    const [loadingMembers, setLoadingMembers] = useState(true)
    const [changing, setChanging] = useState(false)
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

    useEffect(() => {
        setLoadingMembers(true)
        fetch(`/api/master-admin/workspace/details?workspaceId=${ws.id}`)
            .then(r => r.json())
            .then(d => setMembers(d.users ?? []))
            .finally(() => setLoadingMembers(false))
    }, [ws.id])

    const admins = members.filter(m => m.role === 'admin')
    const users = members.filter(m => m.role === 'user')
    const storePct = ws.storage_limit_bytes > 0
        ? Math.min(100, Math.round((ws.storage_used_bytes / ws.storage_limit_bytes) * 100))
        : 0
    const storeColor = storePct > 85 ? 'var(--error)' : storePct > 60 ? '#d97706' : 'var(--accent)'

    const handlePlanChange = async (planId: string) => {
        setChanging(true)
        setMsg(null)
        await onPlanChange(ws.id, planId)
        setMsg({ ok: true, text: `Plan updated to ${planId}` })
        setChanging(false)
    }

    const statusColor = (s: string) => s === 'active' ? 'var(--success)' : s === 'invited' ? '#d97706' : 'var(--text-muted)'

    return (
        <div className="card" style={{ marginTop: '1.5rem', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)' }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{ws.name}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{ws.id}</div>
                </div>
                <button className="btn btn-ghost" onClick={onClose} style={{ fontSize: '0.875rem' }}>Close</button>
            </div>

            <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Plan</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <PlanBadge planId={ws.plan_id ?? 'unknown'} />
                            <select
                                className="input"
                                defaultValue=""
                                style={{ fontSize: '0.8125rem', height: '30px', padding: '0 0.5rem' }}
                                onChange={e => { if (e.target.value) handlePlanChange(e.target.value) }}
                                disabled={changing}
                            >
                                <option value="" disabled>Change plan…</option>
                                {INTERNAL_PLANS.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.storageLimitLabel})</option>
                                ))}
                            </select>
                            {msg && <span style={{ fontSize: '0.8125rem', color: msg.ok ? 'var(--success)' : 'var(--error)' }}>{msg.ok ? '✓ ' : '✗ '}{msg.text}</span>}
                            {changing && <span className="text-muted text-sm">Saving…</span>}
                        </div>
                    </div>

                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Storage</div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                            {formatBytes(ws.storage_used_bytes)}
                            <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.875rem' }}> / {formatBytes(ws.storage_limit_bytes)}</span>
                        </div>
                        <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${storePct}%`, height: '100%', background: storeColor, borderRadius: 4, transition: 'width 0.3s' }} />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{storePct}% used</div>
                    </div>

                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admins</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{admins.length}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Users</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{users.length}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{members.length}</div>
                        </div>
                    </div>
                </div>

                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Members</div>
                    {loadingMembers ? (
                        <div className="text-muted text-sm">Loading members…</div>
                    ) : members.length === 0 ? (
                        <div className="text-muted text-sm">No members found</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: 280, overflowY: 'auto' }}>
                            {[...admins, ...users].map(m => (
                                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.5rem', borderRadius: 6, background: 'var(--surface)', fontSize: '0.8125rem' }}>
                                    <span style={{
                                        fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                                        padding: '0.1rem 0.4rem', borderRadius: 3,
                                        background: m.role === 'admin' ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--border)',
                                        color: m.role === 'admin' ? 'var(--accent)' : 'var(--text-muted)',
                                        minWidth: 40, textAlign: 'center',
                                    }}>{m.role}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name ?? m.email}</div>
                                        {m.name && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>}
                                    </div>
                                    <span style={{ fontSize: '0.7rem', color: statusColor(m.status), fontWeight: 500 }}>{m.status}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ── Create Workspace Panel ────────────────────────────────────────

export function CreateWorkspacePanel({ onCreated }: { onCreated?: () => void }) {
    const [wsName, setWsName] = useState('')
    const [email, setEmail] = useState('')
    const [planId, setPlanId] = useState(INTERNAL_PLANS[0]?.id ?? '')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

    const submit = async () => {
        setLoading(true)
        setResult(null)
        try {
            const res = await fetch('/api/master-admin/workspace/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspaceName: wsName.trim(), adminEmail: email.trim(), planId }),
            })
            const data = await res.json()
            if (res.ok) {
                setResult({ ok: true, msg: `Created — ID: ${data.workspaceId}` })
                setWsName('')
                setEmail('')
                onCreated?.()
            } else {
                setResult({ ok: false, msg: data.error ?? 'Failed to create workspace' })
            }
        } catch (e: any) {
            setResult({ ok: false, msg: e.message })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '1rem' }}>Create Internal Workspace</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '0.75rem', alignItems: 'end' }}>
                <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Workspace Name</label>
                    <input className="input" value={wsName} onChange={e => setWsName(e.target.value)} placeholder="e.g. Acme Internal" />
                </div>
                <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Admin Email</label>
                    <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" />
                </div>
                <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Plan</label>
                    <select className="input" value={planId} onChange={e => setPlanId(e.target.value)} style={{ height: '38px' }}>
                        {INTERNAL_PLANS.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.storageLimitLabel})</option>
                        ))}
                    </select>
                </div>
                <button className="btn btn-primary" onClick={submit} disabled={loading || !wsName.trim() || !email.trim() || !planId} style={{ alignSelf: 'end' }}>
                    {loading ? 'Creating…' : 'Create'}
                </button>
            </div>
            {result && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: result.ok ? 'var(--success)' : 'var(--error)' }}>
                    {result.msg}
                </div>
            )}
        </div>
    )
}

// ── Workspaces Tab ────────────────────────────────────────────────

export default function WorkspacesTab() {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [changing, setChanging] = useState<string | null>(null)
    const [msg, setMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null)
    const [selected, setSelected] = useState<Workspace | null>(null)

    const load = async () => {
        setLoading(true)
        const res = await fetch('/api/master-admin/workspaces')
        if (res.ok) setWorkspaces(await res.json())
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    const filtered = useMemo(() => {
        const q = search.toLowerCase()
        if (!q) return workspaces
        return workspaces.filter(w =>
            w.name.toLowerCase().includes(q) || w.id.toLowerCase().includes(q)
        )
    }, [workspaces, search])

    const changePlan = async (workspaceId: string, planId: string) => {
        setChanging(workspaceId)
        setMsg(null)
        const res = await fetch('/api/master-admin/workspace/set-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspaceId, planId }),
        })
        const data = await res.json()
        if (res.ok) {
            const newLimit = getPlan(planId).storageLimitBytes
            setWorkspaces(prev => prev.map(w => w.id === workspaceId
                ? { ...w, plan_id: planId, storage_limit_bytes: newLimit ?? w.storage_limit_bytes }
                : w
            ))
            setSelected(prev => prev?.id === workspaceId
                ? { ...prev, plan_id: planId, storage_limit_bytes: newLimit ?? prev.storage_limit_bytes }
                : prev
            )
            setMsg({ id: workspaceId, ok: true, text: `Plan updated to ${planId}` })
        } else {
            setMsg({ id: workspaceId, ok: false, text: data.error ?? 'Failed to update plan' })
        }
        setChanging(null)
    }

    const selectWorkspace = (ws: Workspace) => {
        setSelected(prev => prev?.id === ws.id ? null : ws)
    }

    return (
        <div>
            <CreateWorkspacePanel onCreated={load} />

            <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input
                        className="input"
                        placeholder="Search by name or ID…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ maxWidth: 320 }}
                    />
                    <span className="text-muted text-sm">{filtered.length} workspace{filtered.length !== 1 ? 's' : ''}</span>
                </div>

                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center' }} className="text-muted text-sm">Loading…</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                {['Name', 'ID', 'Plan', 'Storage', 'Change Plan', ''].map(h => (
                                    <th key={h} style={{ padding: '0.625rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(ws => {
                                const isSelected = selected?.id === ws.id
                                return (
                                    <tr key={ws.id} style={{ borderBottom: '1px solid var(--border)', background: isSelected ? 'color-mix(in srgb, var(--accent) 6%, transparent)' : undefined }}>
                                        <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>
                                            <button
                                                onClick={() => selectWorkspace(ws)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, color: isSelected ? 'var(--accent)' : 'inherit', fontFamily: 'inherit', fontSize: 'inherit', padding: 0, textAlign: 'left' }}
                                            >
                                                {ws.name}
                                            </button>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ws.id}</td>
                                        <td style={{ padding: '0.75rem 1rem' }}><PlanBadge planId={ws.plan_id ?? 'unknown'} /></td>
                                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                                            {formatBytes(ws.storage_used_bytes)} / {formatBytes(ws.storage_limit_bytes)}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <select
                                                className="input"
                                                defaultValue=""
                                                style={{ fontSize: '0.8125rem', height: '32px', padding: '0 0.5rem' }}
                                                onChange={e => { if (e.target.value) changePlan(ws.id, e.target.value) }}
                                                disabled={changing === ws.id}
                                            >
                                                <option value="" disabled>Select plan…</option>
                                                {INTERNAL_PLANS.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name} ({p.storageLimitLabel})</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', minWidth: 160 }}>
                                            {msg?.id === ws.id && (
                                                <span style={{ fontSize: '0.8125rem', color: msg.ok ? 'var(--success)' : 'var(--error)' }}>
                                                    {msg.ok ? '✓ ' : '✗ '}{msg.text}
                                                </span>
                                            )}
                                            {changing === ws.id && <span className="text-muted text-sm">Saving…</span>}
                                            {!msg?.id && changing !== ws.id && (
                                                <button
                                                    onClick={() => selectWorkspace(ws)}
                                                    className="btn btn-ghost"
                                                    style={{ fontSize: '0.8125rem', padding: '0.25rem 0.75rem' }}
                                                >
                                                    {isSelected ? 'Hide' : 'View'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                            {filtered.length === 0 && (
                                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center' }} className="text-muted text-sm">No workspaces found</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {selected && (
                <WorkspaceDetail
                    ws={selected}
                    onClose={() => setSelected(null)}
                    onPlanChange={changePlan}
                />
            )}
        </div>
    )
}
