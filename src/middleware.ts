// middleware.ts — Next.js middleware, executed on every request before rendering.
//
// What this does:
//   1. Refreshes the Supabase session token on every request (prevents silent token
//      expiry mid-session — required by @supabase/ssr).
//   2. Redirects unauthenticated requests to /admin/* → /admin/login?returnTo=...
//   3. Redirects already-authenticated users away from /admin/login to their correct
//      dashboard (master_admin → /admin/master, others → /admin/[slug]).
//
// The layout-level auth guards (admin/[restaurantSlug]/layout.tsx and
// admin/master/layout.tsx) remain as a second layer and are NOT removed.
// Defence in depth: middleware catches the case before the page even renders;
// layout catches the case if middleware is bypassed or misconfigured.

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Build a Supabase client that can read and write cookies on the request/response.
  // This is the pattern required by @supabase/ssr for Next.js middleware.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // First write updated cookies into the request object (for downstream middleware)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Then write them into the response so the browser receives them
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // This call refreshes an expired token if needed and writes new cookies.
  // It MUST come before any other logic — do not move it.
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Early unauthenticated bounce for all protected route groups.
  // This is the first line of defence — it prevents unauthenticated requests from
  // reaching the layout layer at all, saving DB calls and preventing flash-of-content.
  // Role and restaurant authorization is handled in each layout via lib/auth.ts.
  //
  // Protected:  /admin/* (except /admin/login and /admin/reset-password)
  //             /staff/*
  // Public:     /r/* (customer menu), /admin/login, /admin/reset-password, /
  const isProtectedAdmin =
    path.startsWith('/admin') &&
    !path.startsWith('/admin/login') &&
    !path.startsWith('/admin/reset-password')
  const isProtectedStaff = path.startsWith('/staff')

  if ((isProtectedAdmin || isProtectedStaff) && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/admin/login'
    loginUrl.searchParams.set('returnTo', path)
    return NextResponse.redirect(loginUrl)
  }

  // If an authenticated user hits the login page, redirect them to the right dashboard.
  // master_admin goes to /admin/master; restaurant_admin goes to their /admin/[slug].
  if (path === '/admin/login' && user) {
    const returnTo = request.nextUrl.searchParams.get('returnTo')

    // Look up the user's role from the public users table
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'master_admin') {
      const dest = request.nextUrl.clone()
      dest.pathname = returnTo && returnTo.startsWith('/admin/') ? returnTo : '/admin/master'
      dest.search = ''
      return NextResponse.redirect(dest)
    }

    // For non-master-admin users, look up their restaurant and role.
    // Two-step: get restaurant_id + role then resolve slug — avoids the embedded join
    // which can fail when PostgREST's FK schema cache is stale after migrations.
    // Route by role: restaurant_admin → /admin/[slug], waiter/kitchen → /staff/[slug].
    const { data: ru } = await supabase
      .from('restaurant_users')
      .select('restaurant_id, role')
      .eq('user_id', user.id)
      .single()
    if (ru?.restaurant_id) {
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('slug')
        .eq('id', ru.restaurant_id)
        .single()
      const slug = restaurant?.slug
      if (slug) {
        const dest = request.nextUrl.clone()
        dest.search = ''
        if (ru.role === 'restaurant_admin') {
          dest.pathname = returnTo && returnTo.startsWith(`/admin/${slug}`) ? returnTo : `/admin/${slug}`
        } else {
          // waiter / kitchen → staff portal, not admin panel
          dest.pathname = returnTo && returnTo.startsWith(`/staff/${slug}`) ? returnTo : `/staff/${slug}`
        }
        return NextResponse.redirect(dest)
      }
    }
  }

  return supabaseResponse
}

// Matcher: run middleware on all routes except static files and Next.js internals.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
