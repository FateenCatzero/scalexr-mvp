'use client'

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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const { data: categories, isLoading: loadingCats } = useCategories(restaurant.id)
  const { data: items, isLoading: loadingItems } = useMenuItems(
    restaurant.id,
    selectedCategory
  )

  return (
    <div className="pb-28">
      {/* Category filter */}
      <div className="py-3 sticky top-0 bg-background/95 backdrop-blur z-10 border-b border-border">
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
