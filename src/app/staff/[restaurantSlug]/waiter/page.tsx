// Server Component — fetches the restaurant for the waiter dashboard.
// Auth and role checks are handled by the parent layout at
// /staff/[restaurantSlug]/layout.tsx — by the time this page runs, the user
// is verified to have a valid staff role for this restaurant.
// Restaurant not found → 404 (slug mismatch after the layout passed means
// the restaurant was just deactivated — rare but handled cleanly).

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import WaiterClient from './WaiterClient'
import type { Restaurant } from '@/lib/types'

type Props = { params: Promise<{ restaurantSlug: string }> }

export default async function WaiterPage({ params }: Props) {
  const { restaurantSlug } = await params
  const supabase = await createClient()
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', restaurantSlug)
    .single()

  if (!restaurant) notFound()

  return <WaiterClient restaurant={restaurant as Restaurant} />
}
