import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'placeholder'
const supabaseServiceKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * Public Supabase client (publishable/anon key) — for use in client components.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey)

/**
 * Server-only Supabase admin client (secret / service role key).
 * Bypasses RLS. Use ONLY in API route handlers.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAdminClient() {
  const adminKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!adminKey || adminKey === 'FILL_IN' || adminKey.startsWith('your-')) {
    throw new Error(
      'Neither SUPABASE_SECRET_KEY nor SUPABASE_SERVICE_ROLE_KEY is set. Add your Supabase secret key (sb_secret_...) from Project Settings > API Keys.'
    )
  }
  return createClient<any>(supabaseUrl, adminKey, {
    auth: { persistSession: false },
  })
}
