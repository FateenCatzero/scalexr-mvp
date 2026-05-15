import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import MasterNav from '@/components/admin/MasterNav'

export default async function MasterAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'master_admin') redirect('/admin/login')

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">ScaleXR</p>
          <h1 className="font-bold leading-tight">Master Admin</h1>
        </div>
      </header>
      <main className="pb-20 max-w-lg mx-auto">
        {children}
      </main>
      <MasterNav />
    </div>
  )
}
