// Server Component — fetches the restaurant row and renders StaffClient.
// Auth is enforced by the parent layout at /admin/[restaurantSlug]/layout.tsx.
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import StaffClient from './StaffClient'

export default async function StaffPage({
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
    .select('id, name, slug')
    .eq('slug', restaurantSlug)
    .single()

  if (!restaurant) redirect('/admin/login')

  return <StaffClient restaurant={restaurant} />
}
