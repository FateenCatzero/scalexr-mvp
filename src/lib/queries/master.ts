'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Restaurant, RestaurantWithStats, AdminLog } from '@/lib/types'

// ─── HELPERS ──────────────────────────────────────────────────────────────────

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

// ─── AUDIT LOGS ───────────────────────────────────────────────────────────────

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
