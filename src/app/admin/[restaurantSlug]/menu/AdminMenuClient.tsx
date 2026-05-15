'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAdminCategories,
  useAdminMenuItems,
  useCreateCategory,
  useDeleteCategory,
  useDeleteMenuItem,
} from '@/lib/queries/admin'
import { formatPrice } from '@/lib/utils'
import type { Restaurant } from '@/lib/types'

export default function AdminMenuClient({ restaurant }: { restaurant: Restaurant }) {
  const [tab, setTab] = useState<'items' | 'categories'>('items')

  return (
    <div className="pt-4">
      {/* Tabs */}
      <div className="flex border-b border-border mx-4 mb-4">
        {(['items', 'categories'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'flex-1 pb-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px',
              tab === t
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground',
            ].join(' ')}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'items' ? (
        <ItemsTab restaurant={restaurant} />
      ) : (
        <CategoriesTab restaurant={restaurant} />
      )}
    </div>
  )
}

// ─── ITEMS TAB ────────────────────────────────────────────────────────────────

function ItemsTab({ restaurant }: { restaurant: Restaurant }) {
  const { data: items, isLoading } = useAdminMenuItems(restaurant.id)
  const deleteItem = useDeleteMenuItem()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  return (
    <div className="px-4 space-y-3">
      <Link href={`/admin/${restaurant.slug}/menu/new`}>
        <Button className="w-full gap-2">
          <Plus className="w-4 h-4" /> Add item
        </Button>
      </Link>

      {isLoading ? (
        [1, 2, 3].map((n) => <Skeleton key={n} className="h-20 rounded-xl" />)
      ) : !items?.length ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No items yet. Add your first menu item above.
        </p>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-border bg-card p-3"
          >
            <div className="flex items-center gap-3">
              {item.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-14 h-14 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-muted shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={['font-medium text-sm truncate', !item.is_available ? 'line-through text-muted-foreground' : ''].join(' ')}>
                  {item.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatPrice(item.price)}
                  {item.categories?.name ? ` · ${item.categories.name}` : ''}
                  {!item.is_available ? ' · Hidden' : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Link href={`/admin/${restaurant.slug}/menu/${item.id}/edit`}>
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </Link>
                <button
                  onClick={() => setConfirmDeleteId(item.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-destructive/10 text-destructive transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {confirmDeleteId === item.id && (
              <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                <p className="flex-1 text-xs text-destructive font-medium">Delete this item?</p>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteItem.mutate({ id: item.id, restaurantId: restaurant.id })
                    setConfirmDeleteId(null)
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}

// ─── CATEGORIES TAB ───────────────────────────────────────────────────────────

function CategoriesTab({ restaurant }: { restaurant: Restaurant }) {
  const { data: categories, isLoading } = useAdminCategories(restaurant.id)
  const createCategory = useCreateCategory()
  const deleteCategory = useDeleteCategory()
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!newName.trim()) return
    await createCategory.mutateAsync({
      restaurant_id: restaurant.id,
      name: newName.trim(),
    })
    setNewName('')
    setAdding(false)
  }

  return (
    <div className="px-4 space-y-3">
      {adding ? (
        <div className="flex gap-2">
          <Input
            autoFocus
            placeholder="Category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button onClick={handleAdd} disabled={createCategory.isPending}>
            {createCategory.isPending ? '…' : 'Add'}
          </Button>
          <Button variant="outline" onClick={() => { setAdding(false); setNewName('') }}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button className="w-full gap-2" onClick={() => setAdding(true)}>
          <Plus className="w-4 h-4" /> Add category
        </Button>
      )}

      {isLoading ? (
        [1, 2].map((n) => <Skeleton key={n} className="h-14 rounded-xl" />)
      ) : !categories?.length ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No categories yet.
        </p>
      ) : (
        categories.map((cat) => (
          <div
            key={cat.id}
            className="rounded-xl border border-border bg-card px-4 py-3"
          >
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">{cat.name}</p>
              <button
                onClick={() => setConfirmDeleteCatId(cat.id)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-destructive/10 text-destructive transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {confirmDeleteCatId === cat.id && (
              <div className="flex items-center gap-2 border-t border-border pt-3 mt-2">
                <p className="flex-1 text-xs text-destructive font-medium">Delete this category?</p>
                <button
                  onClick={() => setConfirmDeleteCatId(null)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteCategory.mutate({ id: cat.id, restaurantId: restaurant.id })
                    setConfirmDeleteCatId(null)
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
