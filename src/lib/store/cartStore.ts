'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, MenuItem } from '@/lib/types'

// Shape of the cart store — both the data and the action functions.
interface CartStore {
  items: CartItem[]
  restaurantSlug: string | null  // tracks which restaurant these items belong to
  tableNumber: string | null     // set from the ?table= QR code URL param
  setTableNumber: (table: string) => void
  addItem: (menuItem: MenuItem, quantity?: number, notes?: string) => void
  removeItem: (menuItemId: string) => void
  updateQuantity: (menuItemId: string, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
  getItemCount: () => number
}

// The global cart store, persisted to localStorage under 'scalexr-cart'.
// Survives page refreshes and browser navigation. Cleared on checkout completion.
//
// Key behaviours:
// - `addItem` increments quantity if the item already exists in the cart;
//   otherwise appends it and sets `restaurantSlug` from the item's restaurant_id.
// - `updateQuantity` to 0 or below calls `removeItem` automatically.
// - `clearCart` resets everything including restaurantSlug and tableNumber.
export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      restaurantSlug: null,
      tableNumber: null,

      // Saves the table number so checkout can pre-fill it.
      setTableNumber: (table) => set({ tableNumber: table }),

      // Adds an item to the cart. If the item is already present, its quantity
      // is incremented instead of creating a duplicate. The restaurantSlug is
      // captured from the first item added.
      //
      // Cross-restaurant guard: if the cart already contains items from a different
      // restaurant (restaurantSlug mismatch), the cart is automatically cleared before
      // the new item is added. This prevents mixed-restaurant orders being submitted.
      // The tableNumber is also cleared — it is specific to the previous restaurant's QR code.
      addItem: (menuItem, quantity = 1, notes) => {
        set((state) => {
          // Auto-clear if the incoming item belongs to a different restaurant
          if (
            state.restaurantSlug &&
            state.items.length > 0 &&
            state.restaurantSlug !== menuItem.restaurant_id
          ) {
            return {
              items: [{ menuItem, quantity, notes }],
              restaurantSlug: menuItem.restaurant_id,
              tableNumber: null,
            }
          }

          const existing = state.items.find((i) => i.menuItem.id === menuItem.id)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.menuItem.id === menuItem.id
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
            }
          }
          return {
            items: [...state.items, { menuItem, quantity, notes }],
            restaurantSlug: menuItem.restaurant_id,
          }
        })
      },

      // Removes an item entirely from the cart.
      removeItem: (menuItemId) => {
        set((state) => ({
          items: state.items.filter((i) => i.menuItem.id !== menuItemId),
        }))
      },

      // Updates the quantity of a specific item. Removing it (quantity ≤ 0)
      // delegates to removeItem so the item is fully gone from the array.
      updateQuantity: (menuItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(menuItemId)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.menuItem.id === menuItemId ? { ...i, quantity } : i
          ),
        }))
      },

      // Resets the entire cart including table number and restaurant context.
      // Called immediately after a successful order is created.
      clearCart: () => set({ items: [], restaurantSlug: null, tableNumber: null }),

      // Returns the sum of (price × quantity) for all items in PKR.
      getTotal: () =>
        get().items.reduce(
          (sum, i) => sum + i.menuItem.price * i.quantity,
          0
        ),

      // Returns the total number of individual items (sum of all quantities).
      getItemCount: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'scalexr-cart' }  // localStorage key
  )
)
