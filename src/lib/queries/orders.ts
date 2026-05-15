import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { CartItem, Order, OrderWithItems } from '@/lib/types'

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, menu_items(name, image_url))')
        .eq('id', orderId)
        .single()
      if (error) throw error
      return data as OrderWithItems
    },
    enabled: !!orderId,
  })
}

interface CreateOrderInput {
  restaurantId: string
  tableNumber: string
  customerName: string
  customerNote: string
  items: CartItem[]
}

export function useOrdersByIds(orderIds: string[]) {
  return useQuery({
    queryKey: ['orders-history', orderIds],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('orders')
        .select('id, status, total_amount, created_at, table_number, order_items(quantity, menu_items(name))')
        .in('id', orderIds)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: orderIds.length > 0,
    refetchInterval: 15_000,
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      restaurantId,
      tableNumber,
      customerName,
      customerNote,
      items,
    }: CreateOrderInput) => {
      const supabase = createClient()
      const totalAmount = items.reduce(
        (sum, i) => sum + i.menuItem.price * i.quantity,
        0
      )

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurantId,
          table_number: tableNumber || null,
          customer_name: customerName || null,
          customer_note: customerNote || null,
          total_amount: totalAmount,
        })
        .select()
        .single()

      if (orderError) throw orderError

      const { error: itemsError } = await supabase.from('order_items').insert(
        items.map((i) => ({
          order_id: order.id,
          menu_item_id: i.menuItem.id,
          quantity: i.quantity,
          unit_price: i.menuItem.price,
          notes: i.notes ?? null,
        }))
      )

      if (itemsError) throw itemsError

      return order as Order
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders-history'] })
    },
  })
}
