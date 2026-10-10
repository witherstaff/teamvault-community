import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface CreateFolderModalProps {
    workspaceId: string
    parentId: string | null
    onClose: () => void
    onSuccess: () => void
}

export function CreateFolderModal({ workspaceId, parentId, onClose, onSuccess }: CreateFolderModalProps) {
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const create = async () => {
        if (!name.trim()) return
        setLoading(true)
        setError('')
        const res = await fetch('/api/vault/folder/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspace_id: workspaceId, parent_id: parentId, name: name.trim() }),
        })
        setLoading(false)
        if (res.ok) { onSuccess(); onClose() }
        else { const e = await res.json(); setError(e.error || 'Failed to create folder') }
    }

    return (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <h3>Create Folder</h3>
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    <div className="field">
                        <label className="label" htmlFor="folder-name">Folder Name</label>
                        <input id="folder-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Q4 Reports" onKeyDown={(e) => e.key === 'Enter' && create()} autoFocus />
                    </div>
                    {error && <div style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{error}</div>}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={create} disabled={!name.trim() || loading}>{loading ? 'Creating…' : 'Create Folder'}</button>
                </div>
            </div>
        </div>
    )
}
