import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { OrderStatus, OrderWithItems } from '@/lib/types'

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
// On success invalidates all 'orders' queries for the restaurant so all
// dashboard sections (new/in-kitchen/ready) refresh simultaneously.
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string
      status: OrderStatus
    }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
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
