'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

export const useOrderStore = create<OrderHistoryStore>()(
  persist(
    (set) => ({
      orders: [],
      addOrder: (order) =>
        set((state) => ({
          orders: [order, ...state.orders].slice(0, 20), // keep last 20
        })),
      removeOrder: (id) =>
        set((state) => ({
          orders: state.orders.filter((o) => o.id !== id),
        })),
    }),
    { name: 'scalexr-orders' }
  )
)
