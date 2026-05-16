'use client'

// AnalyticsClient — shows engagement metrics for the restaurant grouped by time period.
// Metrics come from the analytics_events table (each trackEvent() call inserts a row).
//
// Seven metric cards: orders, revenue, active items, menu views, item views, 3D views, AR views.
// The "Top items by AR & 3D" table shows which items got the most 3D/AR engagement.
//
// All data is fetched via useAnalytics — a single query that returns a pre-aggregated
// object from the admin queries file.

import { useState } from 'react'
import { Eye, Box, Scan, ShoppingBag, TrendingUp, UtensilsCrossed } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useAnalytics, type AnalyticsPeriod } from '@/lib/queries/admin'
import type { Restaurant } from '@/lib/types'

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: '7 days' },
  { value: 'month', label: '30 days' },
]

export default function AnalyticsClient({ restaurant }: { restaurant: Restaurant }) {
  const [period, setPeriod] = useState<AnalyticsPeriod>('today')
  const { data, isLoading } = useAnalytics(restaurant.id, period)

  return (
    <div className="px-4 pt-6 space-y-6">
      <h2 className="text-xl font-bold">Analytics</h2>

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

      {/* Metric cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => <Skeleton key={n} className="h-[88px] rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <MetricCard icon={<ShoppingBag className="w-4 h-4" />} label="Orders" value={data?.orders ?? 0} />
          <MetricCard icon={<TrendingUp className="w-4 h-4" />} label="Revenue" value={`PKR ${(data?.revenue ?? 0).toLocaleString()}`} />
          <MetricCard icon={<UtensilsCrossed className="w-4 h-4" />} label="Active items" value={data?.activeItems ?? 0} />
          <MetricCard icon={<Eye className="w-4 h-4" />} label="Menu views" value={data?.menuViews ?? 0} />
          <MetricCard icon={<Eye className="w-4 h-4" />} label="Item views" value={data?.itemViews ?? 0} />
          <MetricCard icon={<Box className="w-4 h-4" />} label="3D views" value={data?.views3d ?? 0} />
          <MetricCard icon={<Scan className="w-4 h-4" />} label="AR views" value={data?.arViews ?? 0} />
        </div>
      )}

      {/* Top items */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Top items by AR &amp; 3D
        </h3>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((n) => <Skeleton key={n} className="h-14 rounded-xl" />)}
          </div>
        ) : !data?.topItems.length ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No interactions yet in this period.
          </p>
        ) : (
          <div className="space-y-2">
            {data.topItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
              >
                <span className="font-medium text-sm truncate flex-1 mr-3">{item.name}</span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />{item.views}
                  </span>
                  <span className="flex items-center gap-1">
                    <Box className="w-3 h-3" />{item.views3d}
                  </span>
                  <span className="flex items-center gap-1">
                    <Scan className="w-3 h-3" />{item.ar}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  wide,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  wide?: boolean
}) {
  return (
    <div className={['rounded-xl border border-border bg-card px-3 py-3 flex flex-col gap-1', wide ? 'col-span-2' : ''].join(' ')}>
      <div className="text-muted-foreground">{icon}</div>
      <p className="text-xl font-bold leading-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
