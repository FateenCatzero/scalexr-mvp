'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import { trackEvent } from '@/lib/analytics'
import MobileShell from '@/components/layout/MobileShell'
import MenuGrid from '@/components/menu/MenuGrid'
import CartButton from '@/components/cart/CartButton'
import CartSheet from '@/components/cart/CartSheet'
import OrdersSheet from '@/components/customer/OrdersSheet'
import OrderDetailSheet from '@/components/customer/OrderDetailSheet'
import { useOrderStore } from '@/lib/store/orderStore'
import { useCartStore } from '@/lib/store/cartStore'
import type { Restaurant } from '@/lib/types'

interface MenuPageClientProps {
  restaurant: Restaurant
  tableNumber?: string      // from ?table= QR code param
  confirmedOrderId?: string // from ?orderId= after checkout — triggers order modal
}

// Client Component — the main customer-facing menu page.
// Receives the restaurant from the server component (already fetched).
//
// Key responsibilities:
//   - Fires a `menu_view` analytics event on mount
//   - Saves the table number into the Zustand cart store so checkout is pre-filled
//   - Manages open/close state for CartSheet, OrdersSheet, and OrderDetailSheet
//   - When confirmedOrderId is present (user just placed an order), automatically
//     opens the OrderDetailSheet modal to show order status
export default function MenuPageClient({
  restaurant,
  tableNumber,
  confirmedOrderId,
}: MenuPageClientProps) {
  const router = useRouter()
  const [cartOpen, setCartOpen] = useState(false)
  const [ordersOpen, setOrdersOpen] = useState(false)
  // Local state mirror of confirmedOrderId — needed so closing the modal
  // clears the state without requiring a full page re-render.
  const [orderConfirmId, setOrderConfirmId] = useState<string | null>(confirmedOrderId ?? null)

  // If the server re-renders with a new confirmedOrderId (e.g. after checkout),
  // sync it into local state so the modal opens.
  useEffect(() => {
    if (confirmedOrderId) setOrderConfirmId(confirmedOrderId)
  }, [confirmedOrderId])
  const { orders } = useOrderStore()
  const setTableNumber = useCartStore((s) => s.setTableNumber)

  // Track that this customer viewed the menu — fires once per page load.
  useEffect(() => {
    trackEvent(restaurant.id, 'menu_view', { restaurant_slug: restaurant.slug })
  }, [restaurant.id, restaurant.slug])

  // Store the table number in the cart store so checkout can read it
  // without re-reading the URL. Only updates when tableNumber changes.
  useEffect(() => {
    if (tableNumber) setTableNumber(tableNumber)
  }, [tableNumber, setTableNumber])

  // Count only orders placed at this specific restaurant (not at other restaurants
  // the customer may have visited) for the "Orders" button badge.
  const restaurantOrderCount = orders.filter(
    (o) => o.restaurantSlug === restaurant.slug
  ).length

  return (
    <MobileShell>
      {/* Header — restaurant name, description, table number, and Orders button */}
      <div className="px-4 pt-6 pb-3 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">{restaurant.name}</h1>
          {restaurant.description && (
            <p className="text-muted-foreground text-sm mt-1">
              {restaurant.description}
            </p>
          )}
          {/* Only shown if the customer arrived via a table-specific QR code */}
          {tableNumber && (
            <p className="text-xs text-muted-foreground mt-1">
              Table {tableNumber}
            </p>
          )}
        </div>

        {/* Orders button — shows badge with count of orders at this restaurant */}
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

      {/* Category filter tabs + scrollable item grid */}
      <MenuGrid restaurant={restaurant} />

      {/* Floating "X items — PKR Y" button fixed to the bottom of the screen */}
      <CartButton
        restaurantSlug={restaurant.slug}
        onClick={() => setCartOpen(true)}
      />

      {/* Bottom sheet that slides up when the cart button is tapped */}
      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        restaurantSlug={restaurant.slug}
      />

      {/* Bottom sheet listing all past orders at this restaurant */}
      <OrdersSheet
        open={ordersOpen}
        onClose={() => setOrdersOpen(false)}
        restaurantSlug={restaurant.slug}
      />

      {/* Dialog modal showing live status of a specific order.
          Automatically opens when orderConfirmId is set (right after checkout).
          Closing it clears the orderId from the URL via router.replace(). */}
      <OrderDetailSheet
        orderId={orderConfirmId}
        open={!!orderConfirmId}
        onClose={() => {
          setOrderConfirmId(null)
          router.replace(`/r/${restaurant.slug}`)
        }}
      />
    </MobileShell>
  )
}
