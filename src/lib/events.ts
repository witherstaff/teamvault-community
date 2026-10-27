import { after } from 'next/server'
import { registerExtensionEventHandlers } from './event-handlers'

export type VaultEventType =
    | 'file:created'
    | 'file:version_added'
    | 'file:deleted'
    | 'file:link_copied'
    | 'folder:access_updated'
    | 'folder:deleted'

export interface BaseVaultEvent {
    type: VaultEventType
    workspaceId: string
    actorUserId?: string
    actorName?: string | null
    actorEmail?: string | null
    timestamp: string
}

export interface FileCreatedEvent extends BaseVaultEvent {
    type: 'file:created'
    objectId: string
    name: string
    sizeBytes: number
    mimeType?: string | null
    folderPath?: string | null
    parentId?: string | null
}

export interface FileVersionAddedEvent extends BaseVaultEvent {
    type: 'file:version_added'
    objectId: string
    name: string
    sizeBytes: number
    mimeType?: string | null
    versionNumber: number
    folderPath?: string | null
    parentId?: string | null
}

export interface FileDeletedEvent extends BaseVaultEvent {
    type: 'file:deleted'
    objectId: string
    name: string
    parentId?: string | null
}

export interface FileLinkCopiedEvent extends BaseVaultEvent {
    type: 'file:link_copied'
    objectId: string
    name: string
    folderPath?: string | null
}

export interface FolderDeletedEvent extends BaseVaultEvent {
    type: 'folder:deleted'
    folderId: string
    name: string
    recursive?: boolean
}

export interface FolderAccessUpdatedEvent extends BaseVaultEvent {
    type: 'folder:access_updated'
    folderId: string
    folderName?: string
    allowUsers: string[]
    allowGroups: string[]
}

export type VaultEvent =
    | FileCreatedEvent
    | FileVersionAddedEvent
    | FileDeletedEvent
    | FileLinkCopiedEvent
    | FolderDeletedEvent
    | FolderAccessUpdatedEvent

export type VaultEventHandler = (event: VaultEvent) => Promise<void> | void

declare global {
    var __TEAMVAULT_EVENT_HANDLERS__: Set<VaultEventHandler> | undefined
    var __TEAMVAULT_EXTENSION_HANDLERS_LOADED__: boolean | undefined
}

function getHandlers(): Set<VaultEventHandler> {
    if (!globalThis.__TEAMVAULT_EVENT_HANDLERS__) {
        globalThis.__TEAMVAULT_EVENT_HANDLERS__ = new Set<VaultEventHandler>()
    }
    return globalThis.__TEAMVAULT_EVENT_HANDLERS__
}

/**
 * Register a listener for vault events.
 * Returns an unregister function.
 */
export function registerVaultEventHandler(handler: VaultEventHandler): () => void {
    const handlers = getHandlers()
    handlers.add(handler)
    return () => {
        handlers.delete(handler)
    }
}

/**
 * Emits a vault lifecycle event asynchronously to all registered handlers.
 * Never throws to the caller — failures in external handlers are caught and logged.
 *
 * Handlers run inside Next.js `after()` when called from a request, so they are
 * allowed to finish on serverless platforms after the response has been sent.
 */
export async function emitVaultEvent(event: VaultEvent): Promise<void> {
    ensureExtensionHandlers()

    const handlers = getHandlers()
    if (handlers.size === 0) return

    const run = async () => {
        const promises = Array.from(handlers).map(async (handler) => {
            try {
                await handler(event)
            } catch (err) {
                console.error(`[events] Handler failed for event "${event.type}":`, err)
            }
        })
        await Promise.allSettled(promises)
    }

    try {
        after(run)
    } catch {
        // Outside a request scope (scripts, tests) — run inline
        await run()
    }
}

function ensureExtensionHandlers(): void {
    if (globalThis.__TEAMVAULT_EXTENSION_HANDLERS_LOADED__) return
    globalThis.__TEAMVAULT_EXTENSION_HANDLERS_LOADED__ = true
    try {
        registerExtensionEventHandlers(registerVaultEventHandler)
    } catch (err) {
        console.error('[events] Failed to register extension handlers:', err)
    }
}
