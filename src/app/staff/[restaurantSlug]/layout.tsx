// Staff Layout — auth guard for all /staff/[restaurantSlug]/* routes.
// Runs before any page in this directory (waiter, kitchen, and any future staff pages).
//
// Access rules (enforced in lib/auth.ts → requireStaffAccess):
//   waiter  → allowed to their own restaurant's staff portal only
//   kitchen → allowed to their own restaurant's staff portal only
//   master_admin     → DENIED (their portal is /admin/master)
//   restaurant_admin → DENIED (they use /admin/[slug], not staff portals)
//   different restaurant → DENIED (restaurant_id enforced at DB query level)
//   suspended restaurant → DENIED (is_active check in requireStaffAccess)
//   unauthenticated → redirect to /admin/login
//
// Applies restaurant branding if waiter/kitchen theme is enabled for the
// applicable portal — theme vars are injected server-side to avoid FOUC.

import { redirect } from 'next/navigation'
import { requireStaffAccess } from '@/lib/auth'
import { getRestaurantSettings } from '@/lib/security/featureGating'
import { buildCssVars } from '@/lib/theme/buildCssVars'
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

  const settings = await getRestaurantSettings(session.restaurantId)

  // Apply the relevant portal theme based on the staff member's role.
  const applyTheme =
    session.role === 'waiter'
      ? settings?.waiter_theme_enabled
      : settings?.kitchen_theme_enabled

  const themeVars = applyTheme && settings ? buildCssVars(settings) : {}

  return (
    <div style={themeVars as React.CSSProperties}>
      {children}
    </div>
  )
}
