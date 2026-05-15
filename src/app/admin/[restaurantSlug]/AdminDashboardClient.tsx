'use client'

import { useState } from 'react'
import { TrendingUp, ShoppingBag, UtensilsCrossed } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminStats, type StatPeriod } from '@/lib/queries/admin'
import { formatPrice, formatDistanceToNow } from '@/lib/utils'
import StatusBadge from '@/components/staff/StatusBadge'
import type { Restaurant } from '@/lib/types'

const PERIODS: { value: StatPeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'Last 30 days' },
]

export default function AdminDashboardClient({ restaurant }: { restaurant: Restaurant }) {
  const [period, setPeriod] = useState<StatPeriod>('today')
  const { data: stats, isLoading } = useAdminStats(restaurant.id, period)

  return (
    <div className="px-4 pt-6 space-y-6">
      {/* Period selector */}
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={[
              'flex-1 rounded-full py-1.5 text-xs font-medium transition-colors border',
              period === p.value
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {isLoading ? (
          [1, 2, 3].map((n) => <Skeleton key={n} className="h-20 rounded-xl" />)
        ) : (
          <>
            <StatCard
              icon={<ShoppingBag className="w-4 h-4" />}
              label="Orders"
              value={String(stats?.orders ?? 0)}
            />
            <StatCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="Revenue"
              value={formatPrice(stats?.revenue ?? 0)}
              small
            />
            <StatCard
              icon={<UtensilsCrossed className="w-4 h-4" />}
              label="Active items"
              value={String(stats?.activeItems ?? 0)}
            />
          </>
        )}
      </div>

      {/* Recent orders */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Recent orders
        </h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((n) => <Skeleton key={n} className="h-14 rounded-xl" />)}
          </div>
        ) : !stats?.recentOrders.length ? (
          <p className="text-sm text-muted-foreground text-center py-6">No orders in this period.</p>
        ) : (
          <div className="space-y-2">
            {stats.recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">#{order.id.slice(-6).toUpperCase()}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {order.table_number ? `Table ${order.table_number}` : order.customer_name ?? '—'}
                    {' · '}{formatDistanceToNow(order.created_at)}
                  </p>
                </div>
                <span className="font-semibold text-sm">{formatPrice(Number(order.total_amount))}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  icon, label, value, small,
}: {
  icon: React.ReactNode
  label: string
  value: string
  small?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-3 flex flex-col gap-1">
      <div className="text-muted-foreground">{icon}</div>
      <p className={['font-bold leading-tight', small ? 'text-sm' : 'text-xl'].join(' ')}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
