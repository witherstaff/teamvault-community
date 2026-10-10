import { z } from 'zod'

// ── Vault ────────────────────────────────────────────────────────

export const listVaultSchema = z.object({
    parent_id: z.string().uuid().nullable().optional(),
    workspace_id: z.string().uuid(),
})

export const searchVaultSchema = z.object({
    workspace_id: z.string().uuid(),
    query: z.string().min(1).max(255),
})

export const batchDownloadSchema = z.object({
    workspace_id: z.string().uuid(),
    object_ids: z.array(z.string().uuid()).min(1),
})

export const createFolderSchema = z.object({
    workspace_id: z.string().uuid(),
    parent_id: z.string().uuid().nullable(),
    name: z.string().min(1).max(255),
})

export const createUploadSchema = z.object({
    workspace_id: z.string().uuid(),
    parent_id: z.string().uuid(),
    filename: z.string().min(1).max(512),
    mime_type: z.string().min(1),
    size_bytes: z.number().int().positive().max(1_073_741_824), // 1 GB
    replaces_object_id: z.string().uuid().optional(),  // if set, overwrite this existing file
})

export const finalizeUploadSchema = z.object({
    workspace_id: z.string().uuid(),
    object_id: z.string().uuid(),
    checksum_sha256: z.string().optional(),
    replaces_object_id: z.string().uuid().optional(),
})

export const downloadLinkSchema = z.object({
    workspace_id: z.string().uuid(),
    object_id: z.string().uuid(),
    attachment: z.boolean().optional().default(true),
})

export const getObjectSchema = z.object({
    workspace_id: z.string().uuid(),
    object_id: z.string().uuid(),
})

export const deleteObjectSchema = z.object({
    workspace_id: z.string().uuid(),
    object_id: z.string().uuid(),
    recursive: z.boolean().optional().default(false),
})

export const renameObjectSchema = z.object({
    workspace_id: z.string().uuid(),
    object_id: z.string().uuid(),
    name: z.string().min(1).max(255),
})

export const moveBatchSchema = z.object({
    workspace_id: z.string().uuid(),
    object_ids: z.array(z.string().uuid()).min(1),
    parent_id: z.string().uuid().nullable(),
})

// ── Admin — Groups ───────────────────────────────────────────────

export const createGroupSchema = z.object({
    workspace_id: z.string().uuid(),
    name: z.string().min(1).max(100),
})

export const deleteGroupSchema = z.object({
    workspace_id: z.string().uuid(),
    group_id: z.string().uuid(),
})

export const groupMemberSchema = z.object({
    workspace_id: z.string().uuid(),
    group_id: z.string().uuid(),
    user_id: z.string().uuid(),
})

// ── Admin — Folder Access ────────────────────────────────────────

export const setFolderAccessSchema = z.object({
    workspace_id: z.string().uuid(),
    folder_id: z.string().uuid(),
    allow_users: z.array(z.string().uuid()).default([]),
    allow_groups: z.array(z.string().uuid()).default([]),
})

// ── Admin — Users ────────────────────────────────────────────────

export const inviteUserSchema = z.object({
    workspace_id: z.string().uuid(),
    email: z.string().email(),
    role: z.enum(['admin', 'user']),
    can_upload: z.boolean().default(false),
})

export const setUserStatusSchema = z.object({
    workspace_id: z.string().uuid(),
    user_id: z.string().uuid(),
    status: z.enum(['active', 'disabled']),
})

export const setUploadSchema = z.object({
    workspace_id: z.string().uuid(),
    user_id: z.string().uuid(),
    can_upload: z.boolean(),
})

export const setRoleSchema = z.object({
    workspace_id: z.string().uuid(),
    user_id: z.string().uuid(),
    role: z.enum(['admin', 'user']),
})

// ── Admin — Audit ────────────────────────────────────────────────

export const auditQuerySchema = z.object({
    workspace_id: z.string().uuid(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    action: z.string().optional(),
    user_id: z.string().uuid().optional(),
    page: z.coerce.number().int().min(0).default(0),
    limit: z.coerce.number().int().min(1).max(100).default(50),
})

// ── Recycle Bin ──────────────────────────────────────────────────

export const recycleBinQuerySchema = z.object({
    workspace_id: z.string().uuid(),
    page: z.coerce.number().int().min(0).default(0),
    limit: z.coerce.number().int().min(1).max(200).default(50),
})

export const recycleBinRestoreSchema = z.object({
    workspace_id: z.string().uuid(),
    object_id: z.string().uuid(),
})

export const recycleBinPurgeSchema = z.object({
    workspace_id: z.string().uuid(),
    object_id: z.string().uuid(),
})

// ── File History ─────────────────────────────────────────────────

export const fileHistoryQuerySchema = z.object({
    workspace_id: z.string().uuid(),
    object_id: z.string().uuid(),
})

export const fileHistoryRestoreSchema = z.object({
    workspace_id: z.string().uuid(),
    object_id: z.string().uuid(),
    version_id: z.string().uuid(),
})

export const fileHistoryPurgeSchema = z.object({
    workspace_id: z.string().uuid(),
    object_id: z.string().uuid(),
    version_id: z.string().uuid(),
})
