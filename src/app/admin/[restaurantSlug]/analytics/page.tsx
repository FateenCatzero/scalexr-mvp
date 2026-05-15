import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import AnalyticsClient from './AnalyticsClient'
import type { Restaurant } from '@/lib/types'

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ restaurantSlug: string }>
}) {
  const { restaurantSlug } = await params
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: access } = await supabase
    .from('restaurant_users')
    .select('restaurants(*)')
    .single()

  const restaurant = (Array.isArray(access?.restaurants)
    ? access.restaurants[0]
    : access?.restaurants) as Restaurant | null

  if (!restaurant || restaurant.slug !== restaurantSlug) redirect('/admin/login')

  return <AnalyticsClient restaurant={restaurant} />
}
