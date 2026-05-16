// Master Admin Layout — auth guard for all /admin/master/* routes.
// Only users with role === 'master_admin' in the users table are allowed through.
// All other roles (including restaurant_admin, waiter, kitchen) are denied.
// Auth logic is centralized in lib/auth.ts — no Supabase client is created here.

import { redirect } from 'next/navigation'
import MasterNav from '@/components/admin/MasterNav'
import { requireMasterAdmin } from '@/lib/auth'

export default async function MasterAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const userId = await requireMasterAdmin()

  // requireMasterAdmin returns null for: unauthenticated, wrong role, missing profile.
  // All failure cases redirect to login — we don't distinguish between them to avoid
  // leaking information about what accounts exist.
  if (!userId) redirect('/admin/login?returnTo=/admin/master')

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">ScaleXR</p>
          <h1 className="font-bold leading-tight">Master Admin</h1>
        </div>
      </header>
      <main className="pb-20 max-w-lg mx-auto">
        {children}
      </main>
      <MasterNav />
    </div>
  )
}
