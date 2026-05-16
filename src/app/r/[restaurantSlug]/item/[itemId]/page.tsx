// Server Component — fetches the menu item (with its 3D/image assets) on the server
// and passes it to ItemDetailClient. Fetching here avoids a client-side loading state
// for the main content; the page appears fully rendered on first load.
//
// The `*, item_assets(*)` select fetches the item row plus all its related asset rows
// (GLB, USDZ, thumbnail) via Supabase's embedded relationship syntax.

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ItemDetailClient from './ItemDetailClient'
import type { MenuItemWithAssets } from '@/lib/types'

type Props = {
  params: Promise<{ restaurantSlug: string; itemId: string }>
}

// Sets the browser tab title to the item name for SEO and usability.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { itemId } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('menu_items')
    .select('name')
    .eq('id', itemId)
    .single()
  return { title: data?.name ?? 'Item' }
}

export default async function ItemDetailPage({ params }: Props) {
  const { restaurantSlug, itemId } = await params

  const supabase = await createClient()
  const { data: item } = await supabase
    .from('menu_items')
    .select('*, item_assets(*)')  // joins item_assets rows into the item object
    .eq('id', itemId)
    .single()

  if (!item) notFound()

  return (
    <ItemDetailClient
      item={item as MenuItemWithAssets}
      restaurantSlug={restaurantSlug}
    />
  )
}
