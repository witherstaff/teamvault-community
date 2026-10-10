import { useState } from 'react'
import { createPortal } from 'react-dom'

export type PurgeTarget = {
    id: string
    name: string
    type: 'file' | 'folder'
    expires_at: string | null
}

interface Props {
    item: PurgeTarget
    workspaceId: string
    onClose: () => void
    onSuccess: (id: string) => void
}

export function PurgeConfirmModal({ item, workspaceId, onClose, onSuccess }: Props) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const doPurge = async () => {
        setLoading(true)
        setError('')
        try {
            const res = await fetch('/api/admin/recycle-bin/purge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspace_id: workspaceId, object_id: item.id }),
                credentials: 'same-origin',
            })
            if (res.ok) {
                onSuccess(item.id)
                onClose()
            } else {
                const data = await res.json()
                setError(data.error || 'Failed to delete')
            }
        } catch {
            setError('Network error')
        } finally {
            setLoading(false)
        }
    }

    return createPortal(
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: '#EF4444' }}>⚠</span>
                        Permanently Delete {item.type === 'folder' ? 'Folder' : 'File'}
                    </h3>
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <p>
                        Permanently delete <b>{item.name}</b>? This cannot be undone — the{' '}
                        {item.type === 'folder' ? 'folder and all its contents' : 'file'} will be gone forever.
                    </p>
                    {item.type === 'folder' && (
                        <div style={{ padding: '0.625rem 0.75rem', background: 'rgba(239,68,68,0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239,68,68,0.25)', fontSize: '0.8125rem', color: '#EF4444' }}>
                            All files and subfolders inside will also be permanently deleted.
                        </div>
                    )}
                    {item.expires_at && (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            This item would have been automatically deleted on{' '}
                            {new Date(item.expires_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}.
                        </p>
                    )}
                    {error && (
                        <p style={{ fontSize: '0.8125rem', color: '#EF4444' }}>{error}</p>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
                    <button
                        className="btn"
                        onClick={doPurge}
                        disabled={loading}
                        style={{ background: '#EF4444', color: 'white' }}
                    >
                        {loading ? 'Deleting…' : 'Delete permanently'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
