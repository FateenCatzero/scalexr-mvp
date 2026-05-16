import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Category, MenuItem, MenuItemWithAssets } from '@/lib/types'

// Fetches all active categories for a restaurant, ordered by sort_order.
// staleTime: 5 minutes — categories change rarely, so we avoid unnecessary
// refetches while the customer is browsing the menu.
export function useCategories(restaurantId: string) {
  return useQuery({
    queryKey: ['categories', restaurantId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return data as Category[]
    },
    enabled: !!restaurantId,
    staleTime: 5 * 60 * 1000,
  })
}

// Fetches all available menu items for a restaurant, optionally filtered by
// a category ID. `is_available = true` means the item is shown on the menu;
// items set to unavailable are hidden entirely from customers.
// When categoryId is null/undefined, all items across all categories are returned.
// staleTime: 2 minutes — items change less often than orders but more often
// than categories, so a slightly shorter cache window is appropriate.
export function useMenuItems(restaurantId: string, categoryId?: string | null) {
  return useQuery({
    queryKey: ['menu_items', restaurantId, categoryId ?? 'all'],
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_available', true)
        .order('sort_order')
      if (categoryId) query = query.eq('category_id', categoryId)
      const { data, error } = await query
      if (error) throw error
      return data as MenuItem[]
    },
    enabled: !!restaurantId,
    staleTime: 2 * 60 * 1000,
  })
}

// Fetches a single menu item with all its associated assets joined in.
// The `item_assets` relation includes GLB and USDZ URLs needed for the
// 3D viewer and AR launcher on the item detail page.
// staleTime: 5 minutes — model URLs don't change frequently.
export function useMenuItem(itemId: string) {
  return useQuery({
    queryKey: ['menu_item', itemId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('menu_items')
        .select('*, item_assets(*)')
        .eq('id', itemId)
        .single()
      if (error) throw error
      return data as MenuItemWithAssets
    },
    enabled: !!itemId,
    staleTime: 5 * 60 * 1000,
  })
}
