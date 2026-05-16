'use client'

// WaiterClient — real-time dashboard for floor staff (waiters).
// Organises orders into three sections:
//   1. "New orders" (pending) — waiter can Confirm or Cancel
//   2. "In kitchen" (confirmed + preparing) — read-only status display
//   3. "Ready to deliver" (ready) — waiter can mark as Delivered
//
// Supabase Realtime (postgres_changes on the orders table) invalidates TanStack Query's
// cache whenever any order changes for this restaurant — all three sections refresh
// automatically without polling.
//
// The EditOrderDrawer allows adjusting quantities or cancelling a new order,
// and is opened via the "Edit" button on a New Orders card.

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ClipboardList } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import OrderCard from '@/components/staff/OrderCard'
import EditOrderDrawer from '@/components/staff/EditOrderDrawer'
import { createClient } from '@/lib/supabase/client'
import { useOrdersByStatus, useUpdateOrderStatus, useStaffHeartbeat } from '@/lib/queries/staff'
import type { Restaurant, OrderWithItems } from '@/lib/types'

interface WaiterClientProps {
  restaurant: Restaurant
}

export default function WaiterClient({ restaurant }: WaiterClientProps) {
  const queryClient = useQueryClient()
  const updateStatus = useUpdateOrderStatus()
  // null = drawer closed; OrderWithItems = drawer open for that specific order.
  const [editingOrder, setEditingOrder] = useState<OrderWithItems | null>(null)

  // Heartbeat: updates last_active_at every 30s so the admin can see this
  // waiter as "online" in the staff management panel.
  useStaffHeartbeat(restaurant.id)

  // Three separate queries so each section shows its own loading skeleton.
  const { data: newOrders, isLoading: loadingNew } = useOrdersByStatus(
    restaurant.id, ['pending']
  )
  const { data: inProgress, isLoading: loadingProgress } = useOrdersByStatus(
    restaurant.id, ['confirmed', 'preparing']
  )
  const { data: readyOrders, isLoading: loadingReady } = useOrdersByStatus(
    restaurant.id, ['ready']
  )

  // Subscribe to all order events for this restaurant.
  // On any INSERT/UPDATE/DELETE, invalidate the ['orders', restaurant.id] query key
  // so all three status sections re-fetch in parallel.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`waiter-${restaurant.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `restaurant_id=eq.${restaurant.id}`,
      }, () => queryClient.invalidateQueries({ queryKey: ['orders', restaurant.id] }))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [restaurant.id, queryClient])

  const totalActive =
    (newOrders?.length ?? 0) +
    (inProgress?.length ?? 0) +
    (readyOrders?.length ?? 0)

  return (
    <div className="mx-auto max-w-lg min-h-screen px-4 pb-10">
      <div className="pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Waiter Dashboard</h1>
          <p className="text-sm text-muted-foreground">{restaurant.name}</p>
        </div>
        {totalActive > 0 && (
          <div className="flex items-center gap-1.5 bg-foreground text-background rounded-full px-3 py-1 text-sm font-medium">
            <ClipboardList className="w-4 h-4" />
            {totalActive}
          </div>
        )}
      </div>

      {/* New orders — needs confirmation */}
      <Section
        title="New orders"
        count={newOrders?.length}
        loading={loadingNew}
        empty="No new orders."
      >
        {newOrders?.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onEdit={() => setEditingOrder(order)}
            actions={[
              {
                label: 'Cancel',
                variant: 'danger',
                loading: updateStatus.isPending,
                requireConfirm: true,
                onClick: () => updateStatus.mutate({ orderId: order.id, status: 'cancelled', restaurantId: restaurant.id }),
              },
              {
                label: 'Confirm',
                loading: updateStatus.isPending,
                onClick: () => updateStatus.mutate({ orderId: order.id, status: 'confirmed', restaurantId: restaurant.id }),
              },
            ]}
          />
        ))}
      </Section>

      {/* In kitchen — read-only status view */}
      <Section
        title="In kitchen"
        count={inProgress?.length}
        loading={loadingProgress}
        empty="Nothing in kitchen yet."
      >
        {inProgress?.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            actions={[]}
          />
        ))}
      </Section>

      {/* Ready to deliver */}
      <Section
        title="Ready to deliver"
        count={readyOrders?.length}
        loading={loadingReady}
        empty="Nothing ready yet."
      >
        {readyOrders?.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            actions={[
              {
                label: 'Mark delivered',
                loading: updateStatus.isPending,
                requireConfirm: true,
                onClick: () => updateStatus.mutate({ orderId: order.id, status: 'delivered', restaurantId: restaurant.id }),
              },
            ]}
          />
        ))}
      </Section>

      <EditOrderDrawer
        order={editingOrder}
        open={!!editingOrder}
        onClose={() => setEditingOrder(null)}
        restaurantId={restaurant.id}
      />
    </div>
  )
}

// Section — reusable collapsible section with a title, count badge, skeleton loader,
// and empty-state message. Extracted to avoid repeating the same loading/empty logic
// three times in the main component.
function Section({
  title, count, loading, empty, children,
}: {
  title: string
  count?: number
  loading: boolean
  empty: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        {title}{count ? ` (${count})` : ''}
      </h2>
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((n) => <Skeleton key={n} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : !count ? (
        <p className="text-sm text-muted-foreground py-3 text-center">{empty}</p>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </section>
  )
}
