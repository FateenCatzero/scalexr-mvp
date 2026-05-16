import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import MenuPageClient from './MenuPageClient'
import type { Restaurant } from '@/lib/types'

type Props = {
  params: Promise<{ restaurantSlug: string }>
  // table: injected by the QR code URL (?table=5) — pre-fills checkout form
  // orderId: injected after checkout (?orderId=xxx) — auto-opens order status modal
  searchParams: Promise<{ table?: string; orderId?: string }>
}

// Server-side metadata — sets the browser tab title to the restaurant's name.
// Falls back to "Menu" if the restaurant isn't found (before notFound() fires).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { restaurantSlug } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('restaurants')
    .select('name')
    .eq('slug', restaurantSlug)
    .single()
  return { title: data?.name ?? 'Menu' }
}

// Server Component — entry point for the customer-facing menu page.
// Fetches the restaurant from Supabase on the server so the first render
// already contains the restaurant name and description (no loading flicker).
// Only active restaurants (is_active = true) are served — suspended restaurants
// trigger a 404.
export default async function MenuPage({ params, searchParams }: Props) {
  const { restaurantSlug } = await params
  const { table, orderId } = await searchParams

  const supabase = await createClient()
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', restaurantSlug)
    .eq('is_active', true)
    .single()

  if (!restaurant) notFound()

  return (
    <MenuPageClient
      restaurant={restaurant as Restaurant}
      tableNumber={table}       // forwarded from QR code param
      confirmedOrderId={orderId} // forwarded after successful checkout
    />
  )
}
