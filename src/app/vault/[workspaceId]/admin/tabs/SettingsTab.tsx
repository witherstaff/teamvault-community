'use client'
import { useState, useEffect, useCallback } from 'react'
import { getPlan } from '@/lib/config'
import { CountryPicker } from '@/components/CountryPicker'

// ---------------------------------------------------------------------------
// Geofencing settings card
// ---------------------------------------------------------------------------
function GeofencingCard({ workspaceId }: { workspaceId: string }) {
    const [geoEnabled, setGeoEnabled] = useState(false)
    const [allowedCountries, setAllowedCountries] = useState<string[]>([])
    const [bypassAllowed, setBypassAllowed] = useState(false)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/workspace/geo?workspace_id=${workspaceId}`)
            if (res.ok) {
                const d = await res.json()
                setGeoEnabled(d.geo_enabled ?? false)
                setAllowedCountries(d.geo_allowed_countries ?? [])
                setBypassAllowed(d.geo_bypass_allowed ?? false)
            }
        } catch { }
        setLoading(false)
    }, [workspaceId])

    useEffect(() => { load() }, [load])

    const save = async () => {
        setSaving(true); setMsg('')
        const res = await fetch('/api/admin/workspace/geo', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                workspace_id: workspaceId,
                geo_enabled: geoEnabled,
                geo_allowed_countries: allowedCountries,
                geo_bypass_allowed: bypassAllowed,
            }),
        })
        setSaving(false)
        if (res.ok) {
            setMsg('✓ Geofencing settings saved')
        } else {
            const e = await res.json()
            setMsg('Error: ' + (e.error || 'Failed'))
        }
    }

    return (
        <div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1rem 0' }} />
            <h4 style={{ margin: '0 0 0.5rem 0' }}>Geofencing</h4>
            <p className="text-muted text-sm" style={{ marginBottom: '1rem' }}>
                Restrict workspace access by country. Users from unlisted countries will be blocked at sign-in.
            </p>

            {loading ? (
                <div className="text-muted text-sm">Loading…</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={geoEnabled}
                            onChange={e => setGeoEnabled(e.target.checked)}
                        />
                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Enable geofencing for this workspace</span>
                    </label>

                    {geoEnabled && (
                        <>
                            <div className="field">
                                <label className="label">Allowed Countries</label>
                                <CountryPicker value={allowedCountries} onChange={setAllowedCountries} />
                                <span className="text-muted text-xs" style={{ marginTop: '0.375rem', display: 'block' }}>
                                    Users from countries not in this list will be blocked. Leave empty to allow all countries.
                                </span>
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={bypassAllowed}
                                    onChange={e => setBypassAllowed(e.target.checked)}
                                />
                                <span style={{ fontSize: '0.875rem' }}>
                                    Allow blocked users to request an emailed bypass code
                                </span>
                            </label>
                            {bypassAllowed && (
                                <p className="text-muted text-xs" style={{ marginLeft: '1.5rem', marginTop: '-0.5rem' }}>
                                    Codes are valid for 5 minutes, single-use. Individual users can be overridden in the Users tab.
                                </p>
                            )}
                        </>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
                            {saving ? 'Saving…' : 'Save Geofencing'}
                        </button>
                        {msg && (
                            <span style={{ fontSize: '0.875rem', color: msg.startsWith('✓') ? 'var(--success)' : 'var(--error)' }}>
                                {msg}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

// ---------------------------------------------------------------------------
// Main settings tab
// ---------------------------------------------------------------------------
export default function SettingsTab({ workspaceId }: { workspaceId: string }) {
    const [name, setName] = useState('')
    const [planId, setPlanId] = useState<string>('team')
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState('')

    const load = useCallback(async () => {
        try {
            const res = await fetch(`/api/user/membership?workspace_id=${workspaceId}`)
            if (res.ok) {
                const data = await res.json()
                if (data.workspace_name) setName(data.workspace_name)
                if (data.plan_id) setPlanId(data.plan_id)
            }
        } catch (err) { }
    }, [workspaceId])

    useEffect(() => { load() }, [load])

    const save = async () => {
        if (!name.trim()) return
        setSaving(true)
        setMsg('')
        const res = await fetch('/api/admin/workspace/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspace_id: workspaceId, name: name.trim() })
        })
        setSaving(false)
        if (res.ok) {
            setMsg('✓ Workspace renamed. Refreshing sidebar...')
            setTimeout(() => window.location.reload(), 1500)
        } else {
            const e = await res.json()
            setMsg('Error: ' + (e.error || 'Failed'))
        }
    }

    return (
        <div className="card">
            <div className="card-header">
                <h3>Workspace Settings</h3>
                <span className="text-muted text-sm">Manage global workspace configuration.</span>
            </div>
            <div style={{ padding: '1.25rem', maxWidth: 500, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="field">
                    <label className="label">Workspace Name</label>
                    <input
                        className="input"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Acme Corp"
                        maxLength={50}
                        onKeyDown={e => e.key === 'Enter' && save()}
                    />
                    <span className="text-muted text-xs" style={{ marginTop: '0.25rem', display: 'block' }}>This name appears in the application sidebar for all users.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button className="btn btn-primary" onClick={save} disabled={saving || !name.trim()}>
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                    {msg && <span style={{ fontSize: '0.875rem', color: msg.startsWith('✓') ? 'var(--success)' : 'var(--error)' }}>{msg}</span>}
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1rem 0' }} />

                <div>
                    <h4 style={{ margin: '0 0 0.5rem 0' }}>Billing &amp; Subscription</h4>
                    {process.env.NEXT_PUBLIC_COMMERCIAL_MODE !== 'true' ? (
                        <p className="text-muted text-sm">
                            This workspace is running on <strong>TeamVault Community Edition</strong> ({getPlan(planId).name} plan, {getPlan(planId).storageLimitLabel} quota). Storage quotas are managed by your server administrator.
                        </p>
                    ) : getPlan(planId).internal ? (
                        <p className="text-muted text-sm">
                            This workspace is on the <strong>{getPlan(planId).name}</strong> internal plan. No billing is associated with this workspace.
                        </p>
                    ) : (
                        <>
                            <p className="text-muted text-sm" style={{ marginBottom: '1rem' }}>
                                Manage your storage plan, view billing history, and update payment methods via the Stripe Customer Portal.
                            </p>
                            <button className="btn btn-secondary" onClick={async () => {
                                try {
                                    const res = await fetch('/api/stripe/portal', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ workspace_id: workspaceId })
                                    })
                                    const data = await res.json()
                                    if (data.url) window.location.href = data.url
                                    else setMsg('Error: ' + (data.error || 'Failed to open billing portal'))
                                } catch (e) {
                                    setMsg('Error: Failed to open billing portal')
                                }
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                Manage Subscription
                            </button>
                        </>
                    )}
                </div>

                <GeofencingCard workspaceId={workspaceId} />
            </div>
        </div>
    )
}
