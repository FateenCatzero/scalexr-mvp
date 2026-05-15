'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle2, Clock, ChefHat, Bell, Package } from 'lucide-react'
import MobileShell from '@/components/layout/MobileShell'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrder } from '@/lib/queries/orders'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'
import type { OrderStatus } from '@/lib/types'

type StatusConfig = {
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  pending: {
    label: 'Order received',
    icon: Clock,
    description: 'Your order has been placed and is awaiting confirmation.',
  },
  confirmed: {
    label: 'Order confirmed',
    icon: CheckCircle2,
    description: 'The restaurant has confirmed your order.',
  },
  preparing: {
    label: 'Being prepared',
    icon: ChefHat,
    description: 'The kitchen is preparing your food.',
  },
  ready: {
    label: 'Ready!',
    icon: Bell,
    description: 'Your order is ready. A waiter will bring it to you shortly.',
  },
  delivered: {
    label: 'Delivered',
    icon: Package,
    description: 'Enjoy your meal!',
  },
  cancelled: {
    label: 'Cancelled',
    icon: Clock,
    description: 'This order was cancelled. Please speak to staff.',
  },
}

const PROGRESS_STEPS: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'delivered',
]

export default function OrderStatusPage() {
  const params = useParams<{ restaurantSlug: string; orderId: string }>()
  const { data: order, isLoading, refetch } = useOrder(params.orderId)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`order-${params.orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${params.orderId}`,
        },
        () => refetch()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [params.orderId, refetch])

  if (isLoading) {
    return (
      <MobileShell className="px-4 pt-10">
        <Skeleton className="w-16 h-16 rounded-full mx-auto mb-4" />
        <Skeleton className="h-7 w-48 mx-auto mb-2" />
        <Skeleton className="h-4 w-64 mx-auto" />
      </MobileShell>
    )
  }

  if (!order) {
    return (
      <MobileShell className="px-4 pt-10 text-center">
        <p className="text-muted-foreground">Order not found.</p>
      </MobileShell>
    )
  }

  const config = STATUS_CONFIG[order.status]
  const Icon = config.icon
  const currentStep = PROGRESS_STEPS.indexOf(order.status)

  return (
    <MobileShell className="px-4 pt-10">
      {/* Status icon + text */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-foreground/10 flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold">{config.label}</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          {config.description}
        </p>
        {order.customer_name && (
          <p className="text-sm mt-1 font-medium">{order.customer_name}</p>
        )}
        {order.table_number && (
          <p className="text-sm text-muted-foreground">
            Table {order.table_number}
          </p>
        )}
      </div>

      {/* Progress steps */}
      {order.status !== 'cancelled' && (
        <div className="mt-8 flex items-center gap-1.5">
          {PROGRESS_STEPS.slice(0, -1).map((s, i) => (
            <div
              key={s}
              className={[
                'h-1.5 flex-1 rounded-full transition-all duration-500',
                i < currentStep
                  ? 'bg-foreground'
                  : i === currentStep
                  ? 'bg-foreground/40'
                  : 'bg-muted',
              ].join(' ')}
            />
          ))}
        </div>
      )}

      {/* Order items */}
      <div className="mt-8">
        <h2 className="font-semibold mb-3">
          Order #{order.id.slice(-6).toUpperCase()}
        </h2>
        <div className="space-y-2">
          {order.order_items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {item.menu_items.name} × {item.quantity}
              </span>
              <span>{formatPrice(Number(item.subtotal))}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between font-semibold mt-3 pt-3 border-t border-border">
          <span>Total</span>
          <span>{formatPrice(Number(order.total_amount))}</span>
        </div>
      </div>
    </MobileShell>
  )
}
