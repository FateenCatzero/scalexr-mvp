'use client'

// CategoryFilter — horizontally scrollable pill tabs for filtering menu items by category.
// "All" is always the first tab and corresponds to `selected === null` (no filter).
// Active tab uses inverted colours (foreground bg, background text).
// `scrollbar-hide` removes the visible scrollbar while keeping scroll functionality.

import { cn } from '@/lib/utils'
import type { Category } from '@/lib/types'

interface CategoryFilterProps {
  categories: Category[]
  selected: string | null  // null = All
  onSelect: (id: string | null) => void
}

export default function CategoryFilter({
  categories,
  selected,
  onSelect,
}: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-4">
      {/* "All" tab — selecting it clears the category filter */}
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
          selected === null
            ? 'bg-foreground text-background'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        )}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={cn(
            'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
            selected === cat.id
              ? 'bg-foreground text-background'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}
