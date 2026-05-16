// Server Component — fetches the restaurant for the kitchen display.
// Auth and role checks are handled by the parent layout at
// /staff/[restaurantSlug]/layout.tsx — by the time this page runs, the user
// is verified to have a valid staff role for this restaurant.

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import KitchenClient from './KitchenClient'
import type { Restaurant } from '@/lib/types'

type Props = { params: Promise<{ restaurantSlug: string }> }

export default async function KitchenPage({ params }: Props) {
  const { restaurantSlug } = await params
  const supabase = await createClient()
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', restaurantSlug)
    .single()

  if (!restaurant) notFound()

  return <KitchenClient restaurant={restaurant as Restaurant} />
}
