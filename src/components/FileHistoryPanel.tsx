import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { formatBytes, formatDate } from './FileList'

type Version = {
    id: string
    version_number: number
    size_bytes: number
    checksum_sha256: string | null
    mime_type: string | null
    created_at: string
    uploader: { name: string | null; email: string } | null
}

type CurrentFile = {
    id: string
    name: string
    size_bytes: number | null
    checksum_sha256: string | null
    mime_type: string | null
}

interface Props {
    file: CurrentFile
    workspaceId: string
    onClose: () => void
    onVersionRestored: () => void
}

function ClockIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
    )
}

function VersionRow({ version, objectId, workspaceId, onRestore, onPurge }: {
    version: Version
    objectId: string
    workspaceId: string
    onRestore: () => void
    onPurge: (id: string, size: number) => void
}) {
    const [restoring, setRestoring] = useState(false)
    const [purging, setPurging] = useState(false)
    const [error, setError] = useState('')

    const doRestore = async () => {
        setRestoring(true)
        setError('')
        try {
            const res = await fetch('/api/vault/file/history/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspace_id: workspaceId, object_id: objectId, version_id: version.id }),
                credentials: 'same-origin',
            })
            if (res.ok) {
                onRestore()
            } else {
                const d = await res.json()
                setError(d.error || 'Restore failed')
            }
        } catch {
            setError('Network error')
        } finally {
            setRestoring(false)
        }
    }

    const doPurge = async () => {
        if (!confirm(`Permanently delete version ${version.version_number}? This cannot be undone.`)) return
        setPurging(true)
        setError('')
        try {
            const res = await fetch('/api/vault/file/history/purge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspace_id: workspaceId, object_id: objectId, version_id: version.id }),
                credentials: 'same-origin',
            })
            if (res.ok) {
                onPurge(version.id, version.size_bytes)
            } else {
                const d = await res.json()
                setError(d.error || 'Purge failed')
            }
        } catch {
            setError('Network error')
        } finally {
            setPurging(false)
        }
    }

    const uploaderLabel = version.uploader?.name || version.uploader?.email || 'Unknown'

    return (
        <div style={{
            padding: '0.875rem',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                    Version {version.version_number}
                </span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    {formatBytes(version.size_bytes)}
                </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span>Saved {formatDate(version.created_at)} by {uploaderLabel}</span>
                {version.checksum_sha256 && (
                    <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', opacity: 0.7 }}>
                        SHA256: {version.checksum_sha256.slice(0, 16)}…
                    </span>
                )}
            </div>
            {error && <p style={{ fontSize: '0.75rem', color: '#EF4444', margin: 0 }}>{error}</p>}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <button
                    onClick={doRestore}
                    disabled={restoring || purging}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                >
                    {restoring ? 'Restoring…' : 'Restore this version'}
                </button>
                <button
                    onClick={doPurge}
                    disabled={restoring || purging}
                    className="btn btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', background: 'transparent', color: '#EF4444', border: '1px solid rgba(239,68,68,0.4)' }}
                >
                    {purging ? 'Deleting…' : 'Delete'}
                </button>
            </div>
        </div>
    )
}

export function FileHistoryPanel({ file, workspaceId, onClose, onVersionRestored }: Props) {
    const [versions, setVersions] = useState<Version[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const res = await fetch(
                `/api/vault/file/history?workspace_id=${workspaceId}&object_id=${file.id}`,
                { credentials: 'same-origin' }
            )
            if (res.ok) {
                const data = await res.json()
                setVersions(data.versions ?? [])
            } else {
                setError('Failed to load history')
            }
        } catch {
            setError('Network error')
        } finally {
            setLoading(false)
        }
    }, [workspaceId, file.id])

    useEffect(() => { load() }, [load])

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [onClose])

    const handleVersionRestored = () => {
        load()
        onVersionRestored()
    }

    const handleVersionPurged = (versionId: string) => {
        setVersions(prev => prev.filter(v => v.id !== versionId))
    }

    const uploaderForCurrent = null // current file uploader not in scope here

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.35)',
                    zIndex: 48,
                }}
            />
            {/* Drawer */}
            <div style={{
                position: 'fixed', top: 0, right: 0,
                width: 'min(440px, 100vw)',
                height: '100vh',
                background: 'var(--bg-card)',
                borderLeft: '1px solid var(--border)',
                boxShadow: '-4px 0 24px rgba(0,0,0,0.25)',
                zIndex: 49,
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.25rem 1.25rem 1rem',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    position: 'sticky', top: 0,
                    background: 'var(--bg-card)',
                    zIndex: 1,
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <ClockIcon />
                            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                                Version History
                            </span>
                        </div>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0, wordBreak: 'break-all' }}>
                            {file.name}
                        </p>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ flexShrink: 0 }}>✕</button>
                </div>

                {/* Body */}
                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>

                    {/* Current version */}
                    <div>
                        <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                            Current version
                        </p>
                        <div style={{
                            padding: '0.875rem',
                            border: '1px solid var(--accent)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(99,102,241,0.06)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.4rem',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                    v{(versions.length > 0 ? Math.max(...versions.map(v => v.version_number)) : 0) + 1} · Current
                                </span>
                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                    {formatBytes(file.size_bytes)}
                                </span>
                            </div>
                            {file.checksum_sha256 && (
                                <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
                                    SHA256: {file.checksum_sha256.slice(0, 16)}…
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Previous versions */}
                    <div>
                        <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                            Previous versions {versions.length > 0 && `(${versions.length})`}
                        </p>

                        {loading && (
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Loading…</p>
                        )}
                        {error && (
                            <p style={{ fontSize: '0.875rem', color: '#EF4444' }}>{error}</p>
                        )}
                        {!loading && !error && versions.length === 0 && (
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                No previous versions. Versions are created automatically when a file is overwritten with different content.
                            </p>
                        )}
                        {!loading && versions.map(v => (
                            <div key={v.id} style={{ marginBottom: '0.5rem' }}>
                                <VersionRow
                                    version={v}
                                    objectId={file.id}
                                    workspaceId={workspaceId}
                                    onRestore={handleVersionRestored}
                                    onPurge={handleVersionPurged}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>,
        document.body
    )
}
