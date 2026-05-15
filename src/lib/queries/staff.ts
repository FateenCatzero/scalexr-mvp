import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { OrderStatus, OrderWithItems } from '@/lib/types'

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

      const toDelete = itemUpdates.filter((i) => i.quantity <= 0).map((i) => i.id)
      const toUpdate = itemUpdates.filter((i) => i.quantity > 0)

      if (toDelete.length > 0) {
        const { error } = await supabase
          .from('order_items')
          .delete()
          .in('id', toDelete)
        if (error) throw error
      }

      for (const { id, quantity } of toUpdate) {
        const { error } = await supabase
          .from('order_items')
          .update({ quantity })
          .eq('id', id)
        if (error) throw error
      }

      // Recalculate order total from remaining items
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
