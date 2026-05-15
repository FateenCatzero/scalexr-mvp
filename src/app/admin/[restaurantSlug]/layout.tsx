import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import AdminNav from '@/components/admin/AdminNav'

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ restaurantSlug: string }>
}) {
  const { restaurantSlug } = await params
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  // Verify user has access to this restaurant
  const { data: access } = await supabase
    .from('restaurant_users')
    .select('restaurants(name, slug)')
    .eq('user_id', user.id)
    .single()

  const restaurant = (Array.isArray(access?.restaurants)
    ? access.restaurants[0]
    : access?.restaurants) as { name: string; slug: string } | null
  if (!restaurant || restaurant.slug !== restaurantSlug) redirect('/admin/login')

  return (
    <div className="min-h-screen bg-background">
      {/* Top header */}
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Admin</p>
          <h1 className="font-bold leading-tight">{restaurant.name}</h1>
        </div>
      </header>

      {/* Page content */}
      <main className="pb-20 max-w-lg mx-auto">
        {children}
      </main>

      {/* Bottom nav */}
      <AdminNav restaurantSlug={restaurantSlug} />
    </div>
  )
}
