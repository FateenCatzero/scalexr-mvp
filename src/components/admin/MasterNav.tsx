'use client'

// MasterNav — fixed bottom tab bar for the master admin area.
// Only two tabs: Restaurants (list of all restaurants) and Logs (audit trail).
// Active state uses exact pathname match since there's no deep nesting under these routes.

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, ClipboardList, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const TABS = [
  { href: '/admin/master', icon: LayoutDashboard, label: 'Restaurants' },
  { href: '/admin/master/logs', icon: ClipboardList, label: 'Logs' },
]

export default function MasterNav() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-10">
      <div className="flex max-w-lg mx-auto">
        {TABS.map((tab) => {
          const active = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={[
                'flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </Link>
          )
        })}
        <button
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </nav>
  )
}
