'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Minimal order info stored locally — just enough to look up the order later.
// We store the slug so the "Orders" button on the menu page can filter orders
// by the restaurant the customer is currently viewing.
export interface StoredOrder {
  id: string
  restaurantSlug: string
  createdAt: string
}

interface OrderHistoryStore {
  orders: StoredOrder[]
  addOrder: (order: StoredOrder) => void
  removeOrder: (id: string) => void
}

// Persisted order history store, saved to localStorage under 'scalexr-orders'.
// When a customer places an order, it's immediately added here so they can
// re-open the status modal from the "Orders" button without needing the URL.
//
// Capped at 20 orders — the newest order is always prepended, and the list
// is sliced to keep only the last 20 entries.
export const useOrderStore = create<OrderHistoryStore>()(
  persist(
    (set) => ({
      orders: [],

      // Adds a new order to the front of the list and trims to 20 entries.
      addOrder: (order) =>
        set((state) => ({
          orders: [order, ...state.orders].slice(0, 20),
        })),

      // Removes a specific order by ID (used if an order is cancelled).
      removeOrder: (id) =>
        set((state) => ({
          orders: state.orders.filter((o) => o.id !== id),
        })),
    }),
    { name: 'scalexr-orders' }  // localStorage key
  )
)
