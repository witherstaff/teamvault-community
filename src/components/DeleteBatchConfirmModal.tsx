import { useState } from 'react'
import { createPortal } from 'react-dom'
import { VaultObject } from './FileList'

interface DeleteBatchConfirmModalProps {
    items: VaultObject[]
    workspaceId: string
    onClose: () => void
    onSuccess: () => void
}

export function DeleteBatchConfirmModal({ items, workspaceId, onClose, onSuccess }: DeleteBatchConfirmModalProps) {
    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = useState({ current: 0, total: items.length })

    const doDelete = async () => {
        setLoading(true)
        let successCount = 0

        for (let i = 0; i < items.length; i++) {
            setProgress({ current: i + 1, total: items.length })
            const item = items[i]
            const res = await fetch('/api/vault/object/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspace_id: workspaceId, object_id: item.id, recursive: item.type === 'folder' }),
            })
            if (res.ok) {
                successCount++
            }
        }

        setLoading(false)
        if (successCount > 0) {
            onSuccess()
        }
        onClose()
    }

    return createPortal(
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && !loading && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <h3>Delete {items.length} items</h3>
                    <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={loading}>✕</button>
                </div>
                <div className="modal-body">
                    <p style={{ marginBottom: '0.5rem' }}>Are you sure you want to delete <b>{items.length}</b> selected items?</p>
                    <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239,68,68,0.3)', marginTop: '0.5rem' }}>
                        <p style={{ fontSize: '0.875rem', color: '#EF4444', fontWeight: 600, marginBottom: '0.25rem' }}>
                            ⚠️ Warning
                        </p>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--error)' }}>
                            All selected files and folders will be permanently deleted.
                        </p>
                    </div>
                </div>
                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
                    {loading && <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginRight: 'auto' }}>Deleting {progress.current} of {progress.total}…</span>}
                    <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
                    <button className="btn" onClick={doDelete} disabled={loading} style={{ background: '#EF4444', color: 'white' }}>
                        {loading ? 'Deleting…' : 'Delete All'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
