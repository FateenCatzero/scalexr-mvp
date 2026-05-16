// Customer portal layout — applies restaurant branding if customer_theme_enabled.
// Fetches settings server-side so CSS variables are injected before first paint,
// preventing a flash of unstyled content. No client component needed.

import { createClient } from '@/lib/supabase/server'
import { getRestaurantSettings } from '@/lib/security/featureGating'
import { buildCssVars } from '@/lib/theme/buildCssVars'

export default async function CustomerLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ restaurantSlug: string }>
}) {
  const { restaurantSlug } = await params
  const supabase = await createClient()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('slug', restaurantSlug)
    .single()

  const settings = restaurant ? await getRestaurantSettings(restaurant.id) : null
  const vars = settings?.customer_theme_enabled ? buildCssVars(settings) : {}

  return (
    <div style={vars as React.CSSProperties}>
      {children}
    </div>
  )
}
