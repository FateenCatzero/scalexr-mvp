import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refreshes expired token and writes updated cookies — must stay first.
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Protect all /admin routes except /admin/login
  if (path.startsWith('/admin') && !path.startsWith('/admin/login')) {
    if (!user) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/admin/login'
      loginUrl.searchParams.set('returnTo', path)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Redirect already-authenticated users away from the login page
  if (path === '/admin/login' && user) {
    const returnTo = request.nextUrl.searchParams.get('returnTo')

    // Check role first — master_admin doesn't have a restaurant_users row
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

    // Restaurant admin — find their restaurant slug
    const { data } = await supabase
      .from('restaurant_users')
      .select('restaurants(slug)')
      .eq('user_id', user.id)
      .single()
    const r = Array.isArray(data?.restaurants) ? data.restaurants[0] : data?.restaurants
    const slug = (r as { slug: string } | null)?.slug
    if (slug) {
      const dest = request.nextUrl.clone()
      dest.pathname = returnTo && returnTo.startsWith(`/admin/${slug}`) ? returnTo : `/admin/${slug}`
      dest.search = ''
      return NextResponse.redirect(dest)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
