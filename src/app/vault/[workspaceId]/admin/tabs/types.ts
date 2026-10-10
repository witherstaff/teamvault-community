export type UserRow = { id: string; email: string; name: string | null; role: 'admin' | 'user'; can_upload: boolean; status: 'invited' | 'active' | 'disabled'; created_at: string; geo_country_override: string[]; geo_bypass_allowed: boolean | null }
export type Group = { id: string; name: string; is_system: boolean; created_at: string }
export type AuditEvent = { id: string; action: string; result: 'allowed' | 'denied' | 'error'; created_at: string; actor_user_id: string | null; object_id: string | null; metadata: Record<string, unknown>; users?: { name: string | null, email: string } | null }
export type UserItem = { id: string; name: string | null; email: string }
