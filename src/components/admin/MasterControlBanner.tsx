'use client'

import Link from 'next/link'
import { ShieldCheck, ArrowLeft } from 'lucide-react'

export default function MasterControlBanner({ restaurantName }: { restaurantName: string }) {
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 truncate">
          Master Control · {restaurantName}
        </p>
      </div>
      <Link
        href="/admin/master"
        className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 hover:underline shrink-0"
      >
        <ArrowLeft className="w-3 h-3" />
        Back to master
      </Link>
    </div>
  )
}
