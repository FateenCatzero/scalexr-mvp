import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { CartItem, Order, OrderWithItems } from '@/lib/types'

// Fetches a single order with all its items joined (including menu item names).
// No staleTime — uses the default (0), meaning every re-render triggers a
// background refetch. The dedicated order status page pairs this with a
// Supabase Realtime subscription that calls refetch() on every DB update.
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

// Input shape required to create a new order.
interface CreateOrderInput {
  restaurantId: string
  tableNumber: string
  customerName: string
  customerNote: string
  items: CartItem[]
}

// Fetches multiple orders by their IDs and polls every 15 seconds.
// Used in the customer's order history sheet (OrdersSheet) — they see
// all orders placed at this restaurant with live status updates.
// Polling (not Realtime) is used here because this query runs for multiple
// order IDs at once and isn't tied to a single live Realtime channel.
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
    refetchInterval: 15_000,  // poll every 15 seconds
  })
}

// Mutation to create a new order. Two sequential inserts:
//   1. Insert into `orders` to get the order ID
//   2. Insert all cart items into `order_items` using that ID
// The total_amount is calculated client-side from the cart items.
// On success, the 'orders-history' query cache is invalidated so the
// customer's order history refreshes immediately.
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

      // Step 1: create the order header row
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

      // Step 2: insert all cart items as order_items rows
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
      // Refresh the order history list so any open orders sheet updates
      queryClient.invalidateQueries({ queryKey: ['orders-history'] })
    },
  })
}
