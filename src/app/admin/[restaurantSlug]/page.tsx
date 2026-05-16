// Server Component — fetches the restaurant for the admin dashboard.
// The layout above already validated that the user is authenticated and authorised;
// this page just fetches the full restaurant row and passes it to AdminDashboardClient.
// Redirects to login if the restaurant lookup fails (e.g. the slug was deleted).

import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import AdminDashboardClient from './AdminDashboardClient'

export default async function AdminDashboardPage({
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

  return <AdminDashboardClient restaurant={restaurant} />
}
