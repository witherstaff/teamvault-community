import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { VaultObject } from './FileList'
import { VERIFIED_DOWNLOADS_FOLDER_NAME, VERIFIED_DOWNLOADS_FOLDER_NAMES, VERIFIED_DOWNLOADS_ALLOWED_EXTENSIONS, isAllowedInVerifiedDownloads } from '@/lib/config'

interface MoveModalProps {
    items: VaultObject[]
    workspaceId: string
    onClose: () => void
    onSuccess: (renames?: Array<{ original: string; resolved: string }>) => void
}

export function MoveModal({ items, workspaceId, onClose, onSuccess }: MoveModalProps) {
    const [loading, setLoading] = useState(false)
    const [folders, setFolders] = useState<any[]>([])
    const [selectedFolderId, setSelectedFolderId] = useState<string>('') // Dynamic based on fetch
    const [error, setError] = useState('')
    const [fetching, setFetching] = useState(true)

    useEffect(() => {
        fetch(`/api/vault/folders?workspace_id=${workspaceId}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    // Filter out folders that are in the items list to prevent moving a folder into itself
                    // Also ideally we'd filter out children of selected folders, but preventing moving into self is a good start.
                    const itemIds = new Set(items.map(i => i.id))
                    const validFolders = data.filter(f => !itemIds.has(f.id))
                    setFolders(validFolders)
                    if (validFolders.length > 0 && selectedFolderId === '') {
                        setSelectedFolderId(validFolders[0].id)
                    }
                }
                setFetching(false)
            })
            .catch(() => {
                setError('Failed to fetch folders')
                setFetching(false)
            })
    }, [workspaceId, items])

    // Warn when the destination is inside Verified Downloads and some items would be rejected.
    const verifiedDownloadsWarning = useMemo(() => {
        if (!selectedFolderId) return null
        const dest = folders.find(f => f.id === selectedFolderId)
        if (!dest) return null
        // full_path includes the folder chain, e.g. "Verified Downloads / Reports"
        const pathLower = (dest.full_path as string).toLowerCase()
        const isInVerifiedDownloads = VERIFIED_DOWNLOADS_FOLDER_NAMES.some(name => pathLower.startsWith(name))
        if (!isInVerifiedDownloads) return null
        const bad = items.filter(i => i.type === 'file' && !isAllowedInVerifiedDownloads(i.name))
        if (bad.length === 0) return null
        const allowed = VERIFIED_DOWNLOADS_ALLOWED_EXTENSIONS.join(', ')
        return `Only ${allowed} files are allowed in Verified Downloads. These will be rejected: ${bad.map(f => f.name).join(', ')}`
    }, [selectedFolderId, folders, items])

    const doMove = async () => {
        setLoading(true)
        setError('')
        const res = await fetch('/api/vault/object/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                workspace_id: workspaceId,
                object_ids: items.map(i => i.id),
                parent_id: selectedFolderId
            }),
        })
        setLoading(false)
        if (res.ok) {
            const data = await res.json()
            const renames: Array<{ original: string; resolved: string }> = data.renames ?? []
            onSuccess(renames.length ? renames : undefined)
        } else {
            const e = await res.json()
            setError(e.error || 'Failed to move items')
        }
    }

    return createPortal(
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <h3>Move {items.length} item{items.length > 1 ? 's' : ''}</h3>
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    {fetching ? (
                        <p style={{ fontSize: '0.875rem' }}>Loading folders...</p>
                    ) : (
                        <div className="field">
                            <label className="label" htmlFor="folder-select">Destination Folder</label>
                            <select
                                id="folder-select"
                                className="input"
                                value={selectedFolderId}
                                onChange={(e) => setSelectedFolderId(e.target.value)}
                            >
                                {folders.map(f => (
                                    <option key={f.id} value={f.id}>{f.full_path}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {error && <div style={{ color: 'var(--error)', fontSize: '0.875rem', marginTop: '0.5rem' }}>{error}</div>}
                    {!error && verifiedDownloadsWarning && (
                        <div style={{ color: 'var(--warning, #f59e0b)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                            ⚠️ {verifiedDownloadsWarning}
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={doMove} disabled={loading || fetching}>
                        {loading ? 'Moving…' : 'Move'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
