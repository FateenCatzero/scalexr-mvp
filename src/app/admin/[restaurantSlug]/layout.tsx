// Restaurant Admin Layout — auth guard for all /admin/[restaurantSlug]/* routes.
// Applies restaurant branding (font, background, CSS vars) when admin_theme_enabled.
// Logo appears in the sticky header next to the restaurant name.
// A colored bottom border on the header makes the primary color immediately visible.

import { redirect } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'
import MasterControlBanner from '@/components/admin/MasterControlBanner'
import { requireRestaurantAdminAccess } from '@/lib/auth'
import { getFeatureFlags, getRestaurantSettings } from '@/lib/security/featureGating'
import { FeatureFlagsProvider } from '@/lib/hooks/useFeature'
import { buildCssVars } from '@/lib/theme/buildCssVars'

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ restaurantSlug: string }>
}) {
  const { restaurantSlug } = await params
  const session = await requireRestaurantAdminAccess(restaurantSlug)
  if (!session) redirect(`/admin/login?returnTo=/admin/${restaurantSlug}`)

  const [flags, settings] = await Promise.all([
    getFeatureFlags(session.restaurantId),
    getRestaurantSettings(session.restaurantId),
  ])

  const themed    = !!settings?.admin_theme_enabled
  const themeVars = themed ? buildCssVars(settings!) : {}

  return (
    <FeatureFlagsProvider flags={flags}>
      <div className="min-h-screen bg-background" style={themeVars}>
        {session.isMasterAdmin && <MasterControlBanner restaurantName={session.restaurantName} />}

        <header
          className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center justify-between"
          style={{ borderBottomColor: themed ? settings!.primary_color : undefined }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Logo — shown when admin theme is enabled and a logo has been uploaded */}
            {themed && settings!.logo_url && (
              <img
                src={settings!.logo_url}
                alt={`${session.restaurantName} logo`}
                className="w-8 h-8 object-contain rounded shrink-0"
              />
            )}
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Admin</p>
              <h1 className="font-bold leading-tight truncate">{session.restaurantName}</h1>
            </div>
          </div>
        </header>

        <main className="pb-20 max-w-lg mx-auto">
          {children}
        </main>
        <AdminNav restaurantSlug={session.restaurantSlug} />
      </div>
    </FeatureFlagsProvider>
  )
}
