import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!
const db = createClient(supabaseUrl, supabaseServiceKey)

async function test() {
  console.log("Starting DB query test...")
  try {
    const { data: memberships, error } = await db
      .from('memberships')
      .select(`
            role,
            status,
            can_upload,
            workspace_id,
            workspaces (
              id,
              name,
              slug,
              storage_limit_bytes
            )
          `)
      .eq('user_id', 'b979a4de-eec2-4dcf-bdcd-bb8a6058d8e5')
      .in('status', ['active', 'invited'])

    if (error) {
      console.error("DB Query Error:", error)
    } else {
      console.log("Success! Memberships count:", memberships?.length)
    }
  } catch (e) {
    console.error("Caught exception:", e)
  }
}

test()
