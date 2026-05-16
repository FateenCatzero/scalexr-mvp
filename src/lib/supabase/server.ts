import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Creates a Supabase client for use in Server Components, Server Actions,
// and Route Handlers. It reads auth session cookies from the incoming request
// so server-rendered pages can access the currently logged-in user.
//
// The `setAll` method writes updated cookies back to the response. It's
// wrapped in a try/catch because calling `cookieStore.set()` from a Server
// Component (as opposed to a Server Action or Route Handler) throws in
// Next.js — but that case is safe to ignore since Server Components only
// need to READ the session, not refresh it.
//
// Note: this client is marked async because `cookies()` is async in Next.js 15+.
// Never call this in client components — use lib/supabase/client.ts instead.
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — safe to ignore
          }
        },
      },
    }
  )
}
