'use client'

import { useEffect, useRef } from 'react'
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

// Zod schema for the checkout form — all three fields are validated here.
// customerNote is optional; the rest are required.
const schema = z.object({
  customerName: z.string().min(1, 'Name is required'),
  tableNumber: z.string().min(1, 'Table number is required'),
  customerNote: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface CheckoutClientProps {
  restaurantSlug: string
  tableFromQR: string  // pre-populated table number from the QR code URL param
}

// The "Place Order" page. Renders a form for the customer to confirm their
// name, table number, and any special requests before submitting the order.
//
// RACE CONDITION FIX — `submitted` ref:
// Without this fix, the following sequence would break the post-order flow:
//   1. clearCart() is called → items becomes [] → useEffect fires
//   2. useEffect sees items.length === 0 → calls router.replace('/r/slug')
//      (no orderId in URL)
//   3. router.push('/r/slug?orderId=xxx') also fires but loses the race
//   Result: the menu page renders without the orderId, so the modal never opens.
//
// Fix: set submitted.current = true BEFORE calling clearCart(). The useEffect
// is guarded by `!submitted.current`, so it won't fire after intentional submission.
export default function CheckoutClient({
  restaurantSlug,
  tableFromQR,
}: CheckoutClientProps) {
  const router = useRouter()
  const { items, getTotal, clearCart } = useCartStore()
  const addOrder = useOrderStore((s) => s.addOrder)
  const { data: restaurant } = useRestaurant(restaurantSlug)
  const createOrder = useCreateOrder()
  // Tracks whether the order was intentionally submitted — prevents the empty-cart
  // guard from navigating away after clearCart() clears items post-submission.
  const submitted = useRef(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tableNumber: tableFromQR },  // pre-fill from QR code
  })

  // If the customer navigates here with an empty cart (e.g. typed the URL manually
  // or refreshed after already submitting), redirect them back to the menu.
  // The `!submitted.current` guard ensures this does NOT fire after onSubmit
  // calls clearCart() as part of the normal post-order cleanup.
  useEffect(() => {
    if (items.length === 0 && !submitted.current) router.replace(`/r/${restaurantSlug}`)
  }, [items.length, restaurantSlug, router])

  const onSubmit = async (data: FormData) => {
    if (!restaurant || items.length === 0) return
    // Create the order in Supabase (inserts orders + order_items rows)
    const order = await createOrder.mutateAsync({
      restaurantId: restaurant.id,
      tableNumber: data.tableNumber,
      customerName: data.customerName,
      customerNote: data.customerNote ?? '',
      items,
    })
    // Mark as submitted BEFORE clearCart() to prevent the guard useEffect
    // from firing and overwriting the upcoming router.push with orderId.
    submitted.current = true
    clearCart()
    // Persist the order ID locally so the "Orders" tab can show it later
    addOrder({ id: order.id, restaurantSlug, createdAt: order.created_at })
    toast.success('Order placed!')
    // Navigate to the menu page with orderId in the URL — the server component
    // forwards it as a prop which causes the order status modal to auto-open.
    router.push(`/r/${restaurantSlug}?orderId=${order.id}`)
  }

  // Avoid flashing an empty cart state while the redirect useEffect fires
  if (items.length === 0) return null

  return (
    <MobileShell className="px-4">
      <div className="pt-4 pb-2 flex items-center gap-2">
        <Link
          href={`/r/${restaurantSlug}`}
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
          A waiter will be with you in a moment to confirm your order.
        </p>

        {createOrder.isError && (
          <p className="text-sm text-destructive text-center">
            Something went wrong. Please try again.
          </p>
        )}
      </form>
    </MobileShell>
  )
}
