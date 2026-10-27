import type { VaultEventHandler } from './events'

/**
 * Extension hook for server-side vault event listeners.
 *
 * Community Edition registers nothing. The Commercial overlay replaces this
 * file (see teamvault-commercial/scripts/prepare-vercel.mjs) to attach its
 * handlers. It is invoked once, lazily, the first time an event is emitted.
 */
export function registerExtensionEventHandlers(_register: (handler: VaultEventHandler) => void): void {
    // no-op in Community Edition
}
