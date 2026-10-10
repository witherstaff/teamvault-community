'use client'
import { useState, useEffect } from 'react'
import { VERIFIED_DOWNLOADS_FOLDER_NAME } from '@/lib/config'

interface Rules {
    expires_at: string | null
    max_downloads: number | null
    allowed_emails: string[] | null
    allowed_ips: string[] | null
    watermark: boolean
    is_revoked: boolean
}

interface LinkOptionsModalProps {
    workspaceId: string
    objectId: string
    filename: string
    onClose: () => void
}

function daysHoursMinutesFromDate(isoDate: string | null): { days: string; hours: string; minutes: string } {
    if (!isoDate) return { days: '', hours: '', minutes: '' }
    const ms = new Date(isoDate).getTime() - Date.now()
    if (ms <= 0) return { days: '0', hours: '0', minutes: '0' }
    const totalMinutes = Math.floor(ms / 60000)
    const days = Math.floor(totalMinutes / 1440)
    const hours = Math.floor((totalMinutes % 1440) / 60)
    const minutes = totalMinutes % 60
    return { days: String(days), hours: String(hours), minutes: String(minutes) }
}

function buildExpiresAt(days: string, hours: string, minutes: string): string | null {
    const d = parseInt(days) || 0
    const h = parseInt(hours) || 0
    const m = parseInt(minutes) || 0
    const totalMs = (d * 86400 + h * 3600 + m * 60) * 1000
    if (totalMs <= 0) return null
    return new Date(Date.now() + totalMs).toISOString()
}

export function LinkOptionsModal({ workspaceId, objectId, filename, onClose }: LinkOptionsModalProps) {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [generating, setGenerating] = useState(false)
    const [error, setError] = useState('')
    const [saved, setSaved] = useState(false)
    const [dirty, setDirty] = useState(false)
    const [generatedLink, setGeneratedLink] = useState('')

    // Form state
    const [days, setDays] = useState('')
    const [hours, setHours] = useState('')
    const [minutes, setMinutes] = useState('')
    const [maxDownloads, setMaxDownloads] = useState('')
    const [emailsInput, setEmailsInput] = useState('')
    const [ipsInput, setIpsInput] = useState('')
    const [watermark, setWatermark] = useState(false)

    const markDirty = () => { setDirty(true); setSaved(false) }

    useEffect(() => {
        fetch(`/api/vault/verified/rules?workspace_id=${workspaceId}&object_id=${objectId}`)
            .then(r => r.ok ? r.json() : null)
            .then((rules: Rules | null) => {
                if (rules) {
                    const dhm = daysHoursMinutesFromDate(rules.expires_at)
                    setDays(dhm.days)
                    setHours(dhm.hours)
                    setMinutes(dhm.minutes)
                    setMaxDownloads(rules.max_downloads != null ? String(rules.max_downloads) : '')
                    setEmailsInput((rules.allowed_emails ?? []).join(', '))
                    setIpsInput((rules.allowed_ips ?? []).join(', '))
                    setWatermark(rules.watermark)
                }
            })
            .finally(() => setLoading(false))
    }, [workspaceId, objectId])

    const save = async (): Promise<boolean> => {
        setSaving(true); setError(''); setSaved(false)
        const expires_at = buildExpiresAt(days, hours, minutes)
        const max_downloads = maxDownloads ? parseInt(maxDownloads) : null
        const allowed_emails = emailsInput.trim()
            ? emailsInput.split(/[\s,]+/).map(e => e.trim()).filter(Boolean)
            : null
        const allowed_ips = ipsInput.trim()
            ? ipsInput.split(/[\s,\n]+/).map(ip => ip.trim()).filter(Boolean)
            : null

        const res = await fetch('/api/vault/verified/rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspace_id: workspaceId, object_id: objectId, expires_at, max_downloads, allowed_emails, allowed_ips, watermark }),
        })
        setSaving(false)
        if (res.ok) { setSaved(true); setDirty(false); return true }
        else { const e = await res.json(); setError(e.error || 'Failed to save'); return false }
    }

    const generateLink = async () => {
        setError('')
        // Auto-save if settings have changed
        if (dirty) {
            const ok = await save()
            if (!ok) return
        }
        setGenerating(true)
        const res = await fetch('/api/vault/verified/issue-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspace_id: workspaceId, object_id: objectId }),
        })
        setGenerating(false)
        if (res.ok) {
            const { link } = await res.json()
            setGeneratedLink(link)
            navigator.clipboard.writeText(link).catch(() => { })
        } else {
            const e = await res.json()
            setError(e.error || 'Failed to generate link')
        }
    }

    const fieldStyle = { display: 'flex', flexDirection: 'column' as const, gap: '0.375rem' }
    const labelStyle = { fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }
    const inputStyle = { padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none', width: '100%' }
    const rowStyle = { display: 'flex', gap: '0.625rem', alignItems: 'flex-end' }

    return (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: 520 }}>
                <div className="modal-header">
                    <div>
                        <h3 style={{ margin: 0 }}>Link Options</h3>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{filename} · {VERIFIED_DOWNLOADS_FOLDER_NAME}</span>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
                </div>

                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {loading ? <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading…</div> : (
                        <>
                            {/* Duration */}
                            <div style={fieldStyle}>
                                <span style={labelStyle}>Expiry Duration (blank = never expires)</span>
                                <div style={rowStyle}>
                                    {[['Days', days, setDays], ['Hours', hours, setHours], ['Mins', minutes, setMinutes]].map(([lbl, val, set]) => (
                                        <div key={lbl as string} style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{lbl as string}</div>
                                            <input type="number" min="0" style={inputStyle} value={val as string}
                                                onChange={e => { (set as (v: string) => void)(e.target.value); markDirty() }} placeholder="0" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Max downloads */}
                            <div style={fieldStyle}>
                                <label style={labelStyle}>Max Downloads (blank = unlimited)</label>
                                <input type="number" min="1" style={inputStyle} value={maxDownloads}
                                    onChange={e => { setMaxDownloads(e.target.value); markDirty() }} placeholder="e.g. 5" />
                            </div>

                            {/* Email allowlist */}
                            <div style={fieldStyle}>
                                <label style={labelStyle}>Allowed Emails (comma-separated, blank = any authenticated user)</label>
                                <textarea rows={2} style={{ ...inputStyle, resize: 'vertical' }} value={emailsInput}
                                    onChange={e => { setEmailsInput(e.target.value); markDirty() }}
                                    placeholder="investor@vc.com, partner@firm.com" />
                            </div>

                            {/* IP allowlist */}
                            <div style={fieldStyle}>
                                <label style={labelStyle}>Allowed IPs (comma-separated, blank = any IP)</label>
                                <textarea rows={2} style={{ ...inputStyle, resize: 'vertical' }} value={ipsInput}
                                    onChange={e => { setIpsInput(e.target.value); markDirty() }}
                                    placeholder="1.2.3.4, 10.0.0.0/24" />
                            </div>

                            {/* Watermark */}
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                                <input type="checkbox" checked={watermark} onChange={e => { setWatermark(e.target.checked); markDirty() }} />
                                Watermark downloads
                            </label>

                            {error && <div style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{error}</div>}
                            {saved && !error && <div style={{ color: 'var(--success)', fontSize: '0.875rem' }}>✓ Rules saved</div>}

                            {/* Generated link display */}
                            {generatedLink && (
                                <div style={{ background: 'var(--surface-active)', borderRadius: 'var(--radius-sm)', padding: '0.625rem 0.75rem', fontSize: '0.75rem', wordBreak: 'break-all', color: 'var(--accent)', border: '1px solid var(--border)' }}>
                                    ✓ Link copied to clipboard
                                    <div style={{ marginTop: '0.25rem', opacity: 0.75 }}>{generatedLink}</div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                    <button className="btn btn-secondary" onClick={save} disabled={saving || loading}>
                        {saving ? 'Saving…' : 'Save Rules'}
                    </button>
                    <button className="btn btn-primary" onClick={generateLink} disabled={generating || loading}>
                        {generating ? 'Generating…' : '🔗 Generate Link'}
                    </button>
                </div>
            </div>
        </div>
    )
}
