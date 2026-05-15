import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { AssetType, Category, ItemAsset, MenuItem, Restaurant } from '@/lib/types'

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

// ─── ITEM ASSETS (3D MODELS) ──────────────────────────────────────────────────

export function useItemAssets(menuItemId: string) {
  return useQuery({
    queryKey: ['item-assets', menuItemId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('item_assets')
        .select('*')
        .eq('menu_item_id', menuItemId)
      if (error) throw error
      return data as ItemAsset[]
    },
    enabled: !!menuItemId,
  })
}

export function useAllItemAssets(restaurantId: string) {
  return useQuery({
    queryKey: ['all-item-assets', restaurantId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('item_assets')
        .select('*')
        .eq('restaurant_id', restaurantId)
      if (error) throw error
      return data as ItemAsset[]
    },
    enabled: !!restaurantId,
  })
}

export function useUploadModel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      restaurantId,
      menuItemId,
      file,
      assetType,
    }: {
      restaurantId: string
      menuItemId: string
      file: File
      assetType: 'model_glb' | 'model_usdz'
    }) => {
      const supabase = createClient()
      const ext = assetType === 'model_glb' ? 'glb' : 'usdz'
      const path = `restaurants/${restaurantId}/models/${menuItemId}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('restaurant-assets')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('restaurant-assets')
        .getPublicUrl(path)

      // Upsert asset record
      const { error: assetError } = await supabase
        .from('item_assets')
        .upsert({
          menu_item_id: menuItemId,
          restaurant_id: restaurantId,
          asset_type: assetType,
          storage_path: path,
          public_url: urlData.publicUrl,
          file_size_bytes: file.size,
          is_optimized: false,
          metadata: {},
        }, { onConflict: 'menu_item_id,asset_type' })
      if (assetError) throw assetError

      // Update menu item flags
      const flag = assetType === 'model_glb' ? { has_3d_model: true } : { has_ar: true }
      const { error: itemError } = await supabase
        .from('menu_items')
        .update(flag)
        .eq('id', menuItemId)
      if (itemError) throw itemError

      return { menuItemId, assetType: assetType as AssetType, publicUrl: urlData.publicUrl }
    },
    onSuccess: ({ menuItemId }) => {
      queryClient.invalidateQueries({ queryKey: ['item-assets', menuItemId] })
      queryClient.invalidateQueries({ queryKey: ['all-item-assets'] })
    },
  })
}

export function useDeleteModel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      asset,
      menuItemId,
    }: {
      asset: ItemAsset
      menuItemId: string
    }) => {
      const supabase = createClient()

      await supabase.storage.from('restaurant-assets').remove([asset.storage_path])

      const { error } = await supabase
        .from('item_assets')
        .delete()
        .eq('id', asset.id)
      if (error) throw error

      const flag = asset.asset_type === 'model_glb' ? { has_3d_model: false } : { has_ar: false }
      await supabase.from('menu_items').update(flag).eq('id', menuItemId)

      return { menuItemId, assetType: asset.asset_type }
    },
    onSuccess: ({ menuItemId }) => {
      queryClient.invalidateQueries({ queryKey: ['item-assets', menuItemId] })
      queryClient.invalidateQueries({ queryKey: ['all-item-assets'] })
    },
  })
}
