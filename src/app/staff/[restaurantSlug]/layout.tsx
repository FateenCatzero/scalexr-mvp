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
// To add a new staff role (e.g. 'manager') in the future:
//   Add it to the StaffRole type in lib/auth.ts and to the allowedRoles array below.

import { redirect } from 'next/navigation'
import { requireStaffAccess } from '@/lib/auth'

export default async function StaffLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ restaurantSlug: string }>
}) {
  const { restaurantSlug } = await params

  const session = await requireStaffAccess(restaurantSlug, ['waiter', 'kitchen'])

  // Null means any failure — all cases redirect to login without distinguishing
  // "not logged in" from "wrong role" to avoid leaking information about valid slugs.
  if (!session) redirect('/admin/login')

  return <>{children}</>
}
