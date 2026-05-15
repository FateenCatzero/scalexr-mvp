'use client'

import { useRouter } from 'next/navigation'
import { Minus, Plus, Trash2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useCartStore } from '@/lib/store/cartStore'
import { formatPrice } from '@/lib/utils'

interface CartSheetProps {
  open: boolean
  onClose: () => void
  restaurantSlug: string
}

export default function CartSheet({ open, onClose, restaurantSlug }: CartSheetProps) {
  const router = useRouter()
  const { items, updateQuantity, removeItem, getTotal } = useCartStore()

  const handleCheckout = () => {
    onClose()
    router.push(`/r/${restaurantSlug}/checkout`)
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>Your order</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No items in cart yet.</p>
        ) : (
          <>
            <div className="space-y-4">
              {items.map(({ menuItem, quantity }) => (
                <div key={menuItem.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{menuItem.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatPrice(menuItem.price)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(menuItem.id, quantity - 1)}
                      className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-muted transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-medium">{quantity}</span>
                    <button
                      onClick={() => updateQuantity(menuItem.id, quantity + 1)}
                      className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-muted transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeItem(menuItem.id)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="flex items-center justify-between font-semibold mb-6">
              <span>Total</span>
              <span>{formatPrice(getTotal())}</span>
            </div>

            <Button onClick={handleCheckout} className="w-full" size="lg">
              Proceed to checkout
            </Button>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
