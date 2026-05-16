// Server Component — fetches restaurant, feature flags, plan, and settings,
// then passes all of it to SettingsClient for rendering.
// Auth is enforced by the parent layout; this page only verifies the restaurant exists.
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import SettingsClient from './SettingsClient'
import { getFeatureFlags, getRestaurantSettings, getPlan } from '@/lib/security/featureGating'

export default async function SettingsPage({
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

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', restaurantSlug)
    .single()

  if (!restaurant) redirect('/admin/login')

  // Parallel fetch — features, settings, and plan are independent queries.
  const [flags, settings, plan] = await Promise.all([
    getFeatureFlags(restaurant.id),
    getRestaurantSettings(restaurant.id),
    getPlan(restaurant.id),
  ])

  return (
    <SettingsClient
      restaurant={restaurant}
      flags={flags}
      settings={settings}
      plan={plan}
    />
  )
}
