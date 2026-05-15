import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ItemDetailClient from './ItemDetailClient'
import type { MenuItemWithAssets } from '@/lib/types'

type Props = {
  params: Promise<{ restaurantSlug: string; itemId: string }>
}

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
    .select('*, item_assets(*)')
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
