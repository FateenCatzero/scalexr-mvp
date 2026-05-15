import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Category, MenuItem, MenuItemWithAssets } from '@/lib/types'

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
