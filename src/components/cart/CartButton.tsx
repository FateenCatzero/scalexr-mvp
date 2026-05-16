'use client'

// CartButton — floating action button fixed to the bottom of the screen.
// Always visible while shopping; shows item count and total when cart has items,
// or a muted empty-cart state when the cart is empty.
// Tapping opens the CartSheet bottom drawer (controlled by the parent via `onClick`).

import { ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/lib/store/cartStore'
import { formatPrice } from '@/lib/utils'

interface CartButtonProps {
  restaurantSlug: string  // unused here but passed by callers for future navigation use
  onClick: () => void
}

export default function CartButton({ onClick }: CartButtonProps) {
  const itemCount = useCartStore((s) => s.getItemCount())
  const total = useCartStore((s) => s.getTotal())

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xs px-4">
      <button
        onClick={onClick}
        className={[
          'w-full flex items-center justify-between rounded-2xl px-5 py-3.5 shadow-xl transition-all',
          // Empty cart: subtle ghost style. Has items: solid black/white pill.
          itemCount === 0
            ? 'bg-foreground/8 border border-border text-muted-foreground'
            : 'bg-foreground text-background hover:opacity-90',
        ].join(' ')}
      >
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          <span className="font-semibold text-sm">
            {itemCount === 0
              ? 'No items in cart'
              : `${itemCount} item${itemCount !== 1 ? 's' : ''}`}
          </span>
        </div>
        {itemCount > 0 && (
          <span className="font-bold text-sm">{formatPrice(total)}</span>
        )}
      </button>
    </div>
  )
}
