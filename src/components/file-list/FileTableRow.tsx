'use client'

import React from 'react'
import { VaultObject, formatBytes, formatDate } from '../FileList'
import { FolderIcon, FileIcon, DownloadIcon, MoreIcon } from './file-icons'
import { ContextMenu } from './ContextMenu'

interface FileTableRowProps {
    item: VaultObject
    isSelected: boolean
    isAdmin: boolean
    fileStatusMap?: Record<string, 'revoked' | 'exhausted' | 'expired' | 'active'>
    activeMenu: string | null
    menuButtonRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>
    onToggleItem: (id: string) => void
    onNavigateToFolder: (item: VaultObject) => void
    onDownload: (item: VaultObject) => void
    onRename: (item: VaultObject) => void
    onDelete: (item: VaultObject) => void
    onSetActiveMenu: (id: string | null) => void
}

export function FileTableRow({
    item,
    isSelected,
    isAdmin,
    fileStatusMap,
    activeMenu,
    menuButtonRefs,
    onToggleItem,
    onNavigateToFolder,
    onDownload,
    onRename,
    onDelete,
    onSetActiveMenu,
}: FileTableRowProps) {
    const status = fileStatusMap?.[item.id]
    const isBlocked = status === 'revoked' || status === 'exhausted' || status === 'expired'
    const badgeLabel = status === 'revoked' ? 'Revoked' : status === 'exhausted' ? 'Limit reached' : status === 'expired' ? 'Expired' : null
    const badgeColor = status === 'revoked' ? '#EF4444' : '#F59E0B'

    return (
        <tr style={{ background: isSelected ? 'var(--row-selected)' : undefined }}>
            <td style={{ textAlign: 'center' }} onClick={(e) => { e.stopPropagation(); onToggleItem(item.id) }}>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => { }}
                    style={{ cursor: 'pointer' }}
                />
            </td>
            <td>
                <div
                    className="file-name-cell"
                    onClick={() => onNavigateToFolder(item)}
                >
                    <div className={`file-icon ${item.type}`}>
                        {item.type === 'folder' ? <FolderIcon /> : <FileIcon />}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span
                            className="file-name"
                            title={item.path}
                            style={isBlocked ? {
                                textDecoration: 'line-through',
                                color: 'var(--text-secondary)',
                                opacity: 0.6,
                            } : undefined}
                        >
                            {item.name}
                        </span>
                        {badgeLabel && (
                            <span style={{
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                color: badgeColor,
                                letterSpacing: '0.03em',
                                marginTop: '0.125rem',
                                textTransform: 'uppercase',
                            }}>
                                {badgeLabel}
                            </span>
                        )}
                        {item.path && <span className="file-path-hover text-muted" style={{ fontSize: '0.75rem', marginTop: '0.125rem' }}>{item.path}</span>}
                    </div>
                </div>
            </td>
            <td className="text-secondary text-sm" onClick={() => onToggleItem(item.id)}>{formatBytes(item.size_bytes)}</td>
            <td className="text-secondary text-sm" onClick={() => onToggleItem(item.id)}>{formatDate(item.created_at)}</td>
            <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}>
                    {item.type === 'file' && (
                        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); onDownload(item); }} title="Download">
                            <DownloadIcon />
                        </button>
                    )}
                    {isAdmin && (
                        <div style={{ position: 'relative' }}>
                            <button
                                ref={el => { menuButtonRefs.current[item.id] = el }}
                                className="btn btn-ghost btn-sm"
                                onClick={(e) => { e.stopPropagation(); onSetActiveMenu(activeMenu === item.id ? null : item.id); }}
                                title="More actions"
                            >
                                <MoreIcon />
                            </button>
                            {activeMenu === item.id && (
                                <ContextMenu
                                    anchorRef={{ current: menuButtonRefs.current[item.id] ?? null }}
                                    onClose={() => onSetActiveMenu(null)}
                                    onRename={() => { onSetActiveMenu(null); onRename(item) }}
                                    onDelete={() => { onSetActiveMenu(null); onDelete(item) }}
                                />
                            )}
                        </div>
                    )}
                </div>
            </td>
        </tr>
    )
}
