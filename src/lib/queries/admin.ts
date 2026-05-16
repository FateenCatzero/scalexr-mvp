// admin.ts — all TanStack Query hooks used by the restaurant admin dashboard.
//
// Exported hooks by section:
//   Stats:       useAdminStats — orders, revenue, active items, recent orders for a time period
//   Categories:  useAdminCategories, useCreateCategory, useUpdateCategory, useDeleteCategory
//   Menu items:  useAdminMenuItems, useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem
//   Restaurant:  useUpdateRestaurant — name, description, logo_url
//   Image:       uploadImage — plain async function (not a hook); uploads to Supabase Storage
//   3D models:   useItemAssets, useAllItemAssets, useUploadModel, useDeleteModel
//   Analytics:   useAnalytics — aggregates analytics_events client-side (event type counts, top items)
//   Tables:      useRestaurantTables, useCreateTable, useDeleteTable (soft-delete via is_active=false)
//
// Key design decisions:
//   - Admin and customer queries use separate query keys even when hitting the same table
//     (e.g., 'admin-menu-items' vs 'menu-items') so an admin mutation invalidates both caches.
//   - useUploadModel is a three-step operation: storage upload → item_assets upsert
//     (onConflict: 'menu_item_id,asset_type' replaces any existing asset of the same type)
//     → menu_items flag update (has_3d_model or has_ar = true).
//   - useDeleteModel mirrors the same three steps in reverse: storage remove → item_assets
//     delete → flag reset to false.
//   - useDeleteTable does NOT hard-delete rows; it sets is_active=false. This preserves
//     historical QR code scan data linked to old table records.
//   - Analytics are aggregated entirely on the client from raw analytics_events rows.
//     No server-side aggregation or RPC is used — simpler but limited to ~a few thousand
//     events before it becomes slow. topItems is sorted by AR + 3D view count combined.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { AnalyticsEvent, AssetType, Category, ItemAsset, MenuItem, Restaurant, RestaurantTable } from '@/lib/types'

// ─── STATS ────────────────────────────────────────────────────────────────────

export type StatPeriod = 'today' | 'week' | 'month'

// Returns midnight of the period start: 'today' = start of today, 'week' = 7 days ago, 'month' = 30 days ago.
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

// Four parallel queries: order count (head-only), revenue sum (full rows for reduce),
// active menu item count (head-only), and last 10 recent orders for the dashboard table.
// Cancelled orders are excluded from all counts using .neq('status', 'cancelled').
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

// Invalidates both 'admin-categories' (admin view) and 'categories' (customer menu view)
// so a new category appears immediately in both places without a page reload.
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
  is_out_of_stock?: boolean
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

// Plain async function, not a hook — called directly by ImageUpload's onChange handler
// and inside ItemForm via the Controller render prop. Uploads to the 'restaurant-assets'
// Supabase Storage bucket at path restaurants/{restaurantId}/menu/{timestamp}.{ext}.
// Returns the CDN public URL that gets stored in menu_items.image_url.
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

// Fetches assets for a single item — used by EditItemClient and ItemDetailClient.
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

// Fetches ALL assets for a restaurant in a single query — used by BulkModelsClient
// to build the assetsByItem lookup map without N+1 queries.
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

// Three-step mutation:
//   1. Upload file to Storage at restaurants/{restaurantId}/models/{menuItemId}.{ext}
//      — upsert:true overwrites any previously uploaded model at the same path
//   2. Upsert a row in item_assets with onConflict: 'menu_item_id,asset_type'
//      — ensures there is exactly one GLB and one USDZ row per item (replaces old record)
//   3. Update menu_items flag: has_3d_model=true for GLB, has_ar=true for USDZ
//      — these flags drive the "3D" and "AR" badges on ItemCard and ItemDetailClient
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

// Mirror of useUploadModel — three steps in reverse:
//   1. Remove the file from Storage (storage.remove is best-effort; continues even if missing)
//   2. Delete the item_assets row
//   3. Reset the flag on menu_items (has_3d_model or has_ar back to false)
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

// ─── ANALYTICS ────────────────────────────────────────────────────────────────

// getAnalyticsPeriodStart mirrors getPeriodStart above — kept separate so the two
// period types (StatPeriod, AnalyticsPeriod) can evolve independently.
export type AnalyticsPeriod = 'today' | 'week' | 'month'

function getAnalyticsPeriodStart(period: AnalyticsPeriod): Date {
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

// Fetches raw analytics_events rows and aggregates them client-side.
// Four parallel queries: events (with payload), order count, revenue, active item count.
// Aggregation builds two maps: counts[event_type] for overall totals and itemCounts[itemId]
// for per-item breakdown. topItems slices the top 10 by combined AR + 3D view count.
// refetchInterval: 30s keeps the analytics page live without requiring a manual refresh.
export function useAnalytics(restaurantId: string, period: AnalyticsPeriod = 'today') {
  return useQuery({
    queryKey: ['analytics', restaurantId, period],
    refetchInterval: 30_000,
    queryFn: async () => {
      const supabase = createClient()
      const since = getAnalyticsPeriodStart(period).toISOString()

      const [eventsRes, ordersRes, revenueRes, itemsRes] = await Promise.all([
        supabase
          .from('analytics_events')
          .select('event_type, payload, created_at')
          .eq('restaurant_id', restaurantId)
          .gte('created_at', since)
          .order('created_at', { ascending: false }),
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
      ])

      if (eventsRes.error) throw eventsRes.error
      const events = (eventsRes.data ?? []) as Pick<AnalyticsEvent, 'event_type' | 'payload' | 'created_at'>[]

      const counts: Record<string, number> = {}
      const itemCounts: Record<string, { name: string; ar: number; views3d: number; views: number }> = {}

      for (const ev of events) {
        counts[ev.event_type] = (counts[ev.event_type] ?? 0) + 1
        const itemId = ev.payload?.item_id as string | undefined
        const itemName = ev.payload?.item_name as string | undefined
        if (itemId && itemName) {
          if (!itemCounts[itemId]) itemCounts[itemId] = { name: itemName, ar: 0, views3d: 0, views: 0 }
          if (ev.event_type === 'ar_view') itemCounts[itemId].ar++
          if (ev.event_type === '3d_view') itemCounts[itemId].views3d++
          if (ev.event_type === 'item_view') itemCounts[itemId].views++
        }
      }

      const topItems = Object.entries(itemCounts)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => (b.ar + b.views3d) - (a.ar + a.views3d))
        .slice(0, 10)

      const revenue = (revenueRes.data ?? []).reduce((sum, o) => sum + Number(o.total_amount), 0)

      return {
        menuViews: counts['menu_view'] ?? 0,
        itemViews: counts['item_view'] ?? 0,
        arViews: counts['ar_view'] ?? 0,
        views3d: counts['3d_view'] ?? 0,
        orders: ordersRes.count ?? 0,
        revenue,
        activeItems: itemsRes.count ?? 0,
        topItems,
      }
    },
    enabled: !!restaurantId,
  })
}

// ─── RESTAURANT TABLES ────────────────────────────────────────────────────────

// Only returns active tables (.eq('is_active', true)) — soft-deleted tables are hidden.
export function useRestaurantTables(restaurantId: string) {
  return useQuery({
    queryKey: ['restaurant-tables', restaurantId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('table_number', { ascending: true })
      if (error) throw error
      return data as RestaurantTable[]
    },
    enabled: !!restaurantId,
  })
}

export function useCreateTable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ restaurantId, tableNumber }: { restaurantId: string; tableNumber: string }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('restaurant_tables')
        .insert({ restaurant_id: restaurantId, table_number: tableNumber })
        .select()
        .single()
      if (error) throw error
      return data as RestaurantTable
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-tables', data.restaurant_id] })
    },
  })
}

// Soft-delete: sets is_active=false rather than deleting the row. Preserves any
// historical analytics events or order records referencing this table number.
export function useDeleteTable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, restaurantId }: { id: string; restaurantId: string }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('restaurant_tables')
        .update({ is_active: false })
        .eq('id', id)
      if (error) throw error
      return restaurantId
    },
    onSuccess: (restaurantId) => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-tables', restaurantId] })
    },
  })
}
