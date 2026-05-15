'use client'

import { useEffect, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useUpdateOrderItems, useUpdateOrderStatus } from '@/lib/queries/staff'
import { formatPrice } from '@/lib/utils'
import type { OrderWithItems } from '@/lib/types'

interface EditOrderDrawerProps {
  order: OrderWithItems | null
  open: boolean
  onClose: () => void
}

export default function EditOrderDrawer({ order, open, onClose }: EditOrderDrawerProps) {
  const updateItems = useUpdateOrderItems()
  const updateStatus = useUpdateOrderStatus()

  const [quantities, setQuantities] = useState<Record<string, number>>({})

  // Re-sync quantities whenever the order changes or drawer opens
  useEffect(() => {
    if (order) {
      setQuantities(
        Object.fromEntries(order.order_items.map((i) => [i.id, i.quantity]))
      )
    }
  }, [order?.id, open])

  const handleSave = async () => {
    if (!order) return
    await updateItems.mutateAsync({
      orderId: order.id,
      itemUpdates: Object.entries(quantities).map(([id, quantity]) => ({ id, quantity })),
    })
    onClose()
  }

  const handleCancel = async () => {
    if (!order) return
    await updateStatus.mutateAsync({ orderId: order.id, status: 'cancelled' })
    onClose()
  }

  const total = order?.order_items.reduce((sum, item) => {
    return sum + (quantities[item.id] ?? 0) * item.unit_price
  }, 0) ?? 0

  const hasChanges = order?.order_items.some((i) => quantities[i.id] !== i.quantity)

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto px-4">
        <SheetHeader className="pb-4">
          <SheetTitle>
            Edit order #{order?.id.slice(-6).toUpperCase()}
          </SheetTitle>
        </SheetHeader>

        {order && (
          <>
            <div className="space-y-4">
              {order.order_items.map((item) => {
                const qty = quantities[item.id] ?? 0
                return (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.menu_items.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(item.unit_price)} each
                        {qty === 0 && (
                          <span className="text-destructive ml-1">· will remove</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() =>
                          setQuantities((q) => ({
                            ...q,
                            [item.id]: Math.max(0, (q[item.id] ?? 1) - 1),
                          }))
                        }
                        className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-muted transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span
                        className={[
                          'w-6 text-center font-medium tabular-nums',
                          qty === 0 ? 'text-destructive line-through' : '',
                        ].join(' ')}
                      >
                        {qty}
                      </span>
                      <button
                        onClick={() =>
                          setQuantities((q) => ({
                            ...q,
                            [item.id]: (q[item.id] ?? 0) + 1,
                          }))
                        }
                        className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-muted transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <Separator className="my-4" />

            <div className="flex justify-between font-semibold mb-5">
              <span>New total</span>
              <span>{formatPrice(total)}</span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
                onClick={handleCancel}
                disabled={updateStatus.isPending}
              >
                Cancel order
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={!hasChanges || updateItems.isPending}
              >
                {updateItems.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>

            {(updateItems.isError || updateStatus.isError) && (
              <p className="text-xs text-destructive text-center mt-3">
                Something went wrong. Please try again.
              </p>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
