// Staff Layout — auth guard for all /staff/[restaurantSlug]/* routes.
// Waiter and kitchen portals each get a branded header (logo, restaurant name, role badge)
// when their respective theme toggle is enabled by the master admin.
// CSS vars + font + background are injected server-side to avoid FOUC.

import { redirect } from 'next/navigation'
import { requireStaffAccess } from '@/lib/auth'
import { getRestaurantSettings } from '@/lib/security/featureGating'
import { buildCssVars, getContrastColor } from '@/lib/theme/buildCssVars'
import { createClient } from '@/lib/supabase/server'

export default async function StaffLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ restaurantSlug: string }>
}) {
  const { restaurantSlug } = await params

  const session = await requireStaffAccess(restaurantSlug, ['waiter', 'kitchen'])
  if (!session) redirect('/admin/login')

  const supabase = await createClient()

  const [{ data: restaurant }, settings] = await Promise.all([
    supabase.from('restaurants').select('name').eq('id', session.restaurantId).single(),
    getRestaurantSettings(session.restaurantId),
  ])

  const applyTheme =
    session.role === 'waiter'
      ? !!settings?.waiter_theme_enabled
      : !!settings?.kitchen_theme_enabled

  const wrapperStyle = applyTheme && settings ? buildCssVars(settings) : {}
  const headerBg     = applyTheme && settings ? settings.primary_color : undefined
  const headerColor  = headerBg ? getContrastColor(headerBg) : undefined

  const ROLE_LABEL: Record<string, string> = {
    waiter:  'Waiter',
    kitchen: 'Kitchen',
  }

  return (
    <div style={wrapperStyle} className="min-h-screen">
      {applyTheme && settings && (
        <header
          className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between gap-3 shadow-sm"
          style={{ backgroundColor: headerBg, color: headerColor }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {settings.logo_url && (
              <img
                src={settings.logo_url}
                alt="Restaurant logo"
                className="w-8 h-8 object-contain rounded shrink-0"
              />
            )}
            <span className="font-bold text-sm truncate">{restaurant?.name}</span>
          </div>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
            style={{
              backgroundColor: `${headerColor}22`,
              border: `1px solid ${headerColor}44`,
            }}
          >
            {ROLE_LABEL[session.role]}
          </span>
        </header>
      )}
      {children}
    </div>
  )
}
