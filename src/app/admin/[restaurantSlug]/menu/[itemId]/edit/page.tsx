// Server Component — fetches both the restaurant and the specific menu item in parallel,
// then passes them to EditItemClient. Redirects to the menu list if either is missing
// (e.g., item was deleted or the slug/id don't belong to each other).
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import EditItemClient from './EditItemClient'

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ restaurantSlug: string; itemId: string }>
}) {
  const { restaurantSlug, itemId } = await params
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const [{ data: restaurant }, { data: item }] = await Promise.all([
    supabase.from('restaurants').select('*').eq('slug', restaurantSlug).single(),
    supabase.from('menu_items').select('*').eq('id', itemId).single(),
  ])

  if (!restaurant || !item) redirect(`/admin/${restaurantSlug}/menu`)

  return <EditItemClient restaurant={restaurant} item={item} />
}
