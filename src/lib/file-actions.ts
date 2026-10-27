'use client'

import React from 'react'
import type { VaultObject } from '@/components/FileList'

export interface FileActionContext {
    item: VaultObject
    workspaceId: string
    isAdmin: boolean
    folderPath?: string
    onClose?: () => void
}

export interface FileActionItem {
    id: string
    label: string
    icon?: React.ReactNode
    order?: number
    placement?: 'menu' | 'viewer' | 'both'
    variant?: 'default' | 'danger'
    isVisible?: (ctx: FileActionContext) => boolean
    onClick: (ctx: FileActionContext) => void | Promise<void>
}

declare global {
    var __TEAMVAULT_FILE_ACTIONS__: FileActionItem[] | undefined
}

function getRegistry(): FileActionItem[] {
    if (typeof window !== 'undefined') {
        if (!window.__TEAMVAULT_FILE_ACTIONS__) {
            window.__TEAMVAULT_FILE_ACTIONS__ = []
        }
        return window.__TEAMVAULT_FILE_ACTIONS__
    }
    return []
}

/**
 * Registers an extensible UI action for files in the vault.
 * Useful for commercial or custom extensions (e.g. Share to Slack).
 */
export function registerFileAction(action: FileActionItem): () => void {
    const registry = getRegistry()
    if (!registry.some(a => a.id === action.id)) {
        registry.push(action)
        registry.sort((a, b) => (a.order ?? 50) - (b.order ?? 50))
    }
    return () => {
        const idx = registry.findIndex(a => a.id === action.id)
        if (idx !== -1) registry.splice(idx, 1)
    }
}

/**
 * Retrieves all registered file actions matching the context and placement.
 */
export function getFileActions(ctx: FileActionContext, placement: 'menu' | 'viewer' = 'menu'): FileActionItem[] {
    const registry = getRegistry()
    return registry.filter(a => {
        const p = a.placement ?? 'both'
        if (p !== 'both' && p !== placement) return false
        if (a.isVisible && !a.isVisible(ctx)) return false
        return true
    })
}
