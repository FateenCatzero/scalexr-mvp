import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import MenuPageClient from './MenuPageClient'
import type { Restaurant } from '@/lib/types'

type Props = {
  params: Promise<{ restaurantSlug: string }>
  searchParams: Promise<{ table?: string }>
}

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

export default async function MenuPage({ params, searchParams }: Props) {
  const { restaurantSlug } = await params
  const { table } = await searchParams

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
      tableNumber={table}
    />
  )
}
