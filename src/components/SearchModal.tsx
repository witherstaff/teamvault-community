import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FileList, VaultObject } from './FileList'

interface SearchModalProps {
    workspaceId: string
    isAdmin: boolean
    onClose: () => void
    onNavigateToFolder: (folder: VaultObject) => void
    onViewItem: (item: VaultObject) => void
    onDownload: (item: VaultObject) => void
    onRename: (item: VaultObject) => void
    onDelete: (item: VaultObject) => void
}

export function SearchModal({ workspaceId, isAdmin, onClose, onNavigateToFolder, onViewItem, onDownload, onRename, onDelete }: SearchModalProps) {
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState<VaultObject[]>([])
    const [hasSearched, setHasSearched] = useState(false)

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!query.trim()) {
                setResults([])
                setHasSearched(false)
                return
            }
            setLoading(true)
            setHasSearched(true)
            try {
                const res = await fetch(`/api/vault/search?workspace_id=${workspaceId}&query=${encodeURIComponent(query)}`)
                if (res.ok) setResults(await res.json())
                else setResults([])
            } catch {
                setResults([])
            } finally {
                setLoading(false)
            }
        }, 400) // debounce 400ms
        return () => clearTimeout(timer)
    }, [query, workspaceId])

    return createPortal(
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ alignItems: 'flex-start', paddingTop: '10vh' }}>
            <div className="modal" style={{ width: '100%', maxWidth: '800px' }}>
                <div className="modal-header" style={{ paddingBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '0.75rem' }}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="var(--text-secondary)">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                        <input
                            className="input"
                            style={{ flex: 1, border: 'none', background: 'transparent', padding: 0, fontSize: '1.25rem', boxShadow: 'none' }}
                            placeholder="Search files and folders..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                        />
                        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
                    </div>
                </div>
                <div className="modal-body" style={{ padding: '0', maxHeight: '60vh', overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Searching…</div>
                    ) : hasSearched && results.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No results found for "{query}"</div>
                    ) : results.length > 0 ? (
                        <FileList
                            items={results}
                            isAdmin={isAdmin}
                            onNavigateToFolder={(obj) => obj.type === 'folder' ? onNavigateToFolder(obj) : onViewItem(obj)}
                            onDownload={onDownload}
                            onRename={onRename}
                            onDelete={onDelete}
                        />
                    ) : (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Type to start searching your workspace.</div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}
