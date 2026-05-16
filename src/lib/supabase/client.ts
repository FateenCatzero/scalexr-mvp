import { createBrowserClient } from '@supabase/ssr'

// Creates a Supabase client for use in browser (client) components.
// Uses the public anon key — Row Level Security (RLS) policies in Supabase
// enforce what each user can read/write. This function is safe to call
// multiple times; @supabase/ssr handles the singleton internally.
// Never use this in Server Components or API routes — use server.ts instead.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
