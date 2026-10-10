// TypeScript types matching the Postgres schema
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface CommunityTables {
    workspaces: {
                Row: {
                    id: string
                    name: string
                    slug: string
                    plan_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    slug: string
                    plan_id?: string | null
                    created_at?: string
                }
                Update: Partial<Database['public']['Tables']['workspaces']['Insert']>
            }
            users: {
                Row: {
                    id: string
                    email: string
                    auth_provider: string | null
                    auth_subject: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    email: string
                    auth_provider?: string | null
                    auth_subject?: string | null
                    created_at?: string
                }
                Update: Partial<Database['public']['Tables']['users']['Insert']>
            }
            memberships: {
                Row: {
                    id: string
                    workspace_id: string
                    user_id: string
                    role: 'admin' | 'user'
                    can_upload: boolean
                    status: 'invited' | 'active' | 'disabled'
                    created_at: string
                }
                Insert: {
                    id?: string
                    workspace_id: string
                    user_id: string
                    role: 'admin' | 'user'
                    can_upload?: boolean
                    status?: 'invited' | 'active' | 'disabled'
                    created_at?: string
                }
                Update: Partial<Database['public']['Tables']['memberships']['Insert']>
            }
            groups: {
                Row: {
                    id: string
                    workspace_id: string
                    name: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    workspace_id: string
                    name: string
                    created_at?: string
                }
                Update: Partial<Database['public']['Tables']['groups']['Insert']>
            }
            group_members: {
                Row: {
                    group_id: string
                    user_id: string
                    created_at: string
                }
                Insert: {
                    group_id: string
                    user_id: string
                    created_at?: string
                }
                Update: Partial<Database['public']['Tables']['group_members']['Insert']>
            }
            vault_objects: {
                Row: {
                    id: string
                    workspace_id: string
                    parent_id: string | null
                    type: 'folder' | 'file'
                    name: string
                    size_bytes: number | null
                    mime_type: string | null
                    checksum_sha256: string | null
                    storage_bucket: string | null
                    storage_key: string | null
                    is_deleted: boolean
                    deleted_at: string | null
                    deleted_by: string | null
                    created_by: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    workspace_id: string
                    parent_id?: string | null
                    type: 'folder' | 'file'
                    name: string
                    size_bytes?: number | null
                    mime_type?: string | null
                    checksum_sha256?: string | null
                    storage_bucket?: string | null
                    storage_key?: string | null
                    is_deleted?: boolean
                    deleted_at?: string | null
                    deleted_by?: string | null
                    created_by?: string | null
                    created_at?: string
                }
                Update: Partial<Database['public']['Tables']['vault_objects']['Insert']>
            }
            file_versions: {
                Row: {
                    id: string
                    object_id: string
                    version_number: number
                    storage_bucket: string
                    storage_key: string
                    size_bytes: number
                    checksum_sha256: string | null
                    mime_type: string | null
                    uploaded_by: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    object_id: string
                    version_number: number
                    storage_bucket: string
                    storage_key: string
                    size_bytes: number
                    checksum_sha256?: string | null
                    mime_type?: string | null
                    uploaded_by?: string | null
                    created_at?: string
                }
                Update: Partial<Database['public']['Tables']['file_versions']['Insert']>
            }
            folder_access: {
                Row: {
                    id: string
                    workspace_id: string
                    folder_id: string
                    subject_type: 'user' | 'group'
                    subject_id: string
                    access: 'view'
                    created_at: string
                }
                Insert: {
                    id?: string
                    workspace_id: string
                    folder_id: string
                    subject_type: 'user' | 'group'
                    subject_id: string
                    access?: 'view'
                    created_at?: string
                }
                Update: Partial<Database['public']['Tables']['folder_access']['Insert']>
            }
            audit_events: {
                Row: {
                    id: string
                    workspace_id: string
                    actor_user_id: string | null
                    action: string
                    object_id: string | null
                    target_user_id: string | null
                    target_group_id: string | null
                    result: 'allowed' | 'denied' | 'error'
                    metadata: Json
                    created_at: string
                }
                Insert: {
                    id?: string
                    workspace_id: string
                    actor_user_id?: string | null
                    action: string
                    object_id?: string | null
                    target_user_id?: string | null
                    target_group_id?: string | null
                    result: 'allowed' | 'denied' | 'error'
                    metadata?: Json
                    created_at?: string
                }
                Update: Partial<Database['public']['Tables']['audit_events']['Insert']>
            }
            verified_download_rules: {
                Row: {
                    id: string
                    workspace_id: string
                    object_id: string
                    expires_at: string | null
                    max_downloads: number | null
                    allowed_emails: string[] | null
                    allowed_ips: string[] | null
                    watermark: boolean
                    is_revoked: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    workspace_id: string
                    object_id: string
                    expires_at?: string | null
                    max_downloads?: number | null
                    allowed_emails?: string[] | null
                    allowed_ips?: string[] | null
                    watermark?: boolean
                    is_revoked?: boolean
                    created_at?: string
                }
                Update: Partial<Database['public']['Tables']['verified_download_rules']['Insert']>
            }
            verified_download_log: {
                Row: {
                    id: string
                    workspace_id: string
                    object_id: string
                    download_token: string
                    downloader_email: string
                    downloader_ip: string | null
                    result: string
                    filename: string | null
                    folder_path: string | null
                    session_id: string | null
                    watermarked_checksum: string | null
                    file_checksum: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    workspace_id: string
                    object_id: string
                    download_token: string
                    downloader_email: string
                    downloader_ip?: string | null
                    result: string
                    filename?: string | null
                    folder_path?: string | null
                    session_id?: string | null
                    watermarked_checksum?: string | null
                    file_checksum?: string | null
                    created_at?: string
                }
                Update: Partial<CommunityTables['verified_download_log']['Insert']>
            }
}

export interface Database {
    public: {
        Tables: CommunityTables
    }
}


