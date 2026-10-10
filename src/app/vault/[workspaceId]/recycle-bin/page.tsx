'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { formatBytes, formatDate, FileIcon, FolderIcon } from '@/components/FileList'
import { FileHistoryPanel } from '@/components/FileHistoryPanel'
import { PurgeConfirmModal, PurgeTarget } from '@/components/PurgeConfirmModal'
import { Toast } from '@/components/Toast'

// ── Types ─────────────────────────────────────────────────────────

type BinItem = {
    id: string
    name: string
    type: 'file' | 'folder'
    parent_id: string | null
    size_bytes: number | null
    checksum_sha256: string | null
    mime_type: string | null
    deleted_at: string
    deleted_by: string | null
    deleter: { name: string | null; email: string } | null
    expires_at: string | null
    retention_days: number | null
}

type ToastItem = { id: number; message: string; type: 'success' | 'error' }

// ── Helpers ───────────────────────────────────────────────────────

function getTimeGroup(deletedAt: string): string {
    const diffMs = Date.now() - new Date(deletedAt).getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Deleted today'
    if (diffDays === 1) return 'Deleted yesterday'
    if (diffDays <= 7) return 'Deleted this week'
    if (diffDays <= 30) return 'Deleted this month'
    return 'Older'
}

const GROUP_ORDER = ['Deleted today', 'Deleted yesterday', 'Deleted this week', 'Deleted this month', 'Older']

function isExpiringSoon(expiresAt: string | null): boolean {
    if (!expiresAt) return false
    const days = (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return days >= 0 && days < 7
}

function isExpired(expiresAt: string | null): boolean {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
}

function expiryLabel(expiresAt: string | null, retentionDays: number | null): string {
    if (retentionDays === null) return 'Never expires'
    if (!expiresAt) return '—'
    if (isExpired(expiresAt)) return 'Expiring soon'
    return `Expires ${formatDate(expiresAt)}`
}

// ── SVG Icons ─────────────────────────────────────────────────────

function TrashBinIcon() {
    return (
        <svg width="48" height="48" viewBox="0 0 20 20" fill="currentColor" style={{ opacity: 0.2 }}>
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
    )
}

function RestoreIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
        </svg>
    )
}

function HistoryIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
    )
}

// ── BinItemRow ────────────────────────────────────────────────────

function BinItemRow({
    item, workspaceId, onRestore, onHistory, onPurge, pathCache,
}: {
    item: BinItem
    workspaceId: string
    onRestore: (id: string) => void
    onHistory: (item: BinItem) => void
    onPurge: (item: BinItem) => void
    pathCache: React.RefObject<Map<string, string>>
}) {
    const [path, setPath] = useState<string | null>(null)
    const [restoring, setRestoring] = useState(false)

    // Lazily resolve parent path
    useEffect(() => {
        if (!item.parent_id) { setPath('/'); return }
        const cached = pathCache.current?.get(item.parent_id)
        if (cached) { setPath(cached); return }

        fetch(`/api/admin/recycle-bin/path?workspace_id=${workspaceId}&parent_id=${item.parent_id}`, { credentials: 'same-origin' })
            .then(r => r.ok ? r.json() : { path: '/' })
            .then(d => {
                const p = d.path || '/'
                pathCache.current?.set(item.parent_id!, p)
                setPath(p)
            })
            .catch(() => setPath('/'))
    }, [item.parent_id, workspaceId, pathCache])

    const doRestore = async () => {
        setRestoring(true)
        try {
            const res = await fetch('/api/admin/recycle-bin/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspace_id: workspaceId, object_id: item.id }),
                credentials: 'same-origin',
            })
            if (res.ok) {
                onRestore(item.id)
            }
        } finally {
            setRestoring(false)
        }
    }

    const expirySoon = isExpiringSoon(item.expires_at)
    const expired = isExpired(item.expires_at)
    const expiryColor = (expirySoon || expired) ? '#EF4444' : 'var(--text-secondary)'
    const deleterLabel = item.deleter?.name || item.deleter?.email || 'Unknown'

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: '0.75rem',
            padding: '0.875rem 1rem',
            borderBottom: '1px solid var(--border)',
            alignItems: 'start',
        }}>
            {/* Left: metadata */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', minWidth: 0 }}>
                {/* Icon */}
                <div style={{ flexShrink: 0, marginTop: '0.125rem', color: item.type === 'folder' ? 'var(--accent)' : 'var(--text-secondary)' }}>
                    {item.type === 'folder' ? <FolderIcon size={20} /> : <FileIcon size={20} />}
                </div>

                {/* Text */}
                <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                    </span>

                    {/* Location */}
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {path === null ? <span style={{ opacity: 0.5 }}>Resolving…</span> : path}
                    </span>

                    {/* Meta row */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
                        {item.size_bytes !== null && item.type === 'file' && (
                            <span>{formatBytes(item.size_bytes)}</span>
                        )}
                        <span>Deleted {formatDate(item.deleted_at)} by {deleterLabel}</span>
                        <span style={{ color: expiryColor, fontWeight: expirySoon || expired ? 600 : 400 }}>
                            {expiryLabel(item.expires_at, item.retention_days)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Right: actions */}
            <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button
                    onClick={doRestore}
                    disabled={restoring}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', padding: '0.35rem 0.65rem', whiteSpace: 'nowrap' }}
                    title="Restore to original location"
                >
                    <RestoreIcon />
                    {restoring ? 'Restoring…' : 'Restore'}
                </button>

                {item.type === 'file' && (
                    <button
                        onClick={() => onHistory(item)}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', padding: '0.35rem 0.65rem', whiteSpace: 'nowrap' }}
                        title="View version history"
                    >
                        <HistoryIcon />
                        History
                    </button>
                )}

                <button
                    onClick={() => onPurge(item)}
                    className="btn btn-sm"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem', background: 'transparent', color: '#EF4444', border: '1px solid rgba(239,68,68,0.35)', whiteSpace: 'nowrap' }}
                    title="Delete permanently"
                >
                    Delete
                </button>
            </div>
        </div>
    )
}

// ── Main Page ─────────────────────────────────────────────────────

export default function RecycleBinPage() {
    const params = useParams()
    const workspaceId = params?.workspaceId as string

    const [items, setItems] = useState<BinItem[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(0)
    const [loading, setLoading] = useState(true)
    const [retentionDays, setRetentionDays] = useState<number | null>(null)

    const [searchQuery, setSearchQuery] = useState('')
    const [typeFilter, setTypeFilter] = useState<'all' | 'file' | 'folder'>('all')

    const [historyFile, setHistoryFile] = useState<BinItem | null>(null)
    const [purgeTarget, setPurgeTarget] = useState<BinItem | null>(null)
    const [toasts, setToasts] = useState<ToastItem[]>([])

    const pathCache = useRef<Map<string, string>>(new Map())
    const LIMIT = 100 // fetch a full page so grouping is accurate

    const addToast = useCallback((message: string, type: 'success' | 'error') => {
        const id = Date.now()
        setToasts(prev => [...prev, { id, message, type }])
    }, [])

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    const loadItems = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(
                `/api/admin/recycle-bin?workspace_id=${workspaceId}&page=${page}&limit=${LIMIT}`,
                { credentials: 'same-origin' }
            )
            if (res.ok) {
                const data = await res.json()
                setItems(data.items ?? [])
                setTotal(data.total ?? 0)
                if (data.retention_days !== undefined) setRetentionDays(data.retention_days)
            }
        } finally {
            setLoading(false)
        }
    }, [workspaceId, page])

    useEffect(() => { loadItems() }, [loadItems])

    // Client-side filter
    const filtered = items.filter(item => {
        const matchesSearch = searchQuery === '' || item.name.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesType = typeFilter === 'all' || item.type === typeFilter
        return matchesSearch && matchesType
    })

    // Group by time period
    const groups: Record<string, BinItem[]> = {}
    for (const item of filtered) {
        const g = getTimeGroup(item.deleted_at)
        if (!groups[g]) groups[g] = []
        groups[g].push(item)
    }
    const orderedGroups = GROUP_ORDER.filter(g => groups[g]?.length > 0)

    const handleRestore = useCallback((id: string) => {
        const item = items.find(i => i.id === id)
        setItems(prev => prev.filter(i => i.id !== id))
        addToast(`"${item?.name}" restored successfully`, 'success')
    }, [items, addToast])

    const handlePurgeSuccess = useCallback((id: string) => {
        const item = items.find(i => i.id === id)
        setItems(prev => prev.filter(i => i.id !== id))
        addToast(`"${item?.name}" permanently deleted`, 'success')
    }, [items, addToast])

    const retentionLabel = retentionDays === null
        ? 'Items are kept indefinitely until manually deleted.'
        : `Items are permanently deleted after ${retentionDays} day${retentionDays !== 1 ? 's' : ''}.`

    return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>

            {/* Header */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    Recycle Bin
                </h1>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Deleted files are held here so you can restore them if needed.
                </p>
            </div>

            {/* Info banner */}
            <div style={{
                padding: '0.75rem 1rem',
                background: 'rgba(99,102,241,0.06)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
                color: 'var(--text-secondary)',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
            }}>
                <span>ℹ</span>
                <span>
                    Files in the recycle bin are still counted toward your storage quota. {retentionLabel}
                </span>
            </div>

            {/* Filter bar */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <input
                    type="search"
                    placeholder="Search by name…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="input"
                    style={{ flex: '1 1 200px', minWidth: 0 }}
                />
                <select
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value as 'all' | 'file' | 'folder')}
                    className="input"
                    style={{ width: 'auto', minWidth: 130 }}
                >
                    <option value="all">All types</option>
                    <option value="file">Files only</option>
                    <option value="folder">Folders only</option>
                </select>
            </div>

            {/* Content */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
                    Loading…
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <TrashBinIcon />
                    <div>
                        <p style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
                            {searchQuery || typeFilter !== 'all' ? 'No items match your filter' : 'Recycle bin is empty'}
                        </p>
                        <p style={{ fontSize: '0.875rem' }}>
                            {searchQuery || typeFilter !== 'all'
                                ? 'Try a different search or filter.'
                                : 'Files deleted from the vault appear here before being permanently removed.'}
                        </p>
                    </div>
                </div>
            ) : (
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                    {orderedGroups.map((groupName, gi) => (
                        <div key={groupName}>
                            {/* Group header */}
                            <div style={{
                                padding: '0.5rem 1rem',
                                background: 'var(--bg)',
                                borderBottom: '1px solid var(--border)',
                                borderTop: gi > 0 ? '1px solid var(--border)' : undefined,
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                color: 'var(--text-secondary)',
                            }}>
                                {groupName}
                                <span style={{ fontWeight: 400, marginLeft: '0.5rem', opacity: 0.7 }}>
                                    ({groups[groupName].length})
                                </span>
                            </div>

                            {/* Items */}
                            {groups[groupName].map(item => (
                                <BinItemRow
                                    key={item.id}
                                    item={item}
                                    workspaceId={workspaceId}
                                    onRestore={handleRestore}
                                    onHistory={setHistoryFile}
                                    onPurge={setPurgeTarget}
                                    pathCache={pathCache}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {total > LIMIT && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                    >
                        ← Prev
                    </button>
                    <span>Page {page + 1} of {Math.ceil(total / LIMIT)}</span>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setPage(p => p + 1)}
                        disabled={(page + 1) * LIMIT >= total}
                    >
                        Next →
                    </button>
                </div>
            )}

            {/* File History Panel */}
            {historyFile && (
                <FileHistoryPanel
                    file={{
                        id: historyFile.id,
                        name: historyFile.name,
                        size_bytes: historyFile.size_bytes,
                        checksum_sha256: historyFile.checksum_sha256,
                        mime_type: historyFile.mime_type,
                    }}
                    workspaceId={workspaceId}
                    onClose={() => setHistoryFile(null)}
                    onVersionRestored={() => addToast('Version restored successfully', 'success')}
                />
            )}

            {/* Purge Confirmation Modal */}
            {purgeTarget && (
                <PurgeConfirmModal
                    item={purgeTarget}
                    workspaceId={workspaceId}
                    onClose={() => setPurgeTarget(null)}
                    onSuccess={handlePurgeSuccess}
                />
            )}

            {/* Toasts */}
            <div className="toast-container">
                {toasts.map(t => (
                    <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
                ))}
            </div>
        </div>
    )
}
