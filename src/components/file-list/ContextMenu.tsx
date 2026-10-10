'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ContextMenuProps {
    onClose: () => void
    onRename: () => void
    onDelete: () => void
    anchorRef: React.RefObject<HTMLButtonElement | null>
}

export function ContextMenu({ onRename, onDelete, onClose, anchorRef }: ContextMenuProps) {
    const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

    useEffect(() => {
        if (anchorRef.current) {
            const rect = anchorRef.current.getBoundingClientRect()
            const menuWidth = 150
            let left = rect.right - menuWidth
            let top = rect.bottom + 4
            if (top + 100 > window.innerHeight) top = rect.top - 100
            if (left < 8) left = 8
            setPos({ top, left })
        }
    }, [anchorRef])

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
                    minWidth: 150,
                    zIndex: 99999,
                    overflow: 'hidden',
                }}
            >
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
            </div>
        </>,
        document.body
    )
}
