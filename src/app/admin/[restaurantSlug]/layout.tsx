import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import AdminNav from '@/components/admin/AdminNav'
import MasterControlBanner from '@/components/admin/MasterControlBanner'

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
  if (!user) redirect(`/admin/login?returnTo=/admin/${restaurantSlug}`)

  // Check if user is master_admin — they can access any restaurant
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const isMasterAdmin = profile?.role === 'master_admin'
  let restaurantName: string
  let verifiedSlug: string

  if (isMasterAdmin) {
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('name, slug')
      .eq('slug', restaurantSlug)
      .single()
    if (!restaurant) redirect('/admin/master')
    restaurantName = restaurant.name
    verifiedSlug = restaurant.slug
  } else {
    const { data: access } = await supabase
      .from('restaurant_users')
      .select('restaurants(name, slug)')
      .eq('user_id', user.id)
      .single()

    const restaurant = (Array.isArray(access?.restaurants)
      ? access.restaurants[0]
      : access?.restaurants) as { name: string; slug: string } | null
    if (!restaurant || restaurant.slug !== restaurantSlug) redirect('/admin/login')
    restaurantName = restaurant.name
    verifiedSlug = restaurantSlug
  }

  return (
    <div className="min-h-screen bg-background">
      {isMasterAdmin && <MasterControlBanner restaurantName={restaurantName} />}
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Admin</p>
          <h1 className="font-bold leading-tight">{restaurantName}</h1>
        </div>
      </header>

      <main className="pb-20 max-w-lg mx-auto">
        {children}
      </main>

      <AdminNav restaurantSlug={verifiedSlug} />
    </div>
  )
}
