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
