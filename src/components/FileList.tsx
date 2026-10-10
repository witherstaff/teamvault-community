'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import {
    FolderIcon,
    FileIcon,
    DownloadIcon,
    UploadIcon,
    ChevronIcon,
    MoreIcon,
} from './file-list/file-icons'
import { FileTableRow } from './file-list/FileTableRow'

export {
    FolderIcon,
    FileIcon,
    DownloadIcon,
    UploadIcon,
    ChevronIcon,
    MoreIcon,
}

export type VaultObject = {
    id: string
    type: 'folder' | 'file'
    name: string
    size_bytes: number | null
    mime_type: string | null
    created_at: string
    parent_id: string | null
    workspace_id?: string
    path?: string
}

export function formatBytes(bytes: number | null, decimals = 1): string {
    if (bytes === 0) return '0 B'
    if (!bytes) return '—'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let b = bytes, i = 0
    while (b >= 1024 && i < units.length - 1) { b /= 1024; i++ }
    return `${b.toFixed(i === 0 ? 0 : decimals)} ${units[i]}`
}

export function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

type SortColumn = 'name' | 'size' | 'modified'
type SortDirection = 'asc' | 'desc'

export interface FileListProps {
    items: VaultObject[]
    isAdmin: boolean
    onNavigateToFolder: (folder: VaultObject) => void
    onDownload: (item: VaultObject) => void
    onRename: (item: VaultObject) => void
    onDelete: (item: VaultObject) => void
    onDeleteBatch?: (items: VaultObject[]) => void
    onDownloadBatch?: (items: VaultObject[]) => void
    onMoveBatch?: (items: VaultObject[]) => void
    onSelectionChange?: (items: VaultObject[]) => void
    /** Map of objectId → status for Verified Downloads visual indicators */
    fileStatusMap?: Record<string, 'revoked' | 'exhausted' | 'expired' | 'active'>
    /** Verified Downloads: open link-options modal for a file */
    onLinkOptions?: (item: VaultObject) => void
    /** Verified Downloads: toggle revoke for a file */
    onToggleRevoke?: (item: VaultObject) => void
    /** Verified Downloads: current revoke state keyed by objectId */
    revokeStatus?: Record<string, boolean>
}

export function FileList({
    items,
    isAdmin,
    onNavigateToFolder,
    onDownload,
    onRename,
    onDelete,
    onDeleteBatch,
    onDownloadBatch,
    onMoveBatch,
    onSelectionChange,
    fileStatusMap,
    onLinkOptions,
    onToggleRevoke,
    revokeStatus,
}: FileListProps) {
    const [activeMenu, setActiveMenu] = useState<string | null>(null)
    const menuButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})

    const [sortColumn, setSortColumn] = useState<SortColumn>('name')
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    const sortedItems = useMemo(() => {
        return [...items].sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1

            let valA: string | number
            let valB: string | number

            if (sortColumn === 'name') {
                valA = a.name.toLowerCase()
                valB = b.name.toLowerCase()
            } else if (sortColumn === 'size') {
                valA = a.size_bytes || 0
                valB = b.size_bytes || 0
            } else {
                valA = new Date(a.created_at).getTime()
                valB = new Date(b.created_at).getTime()
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1
            return 0
        })
    }, [items, sortColumn, sortDirection])

    const handleSort = (column: SortColumn) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setSortColumn(column)
            setSortDirection('asc')
        }
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === sortedItems.length && sortedItems.length > 0) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(sortedItems.map(i => i.id)))
        }
    }

    const toggleItem = (id: string) => {
        const next = new Set(selectedIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setSelectedIds(next)
    }

    useEffect(() => {
        setSelectedIds(new Set())
    }, [items])

    useEffect(() => {
        if (onSelectionChange) {
            onSelectionChange(items.filter(i => selectedIds.has(i.id)))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedIds])

    const renderSortLabel = (label: string, column: SortColumn) => (
        <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort(column)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                {label}
                {sortColumn === column && (
                    <span style={{ fontSize: '0.625rem' }}>{sortDirection === 'asc' ? '▲' : '▼'}</span>
                )}
            </div>
        </th>
    )

    if (items.length === 0) {
        return (
            <div className="empty-state">
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗂️</div>
                <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>This view is empty</div>
                <div style={{ fontSize: '0.8125rem' }}>No files found.</div>
            </div>
        )
    }

    return (
        <div className="table-wrap">
            <table>
                <thead>
                    {selectedIds.size > 0 ? (
                        <tr style={{ background: 'var(--accent-subtle)' }}>
                            <th style={{ width: 40, textAlign: 'center' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedIds.size === sortedItems.length}
                                    onChange={toggleSelectAll}
                                    style={{ cursor: 'pointer' }}
                                />
                            </th>
                            <th colSpan={4}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--accent-text)' }}>
                                    <span style={{ fontWeight: 600 }}>{selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} selected</span>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {onLinkOptions && selectedIds.size === 1 && (() => {
                                            const selectedItem = sortedItems.find(i => selectedIds.has(i.id))
                                            if (!selectedItem || selectedItem.type !== 'file') return null
                                            const isRevoked = revokeStatus?.[selectedItem.id] ?? false
                                            return (
                                                <>
                                                    <button
                                                        className="btn btn-sm btn-secondary"
                                                        onClick={() => onLinkOptions(selectedItem)}
                                                        title="Link Options"
                                                    >
                                                        🔗 Link Options
                                                    </button>
                                                    {onToggleRevoke && (
                                                        <button
                                                            className={`btn btn-sm ${isRevoked ? 'btn-secondary' : 'btn-destructive'}`}
                                                            onClick={() => onToggleRevoke(selectedItem)}
                                                            title={isRevoked ? 'Enable access' : 'Revoke access'}
                                                        >
                                                            {isRevoked ? '✅ Enable' : '🚫 Revoke'}
                                                        </button>
                                                    )}
                                                </>
                                            )
                                        })()}
                                        {isAdmin && onDeleteBatch && selectedIds.size > 1 && (
                                            <button
                                                className="btn btn-sm"
                                                style={{ background: '#EF4444', color: 'white', border: 'none' }}
                                                onClick={() => {
                                                    const selectedItems = items.filter(i => selectedIds.has(i.id))
                                                    onDeleteBatch(selectedItems)
                                                }}
                                            >
                                                Delete All
                                            </button>
                                        )}
                                        {isAdmin && onMoveBatch && (
                                            <button
                                                className="btn btn-sm"
                                                style={{ background: 'var(--accent)', color: 'white', border: 'none' }}
                                                onClick={() => {
                                                    const selectedItems = items.filter(i => selectedIds.has(i.id))
                                                    onMoveBatch(selectedItems)
                                                }}
                                            >
                                                Move
                                            </button>
                                        )}
                                        {onDownloadBatch && (
                                            <button
                                                className="btn btn-sm"
                                                style={{ background: 'var(--accent)', color: 'white', border: 'none' }}
                                                onClick={() => {
                                                    const selectedItems = items.filter(i => selectedIds.has(i.id))
                                                    onDownloadBatch(selectedItems)
                                                }}
                                            >
                                                <DownloadIcon /> Download ZIP
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </th>
                        </tr>
                    ) : (
                        <tr>
                            <th style={{ width: 40, textAlign: 'center' }}>
                                <input
                                    type="checkbox"
                                    checked={false}
                                    onChange={toggleSelectAll}
                                    style={{ cursor: 'pointer' }}
                                    title="Select all"
                                />
                            </th>
                            {renderSortLabel('Name', 'name')}
                            {renderSortLabel('Size', 'size')}
                            {renderSortLabel('Modified', 'modified')}
                            <th style={{ width: isAdmin ? 90 : 60 }}></th>
                        </tr>
                    )}
                </thead>
                <tbody>
                    {sortedItems.map((item) => (
                        <FileTableRow
                            key={item.id}
                            item={item}
                            isSelected={selectedIds.has(item.id)}
                            isAdmin={isAdmin}
                            fileStatusMap={fileStatusMap}
                            activeMenu={activeMenu}
                            menuButtonRefs={menuButtonRefs}
                            onToggleItem={toggleItem}
                            onNavigateToFolder={onNavigateToFolder}
                            onDownload={onDownload}
                            onRename={onRename}
                            onDelete={onDelete}
                            onSetActiveMenu={setActiveMenu}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    )
}
export default FileList
