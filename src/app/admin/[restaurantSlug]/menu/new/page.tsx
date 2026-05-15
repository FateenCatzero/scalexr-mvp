import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import NewItemClient from './NewItemClient'

export default async function NewItemPage({
  params,
}: {
  params: Promise<{ restaurantSlug: string }>
}) {
  const { restaurantSlug } = await params
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', restaurantSlug)
    .single()

  if (!restaurant) redirect('/admin/login')

  return <NewItemClient restaurant={restaurant} />
}
