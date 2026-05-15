'use client'

import { useEffect, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { trackEvent } from '@/lib/analytics'
import MobileShell from '@/components/layout/MobileShell'
import MenuGrid from '@/components/menu/MenuGrid'
import CartButton from '@/components/cart/CartButton'
import CartSheet from '@/components/cart/CartSheet'
import OrdersSheet from '@/components/customer/OrdersSheet'
import { useOrderStore } from '@/lib/store/orderStore'
import type { Restaurant } from '@/lib/types'

interface MenuPageClientProps {
  restaurant: Restaurant
  tableNumber?: string
}

export default function MenuPageClient({
  restaurant,
  tableNumber,
}: MenuPageClientProps) {
  const [cartOpen, setCartOpen] = useState(false)
  const [ordersOpen, setOrdersOpen] = useState(false)
  const { orders } = useOrderStore()

  useEffect(() => {
    trackEvent(restaurant.id, 'menu_view', { restaurant_slug: restaurant.slug })
  }, [restaurant.id, restaurant.slug])
  const restaurantOrderCount = orders.filter(
    (o) => o.restaurantSlug === restaurant.slug
  ).length

  return (
    <MobileShell>
      <div className="px-4 pt-6 pb-3 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">{restaurant.name}</h1>
          {restaurant.description && (
            <p className="text-muted-foreground text-sm mt-1">
              {restaurant.description}
            </p>
          )}
          {tableNumber && (
            <p className="text-xs text-muted-foreground mt-1">
              Table {tableNumber}
            </p>
          )}
        </div>

        <button
          onClick={() => setOrdersOpen(true)}
          className="flex items-center gap-1.5 shrink-0 rounded-full border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
        >
          <ClipboardList className="w-4 h-4" />
          Orders
          {restaurantOrderCount > 0 && (
            <span className="bg-foreground text-background rounded-full w-4 h-4 flex items-center justify-center text-xs leading-none">
              {restaurantOrderCount}
            </span>
          )}
        </button>
      </div>

      <MenuGrid restaurant={restaurant} />

      <CartButton
        restaurantSlug={restaurant.slug}
        onClick={() => setCartOpen(true)}
      />

      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        restaurantSlug={restaurant.slug}
      />

      <OrdersSheet
        open={ordersOpen}
        onClose={() => setOrdersOpen(false)}
        restaurantSlug={restaurant.slug}
      />
    </MobileShell>
  )
}
