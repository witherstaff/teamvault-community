import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { VaultObject } from './FileList'

interface RenameModalProps {
    item: VaultObject
    workspaceId: string
    onClose: () => void
    onSuccess: (newName: string) => void
}

export function RenameModal({ item, workspaceId, onClose, onSuccess }: RenameModalProps) {
    const [name, setName] = useState(item.name)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const rename = async () => {
        if (!name.trim()) return
        setLoading(true)
        setError('')
        const res = await fetch('/api/vault/object/rename', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspace_id: workspaceId, object_id: item.id, name: name.trim() }),
        })
        setLoading(false)
        if (res.ok) { onSuccess(name.trim()); onClose() }
        else { const e = await res.json(); setError(e.error || 'Failed to rename') }
    }

    return createPortal(
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <h3>Rename {item.type === 'folder' ? 'Folder' : 'File'}</h3>
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    <div className="field">
                        <label className="label" htmlFor="rename-input">Name</label>
                        <input id="rename-input" className="input" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && rename()} autoFocus />
                    </div>
                    {error && <div style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{error}</div>}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={rename} disabled={!name.trim() || loading}>{loading ? 'Renaming…' : 'Rename'}</button>
                </div>
            </div>
        </div>,
        document.body
    )
}
