'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Minus, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import MobileShell from '@/components/layout/MobileShell'
import { useCartStore } from '@/lib/store/cartStore'
import { formatPrice } from '@/lib/utils'


export default function CartPage() {
  const params = useParams<{ restaurantSlug: string }>()
  const router = useRouter()
  const { items, updateQuantity, removeItem, getTotal, tableNumber } = useCartStore()

  return (
    <MobileShell className="px-4">
      <div className="pt-4 pb-2 flex items-center gap-2">
        <Link
          href={`/r/${params.restaurantSlug}`}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">Your order</h1>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-muted-foreground">Your cart is empty.</p>
          <Link
            href={`/r/${params.restaurantSlug}`}
            className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Browse menu
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-4 space-y-4">
            {items.map(({ menuItem, quantity }) => (
              <div key={menuItem.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{menuItem.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatPrice(menuItem.price)} each
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateQuantity(menuItem.id, quantity - 1)}
                    className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => updateQuantity(menuItem.id, quantity + 1)}
                    className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeItem(menuItem.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors ml-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-5" />

          <div className="flex justify-between font-semibold text-lg mb-6">
            <span>Total</span>
            <span>{formatPrice(getTotal())}</span>
          </div>

          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              const qs = tableNumber ? `?table=${encodeURIComponent(tableNumber)}` : ''
              router.push(`/r/${params.restaurantSlug}/checkout${qs}`)
            }}
          >
            Proceed to checkout
          </Button>
        </>
      )}
    </MobileShell>
  )
}
