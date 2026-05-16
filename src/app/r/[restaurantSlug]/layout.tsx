// Customer portal layout — applies restaurant branding if customer_theme_enabled.
// Renders a branded sticky header (logo + restaurant name on primary color background)
// and injects CSS variables + font/background onto the wrapper before first paint.

import { createClient } from '@/lib/supabase/server'
import { getRestaurantSettings } from '@/lib/security/featureGating'
import { buildCssVars, getContrastColor } from '@/lib/theme/buildCssVars'

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
    .select('id, name')
    .eq('slug', restaurantSlug)
    .single()

  const settings = restaurant ? await getRestaurantSettings(restaurant.id) : null
  const themed   = !!settings?.customer_theme_enabled

  const wrapperStyle = themed ? buildCssVars(settings!) : {}
  const headerBg     = themed ? settings!.primary_color : undefined
  const headerColor  = headerBg ? getContrastColor(headerBg) : undefined

  return (
    <div style={wrapperStyle} className="min-h-screen">
      {themed && (
        <header
          className="sticky top-0 z-20 px-4 py-3 flex items-center gap-3 shadow-sm"
          style={{ backgroundColor: headerBg, color: headerColor }}
        >
          {settings!.logo_url && (
            <img
              src={settings!.logo_url}
              alt={`${restaurant!.name} logo`}
              className="w-8 h-8 object-contain rounded shrink-0"
            />
          )}
          <span className="font-bold text-sm truncate">{restaurant!.name}</span>
        </header>
      )}
      {children}
    </div>
  )
}
