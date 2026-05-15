import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Restaurant } from '@/lib/types'

export function useRestaurant(slug: string) {
  return useQuery({
    queryKey: ['restaurant', slug],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()
      if (error) throw error
      return data as Restaurant
    },
    staleTime: 5 * 60 * 1000,
  })
}
