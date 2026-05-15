'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, MenuItem } from '@/lib/types'

interface CartStore {
  items: CartItem[]
  restaurantSlug: string | null
  tableNumber: string | null
  setTableNumber: (table: string) => void
  addItem: (menuItem: MenuItem, quantity?: number, notes?: string) => void
  removeItem: (menuItemId: string) => void
  updateQuantity: (menuItemId: string, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
  getItemCount: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      restaurantSlug: null,
      tableNumber: null,

      setTableNumber: (table) => set({ tableNumber: table }),

      addItem: (menuItem, quantity = 1, notes) => {
        set((state) => {
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

      removeItem: (menuItemId) => {
        set((state) => ({
          items: state.items.filter((i) => i.menuItem.id !== menuItemId),
        }))
      },

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

      clearCart: () => set({ items: [], restaurantSlug: null, tableNumber: null }),

      getTotal: () =>
        get().items.reduce(
          (sum, i) => sum + i.menuItem.price * i.quantity,
          0
        ),

      getItemCount: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'scalexr-cart' }
  )
)
