'use client'

// MenuGrid — the main scrollable menu content below the restaurant header.
// Renders horizontal category tabs, an optional "In stock only" filter toggle,
// and a 2-column responsive grid of ItemCards.
//
// Category filtering is done server-side via the useMenuItems query — passing
// a categoryId to the hook causes it to only fetch items in that category.
// The "All" tab corresponds to selectedCategory === null, which fetches everything.
//
// The "In stock only" toggle only appears when at least one item is out of stock;
// it filters entirely on the client without a second API call.

import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import CategoryFilter from './CategoryFilter'
import ItemCard from './ItemCard'
import { useCategories, useMenuItems } from '@/lib/queries/menu'
import type { Restaurant } from '@/lib/types'

interface MenuGridProps {
  restaurant: Restaurant
}

export default function MenuGrid({ restaurant }: MenuGridProps) {
  // null = "All" tab (no category filter), string = specific category UUID
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [inStockOnly, setInStockOnly] = useState(false)

  const { data: categories, isLoading: loadingCats } = useCategories(restaurant.id)
  const { data: allItems, isLoading: loadingItems } = useMenuItems(restaurant.id, selectedCategory)

  // Only show the in-stock filter toggle if there's something to filter out.
  const hasOutOfStock = allItems?.some((i) => i.is_out_of_stock) ?? false
  // Client-side filter — no re-fetch needed.
  const items = inStockOnly ? allItems?.filter((i) => !i.is_out_of_stock) : allItems

  return (
    <div className="pb-28">
      {/* Category filter + in-stock toggle — sticky so it stays visible while scrolling */}
      <div className="py-3 sticky top-0 bg-background/95 backdrop-blur z-10 border-b border-border space-y-2">
        {loadingCats ? (
          <div className="flex gap-2 px-4">
            {[1, 2, 3, 4].map((n) => (
              <Skeleton key={n} className="h-8 w-20 rounded-full" />
            ))}
          </div>
        ) : (
          <CategoryFilter
            categories={categories ?? []}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        )}

        {hasOutOfStock && (
          <div className="px-4">
            <button
              onClick={() => setInStockOnly((v) => !v)}
              className={[
                'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                inStockOnly
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              <span className={['w-2 h-2 rounded-full', inStockOnly ? 'bg-background' : 'bg-green-500'].join(' ')} />
              In stock only
            </button>
          </div>
        )}
      </div>

      {/* Item grid */}
      <div className="px-4 pt-4 grid grid-cols-2 gap-3">
        {loadingItems
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden">
                <Skeleton className="aspect-square w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            ))
          : items?.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                restaurantSlug={restaurant.slug}
              />
            ))}

        {!loadingItems && items?.length === 0 && (
          <div className="col-span-2 text-center py-16 text-muted-foreground">
            No items in this category yet.
          </div>
        )}
      </div>
    </div>
  )
}
