'use client'

import { CheckCircle2, Clock, ChefHat, Bell, Package } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrder } from '@/lib/queries/orders'
import { formatPrice } from '@/lib/utils'
import type { OrderStatus } from '@/lib/types'

interface OrderDetailSheetProps {
  orderId: string | null
  open: boolean
  onClose: () => void
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

const STATUS_ICON: Record<OrderStatus, React.ComponentType<{ className?: string }>> = {
  pending: Clock,
  confirmed: CheckCircle2,
  preparing: ChefHat,
  ready: Bell,
  delivered: Package,
  cancelled: Clock,
}

const PROGRESS_STEPS: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'delivered']

export default function OrderDetailSheet({ orderId, open, onClose }: OrderDetailSheetProps) {
  const { data: order, isLoading } = useOrder(orderId ?? '')

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm w-full rounded-2xl">
        <DialogHeader>
          <DialogTitle>
            {order ? `Order #${order.id.slice(-6).toUpperCase()}` : 'Order details'}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 pt-1">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : order ? (
          <div>
            {/* Status */}
            <div className="flex items-center gap-3 mb-5">
              {(() => {
                const Icon = STATUS_ICON[order.status]
                return (
                  <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                )
              })()}
              <div>
                <p className={`font-semibold ${STATUS_COLOR[order.status]}`}>
                  {STATUS_LABEL[order.status]}
                </p>
                {order.table_number && (
                  <p className="text-xs text-muted-foreground">Table {order.table_number}</p>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {order.status !== 'cancelled' && (
              <div className="flex items-center gap-1.5 mb-6">
                {PROGRESS_STEPS.slice(0, -1).map((s, i) => {
                  const current = PROGRESS_STEPS.indexOf(order.status)
                  return (
                    <div
                      key={s}
                      className={[
                        'h-1.5 flex-1 rounded-full transition-all duration-500',
                        i < current
                          ? 'bg-foreground'
                          : i === current
                          ? 'bg-foreground/40'
                          : 'bg-muted',
                      ].join(' ')}
                    />
                  )
                })}
              </div>
            )}

            {/* Items */}
            <div className="space-y-2 mb-4">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.menu_items.name} × {item.quantity}
                  </span>
                  <span>{formatPrice(Number(item.unit_price) * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between font-semibold pt-3 border-t border-border">
              <span>Total</span>
              <span>{formatPrice(Number(order.total_amount))}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">Order not found.</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
