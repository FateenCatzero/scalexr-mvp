import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { OrderStatus, OrderWithItems, PerformanceCounter } from '@/lib/types'

// Maps an order status transition to the performance counter that should be
// incremented for the staff member who triggered it.
// 'ready' is counted as orders_delivered from the kitchen's perspective.
// 'pending' (cancelling a not-yet-confirmed order) maps to orders_cancelled.
const STATUS_TO_COUNTER: Partial<Record<OrderStatus, PerformanceCounter>> = {
  confirmed: 'orders_confirmed',
  preparing: 'orders_preparing',
  ready:     'orders_delivered',
  delivered: 'orders_delivered',
  cancelled: 'orders_cancelled',
}

// Fetches all orders for a restaurant that match any of the given statuses.
// Orders are sorted oldest-first so staff process them in arrival order.
// No staleTime set — refetches on focus and on Realtime events.
// Used by both WaiterClient and KitchenClient to show their respective queues.
export function useOrdersByStatus(
  restaurantId: string,
  statuses: OrderStatus[]
) {
  return useQuery({
    queryKey: ['orders', restaurantId, statuses],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, menu_items(name, image_url))')
        .eq('restaurant_id', restaurantId)
        .in('status', statuses)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as OrderWithItems[]
    },
    enabled: !!restaurantId,
  })
}

// Mutation to change an order's status. Used by both waiter and kitchen.
//
// After updating the order status in the orders table, it fires a
// fire-and-forget call to increment_staff_performance() so the acting staff
// member's counter (confirmed / preparing / delivered / cancelled) goes up by 1.
// The performance increment is best-effort — a failure does NOT roll back the
// order status update, ensuring the main workflow is never blocked by stats.
//
// restaurantId is required to scope the performance update to the correct restaurant.
//
// On success invalidates all 'orders' queries for the restaurant so all
// dashboard sections (new/in-kitchen/ready) refresh simultaneously.
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      orderId,
      status,
      restaurantId,
    }: {
      orderId: string
      status: OrderStatus
      restaurantId: string
    }) => {
      const supabase = createClient()

      // Primary operation: update the order status
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
      if (error) throw error

      // Secondary operation: increment the staff performance counter.
      // Runs after the primary succeeds. Failure is swallowed so it never
      // blocks the waiter/kitchen workflow.
      const counter = STATUS_TO_COUNTER[status]
      if (counter) {
        supabase
          .rpc('increment_staff_performance', {
            p_restaurant_id: restaurantId,
            p_counter:       counter,
          })
          .then(({ error: rpcErr }) => {
            if (rpcErr) console.warn('[staff perf]', rpcErr.message)
          })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

// Heartbeat hook — call this inside any staff dashboard component.
// Sends a ping to upsert_staff_activity() immediately on mount, then every
// 30 seconds while the tab is open. Cleans up on unmount (tab close or
// navigation away from the staff route).
//
// "Online" is inferred server-side as last_active_at > now() - '3 minutes'.
// A 30-second interval gives a ~6× safety margin before the threshold.
export function useStaffHeartbeat(restaurantId: string) {
  useEffect(() => {
    if (!restaurantId) return

    const supabase = createClient()
    let cancelled = false

    const ping = () => {
      if (cancelled) return
      supabase
        .rpc('upsert_staff_activity', { p_restaurant_id: restaurantId })
        .then(({ error }) => {
          if (error) console.warn('[heartbeat]', error.message)
        })
    }

    // Fire immediately so the admin sees this user as online the moment they
    // load the dashboard, not up to 30 seconds later.
    ping()

    const interval = setInterval(ping, 30_000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [restaurantId])
}

// Mutation to edit individual items within a pending order.
// Used by the waiter's EditOrderDrawer before confirming an order.
//
// The update logic:
//   - Items with quantity ≤ 0 are deleted from order_items
//   - Items with quantity > 0 are updated with the new quantity
//   - After all item changes, the order's total_amount is recalculated
//     by summing the remaining items from the DB (source of truth)
export function useUpdateOrderItems() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      orderId,
      itemUpdates,
    }: {
      orderId: string
      itemUpdates: { id: string; quantity: number }[]
    }) => {
      const supabase = createClient()

      // Split updates into deletions (qty=0) and modifications (qty>0)
      const toDelete = itemUpdates.filter((i) => i.quantity <= 0).map((i) => i.id)
      const toUpdate = itemUpdates.filter((i) => i.quantity > 0)

      if (toDelete.length > 0) {
        const { error } = await supabase
          .from('order_items')
          .delete()
          .in('id', toDelete)
        if (error) throw error
      }

      // Update each remaining item individually (Supabase doesn't support
      // bulk updates with different values per row in a single call)
      for (const { id, quantity } of toUpdate) {
        const { error } = await supabase
          .from('order_items')
          .update({ quantity })
          .eq('id', id)
        if (error) throw error
      }

      // Recalculate order total from remaining items after all changes
      const { data: remaining } = await supabase
        .from('order_items')
        .select('quantity, unit_price')
        .eq('order_id', orderId)

      const total = (remaining ?? []).reduce(
        (sum, i) => sum + i.quantity * i.unit_price,
        0
      )
      await supabase
        .from('orders')
        .update({ total_amount: total })
        .eq('id', orderId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
