// lib/auth.ts — centralized RBAC (Role-Based Access Control) for server-side route protection.
//
// This is the SINGLE SOURCE OF TRUTH for all auth and authorization logic.
// Every layout guard imports from here. No Supabase auth logic lives in layout files.
//
// Role storage:
//   users.role          → 'master_admin' | 'restaurant_admin' | 'waiter' | 'kitchen'
//   restaurant_users.role → 'restaurant_admin' | 'waiter' | 'kitchen'
//
// Access matrix:
//   master_admin     → /admin/master/* (primary)
//                      /admin/[slug]/* (oversight, MasterControlBanner shown)
//                      /staff/*        DENIED
//   restaurant_admin → /admin/[their-slug]/* only
//                      /admin/master/* DENIED
//                      /staff/*        DENIED
//   waiter           → /staff/[their-slug]/* only
//                      /admin/*        DENIED
//   kitchen          → /staff/[their-slug]/* only
//                      /admin/*        DENIED
//
// To add a new role (e.g. 'manager') in the future:
//   1. Add to AppRole and RestaurantRole unions.
//   2. Add to the allowedRoles array at the relevant requireStaffAccess call site.
//   3. No changes needed inside this file's logic.

import { createClient } from '@/lib/supabase/server'

// ─── TYPES ────────────────────────────────────────────────────────────────────

// All possible roles across the platform.
export type AppRole = 'master_admin' | 'restaurant_admin' | 'waiter' | 'kitchen'

// Roles that live in restaurant_users.role (tenant-scoped, not platform-scoped).
// master_admin is intentionally excluded — it is a platform role in users.role only.
export type RestaurantRole = 'restaurant_admin' | 'waiter' | 'kitchen'

// Roles permitted to access staff portals specifically.
export type StaffRole = 'waiter' | 'kitchen'

// Returned by requireRestaurantAdminAccess on success.
export type AdminSession = {
  userId: string
  restaurantId: string
  restaurantName: string
  restaurantSlug: string
  isMasterAdmin: boolean // true when master_admin visits a restaurant admin panel
}

// Returned by requireStaffAccess on success.
export type StaffSession = {
  userId: string
  role: StaffRole
  restaurantId: string
}

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────

// Returns the authenticated Supabase User or null.
// Uses getUser() which validates the JWT against Supabase Auth servers —
// cannot be spoofed by manipulating a localStorage/cookie value.
export async function getUserSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user ?? null
}

// Returns the user's platform-level role from the users table, or null if not found.
// master_admin is the only role that exclusively lives here.
// For waiter/kitchen/restaurant_admin, also check restaurant_users for restaurant scope.
export async function getUserRole(userId: string): Promise<AppRole | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()
  return (data?.role as AppRole) ?? null
}

// Returns all restaurant memberships for a user from restaurant_users.
// Used after login to determine which restaurant admin panel to redirect to.
export async function getUserRestaurantAccess(
  userId: string,
): Promise<Array<{ restaurantId: string; role: RestaurantRole }>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('restaurant_users')
    .select('restaurant_id, role')
    .eq('user_id', userId)
  return (data ?? []).map((row) => ({
    restaurantId: row.restaurant_id,
    role: row.role as RestaurantRole,
  }))
}

// ─── ROUTE GUARDS ─────────────────────────────────────────────────────────────

// Guard for /admin/master/layout.tsx
// Returns the authenticated userId if the user is master_admin, otherwise null.
// All other roles are denied — including restaurant_admin.
export async function requireMasterAdmin(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'master_admin' ? user.id : null
}

// Guard for /admin/[restaurantSlug]/layout.tsx
// Allows:
//   master_admin     — any restaurant, for oversight (isMasterAdmin: true in return value)
//   restaurant_admin — their own restaurant only (verified via restaurant_users with role filter)
// Denies:
//   waiter, kitchen  — staff cannot access admin panels even if they have a restaurant_users row
//   unauthenticated
//   restaurant_admin accessing a different restaurant's slug
export async function requireRestaurantAdminAccess(
  restaurantSlug: string,
): Promise<AdminSession | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile) return null

  // master_admin: platform-wide oversight access to all restaurant admin panels.
  // No restaurant_users row required. The MasterControlBanner is shown by the layout.
  if (profile.role === 'master_admin') {
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, name, slug')
      .eq('slug', restaurantSlug)
      .single()
    if (!restaurant) return null
    return {
      userId: user.id,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      restaurantSlug: restaurant.slug,
      isMasterAdmin: true,
    }
  }

  // Hard gate: only restaurant_admin reaches the next check.
  // waiter and kitchen are denied here regardless of restaurant_users contents.
  if (profile.role !== 'restaurant_admin') return null

  // restaurant_admin: must have a restaurant_users row with role='restaurant_admin'
  // for the exact restaurant being accessed. The role='restaurant_admin' filter is
  // critical — without it, a waiter who somehow has a restaurant_users entry would pass.
  // Two-step lookup: get restaurant_id from restaurant_users, then fetch restaurant details.
  // Avoids the embedded join which can fail when PostgREST's FK schema cache is stale.
  const { data: ru } = await supabase
    .from('restaurant_users')
    .select('restaurant_id')
    .eq('user_id', user.id)
    .eq('role', 'restaurant_admin')
    .single()

  if (!ru?.restaurant_id) return null

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, slug')
    .eq('id', ru.restaurant_id)
    .single()

  // Deny if no restaurant linked, or if the slug doesn't match the requested route.
  // This prevents a restaurant_admin from accessing a different restaurant's panel.
  if (!restaurant || restaurant.slug !== restaurantSlug) return null

  return {
    userId: user.id,
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    restaurantSlug: restaurant.slug,
    isMasterAdmin: false,
  }
}

// Guard for /staff/[restaurantSlug]/layout.tsx
// Allows:
//   waiter  — restaurant_users row with role='waiter' for this restaurant
//   kitchen — restaurant_users row with role='kitchen' for this restaurant
// Denies:
//   master_admin     — their portal is /admin/master, not staff views
//   restaurant_admin — they use /admin/[slug], not staff portals
//   any role for a different restaurant (enforced by restaurant_id match in query)
//   unauthenticated
//   suspended restaurants (is_active check prevents staff access when suspended)
//
// allowedRoles defaults to ['waiter', 'kitchen']. Pass a subset to restrict
// a specific page to only one role (e.g. ['waiter'] for a waiter-only route).
export async function requireStaffAccess(
  restaurantSlug: string,
  allowedRoles: StaffRole[] = ['waiter', 'kitchen'],
): Promise<StaffSession | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Resolve restaurant. is_active check: suspended restaurants are inaccessible to
  // staff — consistent with the customer menu being hidden for suspended restaurants.
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('slug', restaurantSlug)
    .eq('is_active', true)
    .single()
  if (!restaurant) return null

  // Check restaurant_users with both user_id and restaurant_id constraints.
  // This is the restaurant isolation check — a waiter at Restaurant A cannot
  // access Restaurant B even if they know the slug, because their restaurant_id
  // in the DB won't match. No bypass for master_admin or restaurant_admin.
  const { data: membership } = await supabase
    .from('restaurant_users')
    .select('role')
    .eq('user_id', user.id)
    .eq('restaurant_id', restaurant.id)
    .in('role', allowedRoles)
    .single()

  if (!membership) return null

  return {
    userId: user.id,
    role: membership.role as StaffRole,
    restaurantId: restaurant.id,
  }
}
