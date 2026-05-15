'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, UtensilsCrossed, Settings, LogOut, BarChart2, QrCode } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface AdminNavProps {
  restaurantSlug: string
}

export default function AdminNav({ restaurantSlug }: AdminNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  const tabs = [
    { label: 'Dashboard', href: `/admin/${restaurantSlug}`, icon: LayoutDashboard },
    { label: 'Menu', href: `/admin/${restaurantSlug}/menu`, icon: UtensilsCrossed },
    { label: 'Analytics', href: `/admin/${restaurantSlug}/analytics`, icon: BarChart2 },
    { label: 'Tables', href: `/admin/${restaurantSlug}/tables`, icon: QrCode },
    { label: 'Settings', href: `/admin/${restaurantSlug}/settings`, icon: Settings },
  ]

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 bg-background border-t border-border">
      <div className="max-w-lg mx-auto flex items-center">
        {tabs.map(({ label, href, icon: Icon }) => {
          const active = href === `/admin/${restaurantSlug}`
            ? pathname === href
            : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors',
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          )
        })}
        <button
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </nav>
  )
}
