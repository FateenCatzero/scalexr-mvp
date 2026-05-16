// Restaurant Admin Layout — auth guard for all /admin/[restaurantSlug]/* routes.
// Runs before any page in this directory renders.
//
// Access rules (enforced in lib/auth.ts → requireRestaurantAdminAccess):
//   master_admin     → allowed to any restaurant for oversight; MasterControlBanner shown.
//   restaurant_admin → allowed only to their own restaurant (slug must match restaurant_users row
//                      with role='restaurant_admin' — the role filter blocks waiter/kitchen).
//   waiter / kitchen → DENIED even if they have a restaurant_users row for this restaurant.
//   unauthenticated  → redirect to /admin/login with returnTo param.
//
// Auth logic is centralized in lib/auth.ts — no Supabase client is created here.

import { redirect } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'
import MasterControlBanner from '@/components/admin/MasterControlBanner'
import { requireRestaurantAdminAccess } from '@/lib/auth'
import { getFeatureFlags } from '@/lib/security/featureGating'
import { FeatureFlagsProvider } from '@/lib/hooks/useFeature'

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ restaurantSlug: string }>
}) {
  const { restaurantSlug } = await params
  const session = await requireRestaurantAdminAccess(restaurantSlug)

  // Null means any failure: unauthenticated, wrong role, wrong restaurant, missing profile.
  // All cases redirect to login — no distinction to avoid leaking information.
  if (!session) redirect(`/admin/login?returnTo=/admin/${restaurantSlug}`)

  // Fetch feature flags server-side once per layout render.
  // Passed into FeatureFlagsProvider so all client components under this layout
  // can call useFeature() without ever touching Supabase from the browser.
  const flags = await getFeatureFlags(session.restaurantId)

  return (
    <FeatureFlagsProvider flags={flags}>
      <div className="min-h-screen bg-background">
        {/* Amber warning banner — only shown when master_admin is viewing a restaurant panel */}
        {session.isMasterAdmin && <MasterControlBanner restaurantName={session.restaurantName} />}
        {/* Sticky header so the restaurant name stays visible while scrolling */}
        <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Admin</p>
            <h1 className="font-bold leading-tight">{session.restaurantName}</h1>
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
