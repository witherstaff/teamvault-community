'use client'

import React, { useState, useEffect } from 'react'

interface SlackUsageStatus {
    period: string
    planId: string
    limits: {
        unfurlsPerMonth: number | null
        sharesPerMonth: number | null
        notificationsPerMonth: number | null
        burstPerMinute: number | null
    }
    unfurls: number
    shares: number
    notifications: number
    burstMinuteCount: number
    isUnfurlsExhausted: boolean
    isSharesExhausted: boolean
    isNotificationsExhausted: boolean
}

interface SlackSettingsData {
    installed: boolean
    teamId?: string
    teamName?: string
    previewMode?: 'filename' | 'locked' | 'off'
    thumbnails?: boolean
    emailAutolink?: boolean
    adminChannelId?: string | null
    installedAt?: string
    usage?: SlackUsageStatus
}

export default function SlackIntegrationsTab({ workspaceId }: { workspaceId: string }) {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [disconnecting, setDisconnecting] = useState(false)
    const [data, setData] = useState<SlackSettingsData | null>(null)
    const [previewMode, setPreviewMode] = useState<'filename' | 'locked' | 'off'>('filename')
    const [thumbnails, setThumbnails] = useState(false)
    const [emailAutolink, setEmailAutolink] = useState(true)
    const [adminChannelId, setAdminChannelId] = useState('')
    const [channels, setChannels] = useState<{ id: string; name: string; is_private: boolean }[]>([])
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

    const fetchSettings = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/slack/settings?workspace_id=${workspaceId}`)
            if (res.ok) {
                const json: SlackSettingsData = await res.json()
                setData(json)
                if (json.previewMode) setPreviewMode(json.previewMode)
                if (json.thumbnails !== undefined) setThumbnails(json.thumbnails)
                if (json.emailAutolink !== undefined) setEmailAutolink(json.emailAutolink)
                setAdminChannelId(json.adminChannelId ?? '')
                if (json.installed) {
                    fetch(`/api/slack/channels?workspace_id=${workspaceId}`)
                        .then(r => r.ok ? r.json() : null)
                        .then(c => c?.channels && setChannels(c.channels))
                        .catch(() => { })
                }
            }
        } catch (err) {
            console.error('Failed to load Slack settings:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSettings()
    }, [workspaceId])

    const handleSave = async () => {
        setSaving(true)
        setMessage(null)
        try {
            const res = await fetch('/api/slack/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workspace_id: workspaceId,
                    preview_mode: previewMode,
                    thumbnails,
                    email_autolink: emailAutolink,
                    admin_channel_id: adminChannelId || null,
                }),
            })
            if (res.ok) {
                setMessage({ text: 'Slack settings saved successfully', type: 'success' })
                await fetchSettings()
            } else {
                setMessage({ text: 'Failed to save settings', type: 'error' })
            }
        } catch {
            setMessage({ text: 'Network error saving settings', type: 'error' })
        } finally {
            setSaving(false)
        }
    }

    const handleDisconnect = async () => {
        if (!confirm('Are you sure you want to disconnect Slack from this workspace? Previews and notifications will stop.')) {
            return
        }

        setDisconnecting(true)
        setMessage(null)
        try {
            const res = await fetch('/api/slack/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workspace_id: workspaceId,
                    action: 'disconnect',
                }),
            })
            if (res.ok) {
                setMessage({ text: 'Slack disconnected from workspace', type: 'success' })
                await fetchSettings()
            } else {
                setMessage({ text: 'Failed to disconnect', type: 'error' })
            }
        } catch {
            setMessage({ text: 'Network error', type: 'error' })
        } finally {
            setDisconnecting(false)
        }
    }

    if (loading) {
        return (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <p className="text-muted">Loading Slack integration settings…</p>
            </div>
        )
    }

    const usage = data?.usage

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header Card */}
            <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: 'var(--radius)',
                            background: '#4A154B',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.75rem'
                        }}>
                            💬
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.125rem' }}>TeamVault for Slack</h3>
                                {data?.installed ? (
                                    <span className="badge badge-success">Connected</span>
                                ) : (
                                    <span className="badge badge-secondary">Not Connected</span>
                                )}
                            </div>
                            <p className="text-muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
                                Instant link previews, secure file sharing, and team notifications. Included free on all plans.
                            </p>
                        </div>
                    </div>

                    <div>
                        {data?.installed ? (
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={handleDisconnect}
                                disabled={disconnecting}
                                style={{ color: '#EF4444' }}
                            >
                                {disconnecting ? 'Disconnecting…' : 'Disconnect Slack'}
                            </button>
                        ) : (
                            <a
                                href={`/api/slack/install?workspace_id=${workspaceId}`}
                                className="btn btn-primary"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <span>Add to Slack</span>
                            </a>
                        )}
                    </div>
                </div>

                {data?.installed && (
                    <div style={{
                        marginTop: '1.25rem',
                        paddingTop: '1rem',
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.875rem'
                    }}>
                        <div>
                            Connected to Slack workspace: <strong>{data.teamName || data.teamId}</strong>
                        </div>
                        {data.installedAt && (
                            <span className="text-muted text-xs">
                                Installed {new Date(data.installedAt).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Notification message */}
            {message && (
                <div style={{
                    padding: '0.875rem 1.25rem',
                    borderRadius: 'var(--radius-sm)',
                    background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${message.type === 'success' ? '#10B981' : '#EF4444'}`,
                    color: message.type === 'success' ? '#10B981' : '#EF4444',
                    fontSize: '0.875rem',
                }}>
                    {message.text}
                </div>
            )}

            {/* Preview Settings */}
            <div className="card" style={{ padding: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Link Preview Policy</h4>
                <p className="text-muted" style={{ margin: '0 0 1.25rem 0', fontSize: '0.875rem' }}>
                    Control what team members see in Slack when someone pastes a TeamVault file or folder link.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    <label style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        padding: '0.875rem',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        background: previewMode === 'filename' ? 'var(--row-selected)' : 'transparent',
                    }}>
                        <input
                            type="radio"
                            name="preview_mode"
                            value="filename"
                            checked={previewMode === 'filename'}
                            onChange={() => setPreviewMode('filename')}
                            style={{ marginTop: '0.2rem' }}
                        />
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                Filename & File Details <span className="badge badge-primary text-xs" style={{ marginLeft: '0.25rem' }}>Default</span>
                            </div>
                            <div className="text-muted text-xs" style={{ marginTop: '0.125rem' }}>
                                Displays file name, extension, size, and workspace name. Clicking still enforces full TeamVault authorization.
                            </div>
                        </div>
                    </label>

                    <label style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        padding: '0.875rem',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        background: previewMode === 'locked' ? 'var(--row-selected)' : 'transparent',
                    }}>
                        <input
                            type="radio"
                            name="preview_mode"
                            value="locked"
                            checked={previewMode === 'locked'}
                            onChange={() => setPreviewMode('locked')}
                            style={{ marginTop: '0.2rem' }}
                        />
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>🔒 Locked Card Only</div>
                            <div className="text-muted text-xs" style={{ marginTop: '0.125rem' }}>
                                Displays "TeamVault Protected Link" and workspace name. Filenames remain hidden until opened in TeamVault.
                            </div>
                        </div>
                    </label>

                    <label style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        padding: '0.875rem',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        background: previewMode === 'off' ? 'var(--row-selected)' : 'transparent',
                    }}>
                        <input
                            type="radio"
                            name="preview_mode"
                            value="off"
                            checked={previewMode === 'off'}
                            onChange={() => setPreviewMode('off')}
                            style={{ marginTop: '0.2rem' }}
                        />
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Off</div>
                            <div className="text-muted text-xs" style={{ marginTop: '0.125rem' }}>
                                Disable Slack previews. TeamVault links will appear as plain un-expanded URLs.
                            </div>
                        </div>
                    </label>
                </div>

                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                        <input
                            type="checkbox"
                            checked={thumbnails}
                            onChange={(e) => setThumbnails(e.target.checked)}
                        />
                        <span>Enable visual thumbnails in previews for images & PDFs (Default: Off)</span>
                    </label>
                    <div className="text-muted text-xs" style={{ marginLeft: '1.5rem', marginTop: '0.25rem' }}>
                        Thumbnails use short-lived signed URLs. Verified Downloads never show thumbnails regardless of this setting.
                    </div>
                </div>

                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                        <input
                            type="checkbox"
                            checked={emailAutolink}
                            onChange={(e) => setEmailAutolink(e.target.checked)}
                        />
                        <span>Match Slack and TeamVault accounts by email (recommended)</span>
                    </label>
                    <div className="text-muted text-xs" style={{ marginLeft: '1.5rem', marginTop: '0.25rem' }}>
                        Lets people share files and receive notifications without any extra setup. Slack verifies email addresses.
                    </div>
                </div>

                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                    <label htmlFor="slack-admin-channel" style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '0.375rem' }}>
                        Admin alert channel
                    </label>
                    <select
                        id="slack-admin-channel"
                        className="input"
                        value={adminChannelId}
                        onChange={(e) => setAdminChannelId(e.target.value)}
                        disabled={!data?.installed}
                    >
                        <option value="">None — don&apos;t send admin alerts</option>
                        {channels.map(c => (
                            <option key={c.id} value={c.id}>{c.is_private ? '🔒 ' : '# '}{c.name}</option>
                        ))}
                    </select>
                    <div className="text-muted text-xs" style={{ marginTop: '0.25rem' }}>
                        Receives storage warnings (80% / 95%), Slack usage alerts, folder access changes and recursive folder deletions.
                        Invite the TeamVault app to private channels first.
                    </div>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? 'Saving…' : 'Save Preview Settings'}
                    </button>
                </div>
            </div>

            {/* Monthly Usage & Limits */}
            {usage && (
                <div className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div>
                            <h4 style={{ margin: 0, fontSize: '1rem' }}>Current Usage & Plan Allowance</h4>
                            <div className="text-muted text-xs" style={{ marginTop: '0.25rem' }}>
                                Period: <strong>{usage.period}</strong> · Plan: <strong>{usage.planId.toUpperCase()}</strong>
                            </div>
                        </div>
                        <span className="badge badge-secondary">
                            Burst Cap: {usage.limits.burstPerMinute ? `${usage.limits.burstPerMinute} req/min` : 'Unlimited'}
                        </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        {/* Unfurls Meter */}
                        <div style={{
                            padding: '1rem',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-subtle)'
                        }}>
                            <div className="text-muted text-xs">Link Previews Rendered</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0.25rem 0' }}>
                                {usage.unfurls.toLocaleString()}
                                <span className="text-muted text-xs" style={{ fontWeight: 400, marginLeft: '0.25rem' }}>
                                    / {usage.limits.unfurlsPerMonth ? usage.limits.unfurlsPerMonth.toLocaleString() : 'Unlimited'}
                                </span>
                            </div>
                            {usage.limits.unfurlsPerMonth && (
                                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginTop: '0.5rem' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${Math.min(100, (usage.unfurls / usage.limits.unfurlsPerMonth) * 100)}%`,
                                        background: usage.isUnfurlsExhausted ? '#EF4444' : 'var(--primary)'
                                    }} />
                                </div>
                            )}
                        </div>

                        {/* Shares Meter */}
                        <div style={{
                            padding: '1rem',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-subtle)'
                        }}>
                            <div className="text-muted text-xs">Shares to Slack</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0.25rem 0' }}>
                                {usage.shares.toLocaleString()}
                                <span className="text-muted text-xs" style={{ fontWeight: 400, marginLeft: '0.25rem' }}>
                                    / {usage.limits.sharesPerMonth ? usage.limits.sharesPerMonth.toLocaleString() : 'Unlimited'}
                                </span>
                            </div>
                            {usage.limits.sharesPerMonth && (
                                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginTop: '0.5rem' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${Math.min(100, (usage.shares / usage.limits.sharesPerMonth) * 100)}%`,
                                        background: usage.isSharesExhausted ? '#EF4444' : 'var(--primary)'
                                    }} />
                                </div>
                            )}
                        </div>

                        {/* Notifications Meter */}
                        <div style={{
                            padding: '1rem',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-subtle)'
                        }}>
                            <div className="text-muted text-xs">Notifications Sent</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0.25rem 0' }}>
                                {usage.notifications.toLocaleString()}
                                <span className="text-muted text-xs" style={{ fontWeight: 400, marginLeft: '0.25rem' }}>
                                    / {usage.limits.notificationsPerMonth ? usage.limits.notificationsPerMonth.toLocaleString() : 'Unlimited'}
                                </span>
                            </div>
                            {usage.limits.notificationsPerMonth && (
                                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginTop: '0.5rem' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${Math.min(100, (usage.notifications / usage.limits.notificationsPerMonth) * 100)}%`,
                                        background: usage.isNotificationsExhausted ? '#EF4444' : 'var(--primary)'
                                    }} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
