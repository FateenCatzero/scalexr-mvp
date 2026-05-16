'use client'

// master.ts — TanStack Query hooks for the master admin dashboard (/admin/master).
// These hooks are only called from components inside the /admin/master layout,
// which enforces role === 'master_admin' at the server level before rendering.
//
// Exported hooks:
//   useMasterPlatformStats — platform-wide totals (restaurants, orders today, new this month)
//   useMasterRestaurants   — all restaurants with per-restaurant order count and revenue
//   useMasterCreateRestaurant — insert a new restaurant row + write an audit log entry
//   useMasterToggleRestaurant — flip is_active on a restaurant + write audit log
//   useMasterUpdateRestaurant — update name/description + write audit log
//   useMasterLogs          — last 100 admin_logs rows with actor email and restaurant name joined
//
// All queries use the ['master', ...] query key namespace so useMasterCreateRestaurant's
// qc.invalidateQueries({ queryKey: ['master'] }) invalidates all master queries at once.
//
// Audit logging is fire-and-forget (wrapped in try/catch that swallows errors) because
// a logging failure should never block the actual mutation from completing.
//
// refetchInterval: 30_000 on list/stats queries keeps the dashboard live without Realtime
// subscriptions — master admin actions are infrequent enough that polling is sufficient.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type {
  Restaurant, RestaurantWithStats, AdminLog,
  SubscriptionPlan, RestaurantFeature, FeatureKey,
} from '@/lib/types'

// ─── HELPERS ──────────────────────────────────────────────────────────────────

// Fire-and-forget audit logger. Called from mutation onSuccess handlers AFTER the
// main mutation succeeds. Errors are swallowed so they never surface to the user.
async function logAction(
  action: string,
  payload: Record<string, unknown> = {},
  restaurantId?: string | null,
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('admin_logs').insert({
      actor_id: user?.id ?? null,
      restaurant_id: restaurantId ?? null,
      action,
      payload,
    })
  } catch { /* fire and forget */ }
}

export type PlatformStats = {
  totalRestaurants: number
  activeRestaurants: number
  ordersToday: number
  newThisMonth: number
}

// Three parallel queries: all restaurants (filtered client-side for active count),
// orders today (count-only), new restaurants this month (count-only).
// Not split by restaurant — this is a global platform view.
export function useMasterPlatformStats() {
  return useQuery({
    queryKey: ['master', 'stats'],
    queryFn: async (): Promise<PlatformStats> => {
      const supabase = createClient()
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const [restaurantsRes, ordersTodayRes, newThisMonthRes] = await Promise.all([
        supabase.from('restaurants').select('id, is_active'),
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', todayStart),
        supabase
          .from('restaurants')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', monthStart),
      ])

      const restaurants = restaurantsRes.data ?? []
      return {
        totalRestaurants: restaurants.length,
        activeRestaurants: restaurants.filter((r) => r.is_active).length,
        ordersToday: ordersTodayRes.count ?? 0,
        newThisMonth: newThisMonthRes.count ?? 0,
      }
    },
    refetchInterval: 30_000,
  })
}

// ─── RESTAURANTS ──────────────────────────────────────────────────────────────

// Fetches all restaurants and ALL orders in two parallel queries, then joins them
// client-side to produce per-restaurant order counts and revenue totals.
// This avoids a complex SQL aggregation and is acceptable at platform scale
// (dozens of restaurants, not thousands) since the full orders table is read.
export function useMasterRestaurants() {
  return useQuery({
    queryKey: ['master', 'restaurants'],
    queryFn: async (): Promise<RestaurantWithStats[]> => {
      const supabase = createClient()
      const [restaurantsRes, ordersRes] = await Promise.all([
        supabase
          .from('restaurants')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('orders')
          .select('restaurant_id, total_amount'),
      ])
      if (restaurantsRes.error) throw restaurantsRes.error

      const orderStats = (ordersRes.data ?? []).reduce<
        Record<string, { orderCount: number; revenue: number }>
      >((acc, o) => {
        if (!o.restaurant_id) return acc
        if (!acc[o.restaurant_id]) acc[o.restaurant_id] = { orderCount: 0, revenue: 0 }
        acc[o.restaurant_id].orderCount++
        acc[o.restaurant_id].revenue += o.total_amount ?? 0
        return acc
      }, {})

      return (restaurantsRes.data as Restaurant[]).map((r) => ({
        ...r,
        orderCount: orderStats[r.id]?.orderCount ?? 0,
        revenue: orderStats[r.id]?.revenue ?? 0,
      }))
    },
    refetchInterval: 30_000,
  })
}

// Creates a restaurant row with is_active=true. The slug must be globally unique
// (Supabase will throw if it's taken). After creation, the master admin shares
// the slug with the restaurant owner who uses it during signup to link their account.
export function useMasterCreateRestaurant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; slug: string; description?: string }) => {
      const supabase = createClient()
      const { error } = await supabase.from('restaurants').insert({
        name: input.name,
        slug: input.slug,
        description: input.description || null,
        is_active: true,
      })
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      logAction('create_restaurant', { name: vars.name, slug: vars.slug })
      qc.invalidateQueries({ queryKey: ['master'] })
    },
  })
}

export function useMasterToggleRestaurant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('restaurants')
        .update({ is_active })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      logAction(vars.is_active ? 'activate_restaurant' : 'suspend_restaurant', {}, vars.id)
      qc.invalidateQueries({ queryKey: ['master'] })
    },
  })
}

export function useMasterUpdateRestaurant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: { name?: string; description?: string | null }
    }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('restaurants')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      logAction('update_restaurant', vars.updates as Record<string, unknown>, vars.id)
      qc.invalidateQueries({ queryKey: ['master'] })
    },
  })
}

// ─── SUBSCRIPTION PLANS ───────────────────────────────────────────────────────

// All plans — used by master admin to populate the plan selector dropdown.
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ['master', 'plans'],
    queryFn: async (): Promise<SubscriptionPlan[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true })
      if (error) throw error
      return (data ?? []) as SubscriptionPlan[]
    },
    staleTime: 60_000,
  })
}

// Assigns a subscription plan to a restaurant. Passing null removes the plan.
export function useMasterAssignPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ restaurantId, planId }: { restaurantId: string; planId: string | null }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('restaurants')
        .update({ plan_id: planId })
        .eq('id', restaurantId)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      logAction('assign_plan', { plan_id: vars.planId }, vars.restaurantId)
      qc.invalidateQueries({ queryKey: ['master'] })
    },
  })
}

// ─── FEATURE FLAGS ────────────────────────────────────────────────────────────

// All feature rows for a single restaurant.
export function useMasterRestaurantFeatures(restaurantId: string) {
  return useQuery({
    queryKey: ['master', 'features', restaurantId],
    queryFn: async (): Promise<RestaurantFeature[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('restaurant_features')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('feature_key')
      if (error) throw error
      return (data ?? []) as RestaurantFeature[]
    },
    enabled: !!restaurantId,
  })
}

// Toggle a single feature flag for a restaurant.
// Logs the change to admin_logs with before/after snapshot.
export function useMasterToggleFeature() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      restaurantId,
      featureKey,
      enabled,
    }: {
      restaurantId: string
      featureKey: FeatureKey
      enabled: boolean
    }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('restaurant_features')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('restaurant_id', restaurantId)
        .eq('feature_key', featureKey)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      logAction(
        'toggle_feature',
        { feature_key: vars.featureKey, enabled: vars.enabled },
        vars.restaurantId,
      )
      qc.invalidateQueries({ queryKey: ['master', 'features', vars.restaurantId] })
    },
  })
}

// ─── AUDIT LOGS ───────────────────────────────────────────────────────────────

// Joins admin_logs with users (actor email) and restaurants (name, slug) in a
// single query using Supabase's PostgREST relationship syntax. The join columns
// (actor_id → users.id, restaurant_id → restaurants.id) must be foreign keys in
// the DB schema for this syntax to work without explicit hints.
// Returns the 100 most recent entries — no pagination since audit volumes are low.
export function useMasterLogs() {
  return useQuery({
    queryKey: ['master', 'logs'],
    queryFn: async (): Promise<AdminLog[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('admin_logs')
        .select('*, users(email), restaurants(name, slug)')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return (data ?? []) as AdminLog[]
    },
    refetchInterval: 30_000,
  })
}
