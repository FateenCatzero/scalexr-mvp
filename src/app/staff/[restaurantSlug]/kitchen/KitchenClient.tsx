'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ChefHat } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import OrderCard from '@/components/staff/OrderCard'
import { createClient } from '@/lib/supabase/client'
import { useOrdersByStatus, useUpdateOrderStatus } from '@/lib/queries/staff'
import type { Restaurant } from '@/lib/types'

interface KitchenClientProps {
  restaurant: Restaurant
}

export default function KitchenClient({ restaurant }: KitchenClientProps) {
  const queryClient = useQueryClient()
  const updateStatus = useUpdateOrderStatus()

  const { data: queue, isLoading: loadingQueue } = useOrdersByStatus(
    restaurant.id,
    ['confirmed']
  )
  const { data: inProgress, isLoading: loadingInProgress } = useOrdersByStatus(
    restaurant.id,
    ['preparing']
  )

  // Real-time: refetch on any order change for this restaurant
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`kitchen-${restaurant.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ['orders', restaurant.id] })
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [restaurant.id, queryClient])

  const totalActive = (queue?.length ?? 0) + (inProgress?.length ?? 0)

  return (
    <div className="mx-auto max-w-lg min-h-screen px-4 pb-10">
      {/* Header */}
      <div className="pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ChefHat className="w-5 h-5" />
            Kitchen
          </h1>
          <p className="text-sm text-muted-foreground">{restaurant.name}</p>
        </div>
        {totalActive > 0 && (
          <div className="bg-orange-500 text-white rounded-full px-3 py-1 text-sm font-bold">
            {totalActive} active
          </div>
        )}
      </div>

      {/* In progress section */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          In progress{inProgress?.length ? ` (${inProgress.length})` : ''}
        </h2>

        {loadingInProgress ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : inProgress?.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nothing cooking yet.
          </p>
        ) : (
          <div className="space-y-3">
            {inProgress?.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                actions={[
                  {
                    label: 'Mark ready',
                    loading: updateStatus.isPending,
                    onClick: () =>
                      updateStatus.mutate({ orderId: order.id, status: 'ready' }),
                  },
                ]}
              />
            ))}
          </div>
        )}
      </section>

      {/* Incoming queue section */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Incoming queue{queue?.length ? ` (${queue.length})` : ''}
        </h2>

        {loadingQueue ? (
          <div className="space-y-3">
            {[1, 2].map((n) => <Skeleton key={n} className="h-32 w-full rounded-xl" />)}
          </div>
        ) : queue?.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Queue is empty.
          </p>
        ) : (
          <div className="space-y-3">
            {queue?.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                actions={[
                  {
                    label: 'Start preparing',
                    loading: updateStatus.isPending,
                    onClick: () =>
                      updateStatus.mutate({ orderId: order.id, status: 'preparing' }),
                  },
                ]}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
