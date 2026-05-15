'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import MobileShell from '@/components/layout/MobileShell'
import { useCartStore } from '@/lib/store/cartStore'
import { useOrderStore } from '@/lib/store/orderStore'
import { useCreateOrder } from '@/lib/queries/orders'
import { useRestaurant } from '@/lib/queries/restaurant'
import { formatPrice } from '@/lib/utils'
import OrderDetailSheet from '@/components/customer/OrderDetailSheet'

const schema = z.object({
  customerName: z.string().min(1, 'Name is required'),
  tableNumber: z.string().min(1, 'Table number is required'),
  customerNote: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface CheckoutClientProps {
  restaurantSlug: string
  tableFromQR: string
}

export default function CheckoutClient({
  restaurantSlug,
  tableFromQR,
}: CheckoutClientProps) {
  const router = useRouter()
  const { items, getTotal, clearCart } = useCartStore()
  const addOrder = useOrderStore((s) => s.addOrder)
  const { data: restaurant } = useRestaurant(restaurantSlug)
  const createOrder = useCreateOrder()
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tableNumber: tableFromQR },
  })

  useEffect(() => {
    if (items.length === 0) router.replace(`/r/${restaurantSlug}`)
  }, [items.length, restaurantSlug, router])

  const onSubmit = async (data: FormData) => {
    if (!restaurant || items.length === 0) return
    const order = await createOrder.mutateAsync({
      restaurantId: restaurant.id,
      tableNumber: data.tableNumber,
      customerName: data.customerName,
      customerNote: data.customerNote ?? '',
      items,
    })
    clearCart()
    addOrder({ id: order.id, restaurantSlug, createdAt: order.created_at })
    toast.success('Order placed!')
    setConfirmedOrderId(order.id)
  }

  if (items.length === 0 && !confirmedOrderId) return null

  return (
    <>
    <OrderDetailSheet
      orderId={confirmedOrderId}
      open={!!confirmedOrderId}
      onClose={() => router.push(`/r/${restaurantSlug}`)}
    />
    <MobileShell className="px-4">
      <div className="pt-4 pb-2 flex items-center gap-2">
        <Link
          href={`/r/${restaurantSlug}/cart`}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">Place Order</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4 pb-10">
        <div>
          <label className="text-sm font-medium block mb-1.5">Your name</label>
          <input
            {...register('customerName')}
            placeholder="e.g. John"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
          />
          {errors.customerName && (
            <p className="text-xs text-destructive mt-1">
              {errors.customerName.message}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium">Table number</label>
            {tableFromQR && (
              <span className="text-xs text-muted-foreground">From QR code — you can change this</span>
            )}
          </div>
          <input
            {...register('tableNumber')}
            placeholder="e.g. 5"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
          />
          {errors.tableNumber && (
            <p className="text-xs text-destructive mt-1">
              {errors.tableNumber.message}
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium block mb-1.5">
            Special requests{' '}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <textarea
            {...register('customerNote')}
            placeholder="Allergies, preferences..."
            rows={3}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-foreground/20 resize-none"
          />
        </div>

        <Separator />

        <div>
          <h2 className="font-semibold mb-3">Order summary</h2>
          <div className="space-y-2">
            {items.map(({ menuItem, quantity }) => (
              <div key={menuItem.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {menuItem.name} × {quantity}
                </span>
                <span>{formatPrice(menuItem.price * quantity)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-semibold mt-3 pt-3 border-t border-border">
            <span>Total</span>
            <span>{formatPrice(getTotal())}</span>
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={createOrder.isPending}
        >
          {createOrder.isPending
            ? 'Placing order…'
            : `Place order — ${formatPrice(getTotal())}`}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          A waiter will be with you in a moment to confirm your order, Thankyou for your patience!
        </p>

        {createOrder.isError && (
          <p className="text-sm text-destructive text-center">
            Something went wrong. Please try again.
          </p>
        )}
      </form>
    </MobileShell>
    </>
  )
}
