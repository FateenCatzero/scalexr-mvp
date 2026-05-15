'use client'

import { useState } from 'react'
import { ClipboardList, ChevronRight } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import OrderDetailSheet from './OrderDetailSheet'
import { useOrderStore } from '@/lib/store/orderStore'
import { useOrdersByIds } from '@/lib/queries/orders'
import { formatPrice } from '@/lib/utils'
import type { OrderStatus } from '@/lib/types'

interface OrdersSheetProps {
  open: boolean
  onClose: () => void
  restaurantSlug: string
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Awaiting confirmation',
  confirmed: 'Order confirmed',
  preparing: 'Being prepared',
  ready: 'Ready for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: 'text-yellow-600',
  confirmed: 'text-blue-600',
  preparing: 'text-orange-500',
  ready: 'text-green-600',
  delivered: 'text-muted-foreground',
  cancelled: 'text-destructive',
}

export default function OrdersSheet({ open, onClose, restaurantSlug }: OrdersSheetProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const { orders } = useOrderStore()
  const restaurantOrders = orders.filter((o) => o.restaurantSlug === restaurantSlug)
  const orderIds = restaurantOrders.map((o) => o.id)

  const { data: liveOrders, isLoading } = useOrdersByIds(orderIds)

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>Your orders</SheetTitle>
          </SheetHeader>

          {restaurantOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <ClipboardList className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">No orders yet.</p>
            </div>
          ) : isLoading ? (
            <div className="space-y-3 pb-4">
              {restaurantOrders.map((o) => (
                <Skeleton key={o.id} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {(liveOrders ?? []).map((order) => {
                const status = order.status as OrderStatus
                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className="w-full text-left rounded-xl border border-border bg-card p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-sm">
                            #{order.id.slice(-6).toUpperCase()}
                          </span>
                          {order.table_number && (
                            <span className="text-xs text-muted-foreground">
                              Table {order.table_number}
                            </span>
                          )}
                        </div>
                        <p className={`text-sm font-medium ${STATUS_COLOR[status]}`}>
                          {STATUS_LABEL[status]}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {order.order_items
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            .map((i: any) =>
                              `${i.menu_items?.name ?? i.menu_items?.[0]?.name ?? 'Deleted item'} ×${i.quantity}`
                            )
                            .join(', ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-sm font-semibold">
                          {formatPrice(Number(order.total_amount))}
                        </span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <OrderDetailSheet
        orderId={selectedOrderId}
        open={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    </>
  )
}
