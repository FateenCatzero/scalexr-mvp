import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Restaurant } from '@/lib/types'

// Fetches a single active restaurant by its URL slug.
// Used in CheckoutClient to get the restaurant's ID before creating an order.
// Note: the server components (page.tsx files) fetch the restaurant directly
// via the Supabase server client — this hook is only used in client components
// that need to re-fetch the restaurant after hydration.
// staleTime: 5 minutes — restaurant name/description rarely changes mid-session.
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
