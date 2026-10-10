import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { VaultObject } from './FileList'

interface DeleteConfirmModalProps {
    item: VaultObject
    workspaceId: string
    onClose: () => void
    onSuccess: () => void
}

export function DeleteConfirmModal({ item, workspaceId, onClose, onSuccess }: DeleteConfirmModalProps) {
    const [loading, setLoading] = useState(false)
    const [childCount, setChildCount] = useState<number | null>(null)
    const [checking, setChecking] = useState(item.type === 'folder')

    // Fetch contents count for folders
    useEffect(() => {
        if (item.type !== 'folder') return
        fetch(`/api/vault/list?workspace_id=${workspaceId}&parent_id=${item.id}`, { credentials: 'same-origin' })
            .then(res => res.ok ? res.json() : [])
            .then((items: unknown[]) => { setChildCount((items as any[]).length); setChecking(false) })
            .catch(() => setChecking(false))
    }, [item, workspaceId])

    const doDelete = async () => {
        setLoading(true)
        const res = await fetch('/api/vault/object/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspace_id: workspaceId, object_id: item.id, recursive: item.type === 'folder' }),
        })
        setLoading(false)
        if (res.ok) { onSuccess(); onClose() }
    }

    const isFolder = item.type === 'folder'
    const hasChildren = childCount !== null && childCount > 0

    return createPortal(
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <h3>Delete {isFolder ? 'Folder' : 'File'}</h3>
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    <p style={{ marginBottom: '0.5rem' }}>Are you sure you want to delete <b>{item.name}</b>?</p>
                    {isFolder && checking && <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Checking folder contents…</p>}
                    {isFolder && hasChildren && (
                        <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239,68,68,0.3)', marginTop: '0.5rem' }}>
                            <p style={{ fontSize: '0.875rem', color: '#EF4444', fontWeight: 600, marginBottom: '0.25rem' }}>
                                ⚠️ This folder contains {childCount} item{childCount > 1 ? 's' : ''}
                            </p>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--error)' }}>
                                All files and subfolders inside will be permanently deleted.
                            </p>
                        </div>
                    )}
                    {isFolder && !checking && !hasChildren && (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>This folder is empty.</p>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn" onClick={doDelete} disabled={loading || checking} style={{ background: '#EF4444', color: 'white' }}>
                        {loading ? 'Deleting…' : checking ? 'Checking…' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
