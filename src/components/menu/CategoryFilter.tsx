'use client'

import { cn } from '@/lib/utils'
import type { Category } from '@/lib/types'

interface CategoryFilterProps {
  categories: Category[]
  selected: string | null
  onSelect: (id: string | null) => void
}

export default function CategoryFilter({
  categories,
  selected,
  onSelect,
}: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-4">
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
