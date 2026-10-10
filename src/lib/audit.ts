import { getAdminClient } from '@/db'
import type { Json } from '@/db/types'

export type AuditAction =
    | 'AUTH_LOGIN'
    | 'DOWNLOAD_LINK_ISSUED'
    | 'WORKSPACE_RENAMED'
    | 'FILE_UPLOADED'
    | 'FILE_DELETED'
    | 'FOLDER_CREATED'
    | 'FOLDER_DELETED'
    | 'USER_INVITED'
    | 'USER_DISABLED'
    | 'USER_REMOVED'
    | 'ROLE_CHANGED'
    | 'UPLOAD_TOGGLED'
    | 'GROUP_CREATED'
    | 'GROUP_DELETED'
    | 'GROUP_MEMBER_ADDED'
    | 'GROUP_MEMBER_REMOVED'
    | 'FOLDER_ACCESS_CHANGED'
    | 'OBJECT_RENAMED'
    | 'OBJECT_MOVED'
    | 'OBJECT_MOVED_BATCH'
    | 'FILE_DOWNLOADED'
    | 'FILE_VIEWED'
    | 'FILE_LINK_COPIED'
    | 'AUTH_LOGOUT'
    | 'DESKTOP_LOGIN'
    | 'DEVICE_REGISTERED'
    | 'SYNC_STARTED'
    | 'SYNC_COMPLETED'
    | 'SYNC_FAILED'
    | 'FILE_RESTORED'
    | 'FILE_PURGED'
    | 'FOLDER_RESTORED'
    | 'FOLDER_PURGED'
    | 'FILE_VERSION_RESTORED'
    | 'FILE_VERSION_PURGED'
    | 'GEO_BLOCK'
    | 'GEO_BYPASS_SENT'
    | 'GEO_BYPASS_SUCCESS'
    | 'GEO_BYPASS_FAIL'
    // ── Autonomous Agent Actions ──────────────────────────────────
    | 'AGENT_SIGNUP_STARTED'
    | 'AGENT_POLICY_ACCEPTED'
    | 'AGENT_SIGNUP_COMPLETED'
    | 'AGENT_SIGNUP_FAILED'
    | 'AGENT_PAYMENT_CONFIRMED'
    | 'AGENT_SUBSCRIPTION_RENEWED'
    | 'AGENT_SUBSCRIPTION_EXPIRED'
    | 'AGENT_GRACE_PERIOD_ENTERED'
    | 'AGENT_SUBSCRIPTION_SUSPENDED'
    | 'AGENT_KEY_CREATED'
    | 'AGENT_KEY_ROTATED'
    | 'AGENT_KEY_REVOKED'
    | 'AGENT_KEY_AUTHENTICATED'
    | 'AGENT_VIEWER_KEY_CREATED'
    | 'AGENT_VIEWER_KEY_REVOKED'
    | 'AGENT_VIEWER_KEY_ACCESSED'
    | 'AGENT_MEMBER_INVITED'
    | 'AGENT_MEMBER_REMOVED'
    | 'AGENT_ROLE_CHANGED'
    | 'AUTH0_IDENTITY_LINKED'
    | 'AGENT_FILE_UPLOADED'
    | 'AGENT_FILE_DOWNLOADED'
    | 'AGENT_FILE_VIEWED'
    | 'AGENT_FILE_DELETED'
    | 'AGENT_FILE_PURGED'
    | 'AGENT_FILE_RESTORED'
    | 'AGENT_FILE_RENAMED'
    | 'AGENT_FILE_MOVED'
    | 'AGENT_FOLDER_CREATED'
    | 'AGENT_FOLDER_DELETED'
    | 'AGENT_OBJECT_LISTED'
    | 'AGENT_RATE_LIMIT_EXCEEDED'
    | 'AGENT_AUTH_FAILED'
    | 'AGENT_SCOPE_DENIED'
    | 'AGENT_POLICY_VIOLATION'
    | 'AGENT_TAKEDOWN_EXECUTED'

export type AuditResult = 'allowed' | 'denied' | 'error'

export interface AuditParams {
    workspaceId: string
    actorUserId?: string | null
    actorName?: string | null
    actorEmail?: string | null
    actorType?: 'human_user' | 'machine_agent' | 'viewer_key'
    agentKeyId?: string | null
    agentName?: string | null
    keyPrefix?: string | null
    action: AuditAction
    objectId?: string | null
    targetUserId?: string | null
    targetGroupId?: string | null
    result: AuditResult
    metadata?: Record<string, unknown>
    request?: Request
}


/**
 * Log an audit event — fire and forget (does not block the request).
 */
export function logAuditEvent(params: AuditParams): void {
    const {
        workspaceId,
        actorUserId = null,
        actorName = null,
        actorEmail = null,
        actorType = 'human_user',
        agentKeyId = null,
        agentName = null,
        keyPrefix = null,
        action,
        objectId = null,
        targetUserId = null,
        targetGroupId = null,
        result,
        metadata = {},
        request,
    } = params

    // Hash user-agent and IP to reduce PII
    const enrichedMeta: Record<string, unknown> = { ...metadata }
    enrichedMeta.actor_type = actorType
    if (agentKeyId) enrichedMeta.agent_key_id = agentKeyId
    if (agentName) enrichedMeta.agent_name = agentName
    if (keyPrefix) enrichedMeta.key_prefix = keyPrefix
    if (actorName) enrichedMeta.actor_name = actorName
    if (actorEmail) enrichedMeta.actor_email = actorEmail
    if (request) {
        const ua = request.headers.get('user-agent') ?? ''
        const ip = request.headers.get('x-forwarded-for') ?? ''
        enrichedMeta.ua_hash = simpleHash(ua)
        enrichedMeta.ip_hash = simpleHash(ip)
    }

    // Non-blocking insert
    const db = getAdminClient()
    db.from('audit_events')
        .insert({
            workspace_id: workspaceId,
            actor_user_id: actorUserId,
            action,
            object_id: objectId,
            target_user_id: targetUserId,
            target_group_id: targetGroupId,
            result,
            metadata: enrichedMeta as Json,
        })
        .then(({ error }) => {
            if (error) console.error('[audit] Failed to log event:', action, error.message)
        })
}

/** Simple FNV-1a hash for PII reduction */
function simpleHash(str: string): string {
    let hash = 2166136261
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i)
        hash = (hash * 16777619) >>> 0
    }
    return hash.toString(16)
}
