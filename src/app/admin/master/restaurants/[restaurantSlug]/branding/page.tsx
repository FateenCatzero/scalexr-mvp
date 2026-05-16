// Master Admin — per-restaurant branding configuration page.
// Auth: master_admin only (requireMasterAdmin). Restaurant admins cannot access this.
// Fetches (or initialises) the restaurant_settings row and passes it to BrandingClient.

import { redirect } from 'next/navigation'
import { requireMasterAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getRestaurantSettings } from '@/lib/security/featureGating'
import BrandingClient from './BrandingClient'
import type { Restaurant } from '@/lib/types'

export default async function MasterBrandingPage({
  params,
}: {
  params: Promise<{ restaurantSlug: string }>
}) {
  const userId = await requireMasterAdmin()
  if (!userId) redirect('/admin/login?returnTo=/admin/master')

  const { restaurantSlug } = await params
  const supabase = await createClient()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', restaurantSlug)
    .single()

  if (!restaurant) redirect('/admin/master')

  let settings = await getRestaurantSettings(restaurant.id)

  // If no settings row exists (restaurant created before migration 010), initialise one.
  if (!settings) {
    await supabase
      .from('restaurant_settings')
      .upsert({ restaurant_id: restaurant.id }, { onConflict: 'restaurant_id' })
    settings = await getRestaurantSettings(restaurant.id)
  }

  if (!settings) redirect('/admin/master')

  return <BrandingClient restaurant={restaurant as Restaurant} settings={settings} />
}
