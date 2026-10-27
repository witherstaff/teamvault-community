'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { VaultObject } from '../FileList'
import { getFileActions } from '@/lib/file-actions'

interface ContextMenuProps {
    onClose: () => void
    onRename?: () => void
    onDelete?: () => void
    anchorRef: React.RefObject<HTMLButtonElement | null>
    item?: VaultObject
    workspaceId?: string
    isAdmin?: boolean
    folderPath?: string
}

export function ContextMenu({ onRename, onDelete, onClose, anchorRef, item, workspaceId, isAdmin = false, folderPath }: ContextMenuProps) {
    const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

    const customActions = item ? getFileActions({
        item,
        workspaceId: workspaceId ?? item.workspace_id ?? '',
        isAdmin,
        folderPath,
        onClose,
    }, 'menu') : []

    useEffect(() => {
        if (anchorRef.current) {
            const rect = anchorRef.current.getBoundingClientRect()
            const menuWidth = 160
            let left = rect.right - menuWidth
            let top = rect.bottom + 4
            const estimatedHeight = 40 * ((isAdmin ? 2 : 0) + customActions.length)
            if (top + estimatedHeight > window.innerHeight) top = Math.max(8, rect.top - estimatedHeight)
            if (left < 8) left = 8
            setPos({ top, left })
        }
    }, [anchorRef, customActions.length, isAdmin])

    return createPortal(
        <>
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 99998,
                    background: 'transparent',
                }}
            />
            <div
                style={{
                    position: 'fixed',
                    top: pos.top,
                    left: pos.left,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                    minWidth: 160,
                    zIndex: 99999,
                    overflow: 'hidden',
                }}
            >
                {isAdmin && onRename && (
                    <button
                        onClick={onRename}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            width: '100%',
                            padding: '0.625rem 1rem',
                            border: 'none',
                            background: 'none',
                            color: 'var(--text-primary)',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontFamily: 'inherit',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--row-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                        ✏️ Rename
                    </button>
                )}

                {customActions.map((action) => (
                    <button
                        key={action.id}
                        onClick={() => {
                            if (item) {
                                void action.onClick({
                                    item,
                                    workspaceId: workspaceId ?? item.workspace_id ?? '',
                                    isAdmin,
                                    folderPath,
                                    onClose,
                                })
                            }
                            onClose()
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            width: '100%',
                            padding: '0.625rem 1rem',
                            border: 'none',
                            background: 'none',
                            color: action.variant === 'danger' ? '#EF4444' : 'var(--text-primary)',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontFamily: 'inherit',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--row-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                        {action.icon}
                        <span>{action.label}</span>
                    </button>
                ))}

                {isAdmin && onDelete && (
                    <>
                        <div style={{ height: 1, background: 'var(--border)' }} />
                        <button
                            onClick={onDelete}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                width: '100%',
                                padding: '0.625rem 1rem',
                                border: 'none',
                                background: 'none',
                                color: '#EF4444',
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontFamily: 'inherit',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--row-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                            🗑️ Delete
                        </button>
                    </>
                )}
            </div>
        </>,
        document.body
    )
}
