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

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Protect all /admin routes except /admin/login
  if (path.startsWith('/admin') && !path.startsWith('/admin/login')) {
    if (!user) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/admin/login'
      return NextResponse.redirect(loginUrl)
    }
  }

  // Redirect logged-in users away from login page
  if (path === '/admin/login' && user) {
    const { data } = await supabase
      .from('restaurant_users')
      .select('restaurants(slug)')
      .eq('user_id', user.id)
      .single()
    const r = Array.isArray(data?.restaurants) ? data.restaurants[0] : data?.restaurants
    const slug = (r as { slug: string } | null)?.slug
    if (slug) {
      const adminUrl = request.nextUrl.clone()
      adminUrl.pathname = `/admin/${slug}`
      return NextResponse.redirect(adminUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
