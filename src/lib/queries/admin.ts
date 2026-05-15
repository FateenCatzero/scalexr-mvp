import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Category, MenuItem, Restaurant } from '@/lib/types'

// ─── STATS ────────────────────────────────────────────────────────────────────

export type StatPeriod = 'today' | 'week' | 'month'

function getPeriodStart(period: StatPeriod): Date {
  const d = new Date()
  if (period === 'today') {
    d.setHours(0, 0, 0, 0)
  } else if (period === 'week') {
    d.setDate(d.getDate() - 6)
    d.setHours(0, 0, 0, 0)
  } else {
    d.setDate(d.getDate() - 29)
    d.setHours(0, 0, 0, 0)
  }
  return d
}

export function useAdminStats(restaurantId: string, period: StatPeriod = 'today') {
  return useQuery({
    queryKey: ['admin-stats', restaurantId, period],
    queryFn: async () => {
      const supabase = createClient()
      const since = getPeriodStart(period).toISOString()

      const [ordersRes, revenueRes, itemsRes, recentRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId)
          .gte('created_at', since)
          .neq('status', 'cancelled'),
        supabase
          .from('orders')
          .select('total_amount')
          .eq('restaurant_id', restaurantId)
          .gte('created_at', since)
          .neq('status', 'cancelled'),
        supabase
          .from('menu_items')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId)
          .eq('is_available', true),
        supabase
          .from('orders')
          .select('id, status, total_amount, created_at, table_number, customer_name')
          .eq('restaurant_id', restaurantId)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      const revenue = (revenueRes.data ?? []).reduce(
        (sum, o) => sum + Number(o.total_amount), 0
      )

      return {
        orders: ordersRes.count ?? 0,
        revenue,
        activeItems: itemsRes.count ?? 0,
        recentOrders: recentRes.data ?? [],
      }
    },
    enabled: !!restaurantId,
  })
}

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

export function useAdminCategories(restaurantId: string) {
  return useQuery({
    queryKey: ['admin-categories', restaurantId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as Category[]
    },
    enabled: !!restaurantId,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { restaurant_id: string; name: string; description?: string }) => {
      const supabase = createClient()
      const { data, error } = await supabase.from('categories').insert(input).select().single()
      if (error) throw error
      return data as Category
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories', data.restaurant_id] })
      queryClient.invalidateQueries({ queryKey: ['categories', data.restaurant_id] })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Category> & { id: string }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('categories').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data as Category
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories', data.restaurant_id] })
      queryClient.invalidateQueries({ queryKey: ['categories', data.restaurant_id] })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, restaurantId }: { id: string; restaurantId: string }) => {
      const supabase = createClient()
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
      return restaurantId
    },
    onSuccess: (restaurantId) => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories', restaurantId] })
      queryClient.invalidateQueries({ queryKey: ['categories', restaurantId] })
    },
  })
}

// ─── MENU ITEMS ───────────────────────────────────────────────────────────────

export function useAdminMenuItems(restaurantId: string) {
  return useQuery({
    queryKey: ['admin-menu-items', restaurantId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('menu_items')
        .select('*, categories(name)')
        .eq('restaurant_id', restaurantId)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as (MenuItem & { categories: { name: string } | null })[]
    },
    enabled: !!restaurantId,
  })
}

interface MenuItemInput {
  restaurant_id: string
  category_id: string | null
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_available: boolean
}

export function useCreateMenuItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: MenuItemInput) => {
      const supabase = createClient()
      const { data, error } = await supabase.from('menu_items').insert(input).select().single()
      if (error) throw error
      return data as MenuItem
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-items', data.restaurant_id] })
      queryClient.invalidateQueries({ queryKey: ['menu-items', data.restaurant_id] })
    },
  })
}

export function useUpdateMenuItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MenuItemInput> & { id: string }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('menu_items').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data as MenuItem
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-items', data.restaurant_id] })
      queryClient.invalidateQueries({ queryKey: ['menu-items', data.restaurant_id] })
    },
  })
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, restaurantId }: { id: string; restaurantId: string }) => {
      const supabase = createClient()
      const { error } = await supabase.from('menu_items').delete().eq('id', id)
      if (error) throw error
      return restaurantId
    },
    onSuccess: (restaurantId) => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-items', restaurantId] })
      queryClient.invalidateQueries({ queryKey: ['menu-items', restaurantId] })
    },
  })
}

// ─── RESTAURANT SETTINGS ──────────────────────────────────────────────────────

export function useUpdateRestaurant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<Pick<Restaurant, 'name' | 'description' | 'logo_url'>>
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('restaurants').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data as Restaurant
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['restaurant', data.slug] })
    },
  })
}

// ─── IMAGE UPLOAD ─────────────────────────────────────────────────────────────

export async function uploadImage(
  restaurantId: string,
  file: File
): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop()
  const path = `restaurants/${restaurantId}/menu/${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('restaurant-assets')
    .upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('restaurant-assets').getPublicUrl(path)
  return data.publicUrl
}
