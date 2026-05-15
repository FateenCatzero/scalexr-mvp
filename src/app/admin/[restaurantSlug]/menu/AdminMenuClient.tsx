'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronUp, Box, Check, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import ImageUpload from '@/components/admin/ImageUpload'
import ModelUpload from '@/components/admin/ModelUpload'
import {
  useAdminCategories,
  useAdminMenuItems,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCreateMenuItem,
  useUpdateMenuItem,
  useDeleteMenuItem,
  useItemAssets,
} from '@/lib/queries/admin'
import { formatPrice } from '@/lib/utils'
import type { Category, MenuItem, Restaurant } from '@/lib/types'

// ─── SCHEMA ───────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  price: z.number().min(0),
  category_id: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  is_available: z.boolean(),
  is_out_of_stock: z.boolean(),
})
type ItemFormValues = z.infer<typeof itemSchema>

// ─── ROOT ─────────────────────────────────────────────────────────────────────

export default function AdminMenuClient({ restaurant }: { restaurant: Restaurant }) {
  const [tab, setTab] = useState<'items' | 'categories'>('items')

  return (
    <div className="pt-4">
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

      <div className="px-4 mt-4 mb-6">
        <Link
          href={`/admin/${restaurant.slug}/menu/models`}
          className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted transition-colors"
        >
          <Box className="w-4 h-4 text-muted-foreground" />
          <div className="flex-1">
            <p className="font-medium text-sm">3D Models</p>
            <p className="text-xs text-muted-foreground">Upload GLB & USDZ for all items</p>
          </div>
          <span className="text-muted-foreground text-xs">→</span>
        </Link>
      </div>
    </div>
  )
}

// ─── INLINE ITEM FORM ─────────────────────────────────────────────────────────

function InlineItemForm({
  restaurantId,
  categories,
  defaultValues,
  onSave,
  onCancel,
  loading,
  submitLabel,
  itemId,
  onRegisterSubmit,
  onUnregisterSubmit,
  onRegisterReset,
  onDirtyChange,
}: {
  restaurantId: string
  categories: Category[]
  defaultValues?: Partial<MenuItem>
  onSave: (values: ItemFormValues) => Promise<void>
  onCancel: () => void
  loading: boolean
  submitLabel: string
  itemId?: string
  onRegisterSubmit?: (submit: () => void) => void
  onUnregisterSubmit?: () => void
  onRegisterReset?: (reset: (values?: ItemFormValues) => void) => void
  onDirtyChange?: (isDirty: boolean) => void
}) {
  const savedDefaults = {
    name: defaultValues?.name ?? '',
    description: defaultValues?.description ?? '',
    price: defaultValues?.price ?? 0,
    category_id: defaultValues?.category_id ?? null,
    image_url: defaultValues?.image_url ?? null,
    is_available: defaultValues?.is_available ?? true,
    is_out_of_stock: defaultValues?.is_out_of_stock ?? false,
  }

  const { register, handleSubmit, control, reset, formState: { errors, isDirty } } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: savedDefaults,
  })

  // Keep stable refs so parent can call submit/reset without stale closure
  const submitFnRef = useRef<() => void>(() => {})
  submitFnRef.current = () => handleSubmit(onSave)()

  const resetFnRef = useRef<(values?: ItemFormValues) => void>(() => {})
  resetFnRef.current = (values?: ItemFormValues) => reset(values ?? savedDefaults)

  useEffect(() => {
    if (!itemId) return
    onRegisterSubmit?.(() => submitFnRef.current())
    onRegisterReset?.((values) => resetFnRef.current(values))
    return () => onUnregisterSubmit?.()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId])

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const handleCancel = () => {
    reset(savedDefaults)
    onCancel()
  }

  const { data: assets = [] } = useItemAssets(itemId ?? '')
  const glbAsset = assets.find((a) => a.asset_type === 'model_glb')
  const usdzAsset = assets.find((a) => a.asset_type === 'model_usdz')

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-3 pt-3 border-t border-border mt-3">
      <Controller
        name="image_url"
        control={control}
        render={({ field }) => (
          <ImageUpload
            restaurantId={restaurantId}
            value={field.value ?? null}
            onChange={field.onChange}
          />
        )}
      />

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Name *</Label>
          <Input
            placeholder="Chicken Karahi"
            className="h-8 text-sm"
            {...register('name')}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Price (PKR)</Label>
          <Input
            type="number"
            min="0"
            placeholder="850"
            className="h-8 text-sm"
            {...register('price', { valueAsNumber: true })}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">
          Description <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          placeholder="What's in this dish?"
          rows={2}
          className="text-sm resize-none"
          {...register('description')}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Category</Label>
        <Controller
          name="category_id"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ?? 'none'}
              onValueChange={(v) => field.onChange(v === 'none' ? null : v)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="No category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No category</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="flex items-center justify-between py-0.5">
        <Label className="text-xs">Available on menu</Label>
        <Controller
          name="is_available"
          control={control}
          render={({ field }) => (
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
      </div>

      <div className="flex items-center justify-between py-0.5">
        <Label className="text-xs">Out of stock</Label>
        <Controller
          name="is_out_of_stock"
          control={control}
          render={({ field }) => (
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
      </div>

      {itemId && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium">3D & AR models</p>
          <div className="grid grid-cols-2 gap-2">
            <ModelUpload
              restaurantId={restaurantId}
              menuItemId={itemId}
              assetType="model_glb"
              label="GLB"
              accept=".glb"
              hint="3D + Android AR"
              existing={glbAsset}
              compact
            />
            <ModelUpload
              restaurantId={restaurantId}
              menuItemId={itemId}
              assetType="model_usdz"
              label="USDZ"
              accept=".usdz,.reality"
              hint="iOS AR"
              existing={usdzAsset}
              compact
            />
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" className="flex-1" disabled={loading || !isDirty}>
          {loading ? 'Saving…' : submitLabel}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

// ─── ITEMS TAB ────────────────────────────────────────────────────────────────

function ItemsTab({ restaurant }: { restaurant: Restaurant }) {
  const { data: items, isLoading } = useAdminMenuItems(restaurant.id)
  const { data: categories = [] } = useAdminCategories(restaurant.id)
  const createItem = useCreateMenuItem()
  const updateItem = useUpdateMenuItem()
  const deleteItem = useDeleteMenuItem()

  const [addingNew, setAddingNew] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set())
  const [savingAll, setSavingAll] = useState(false)
  const submitRefs = useRef<Map<string, () => void>>(new Map())
  const resetRefs = useRef<Map<string, (values?: ItemFormValues) => void>>(new Map())

  const handleCreate = async (values: ItemFormValues) => {
    await createItem.mutateAsync({
      restaurant_id: restaurant.id,
      name: values.name,
      description: values.description || null,
      price: values.price,
      category_id: values.category_id || null,
      image_url: values.image_url || null,
      is_available: values.is_available,
      is_out_of_stock: values.is_out_of_stock,
    })
    setAddingNew(false)
  }

  const handleUpdate = async (id: string, values: ItemFormValues) => {
    await updateItem.mutateAsync({
      id,
      name: values.name,
      description: values.description || null,
      price: values.price,
      category_id: values.category_id || null,
      image_url: values.image_url || null,
      is_available: values.is_available,
      is_out_of_stock: values.is_out_of_stock,
    })
    // Reset the form to the just-saved values so RHF isDirty becomes false
    resetRefs.current.get(id)?.(values)
    setExpandedIds((prev) => { const n = new Set(prev); n.delete(id); return n })
    setDirtyIds((prev) => { const n = new Set(prev); n.delete(id); return n })
  }

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
    setConfirmDeleteId(null)
  }

  const handleRegister = (id: string, submit: () => void) => {
    submitRefs.current.set(id, submit)
  }
  const handleRegisterReset = (id: string, fn: (values?: ItemFormValues) => void) => {
    resetRefs.current.set(id, fn)
  }
  const handleUnregister = (id: string) => {
    submitRefs.current.delete(id)
    resetRefs.current.delete(id)
    setDirtyIds((prev) => {
      if (!prev.has(id)) return prev
      const n = new Set(prev); n.delete(id); return n
    })
  }
  const handleDirtyChange = (id: string, dirty: boolean) => {
    setDirtyIds((prev) => {
      // Return same reference when nothing changes — prevents infinite re-render loop
      // caused by the inline onDirtyChange prop changing reference on every render
      if (dirty === prev.has(id)) return prev
      const n = new Set(prev)
      if (dirty) n.add(id); else n.delete(id)
      return n
    })
  }

  // Cancel a single item: reset its form, clear dirty, collapse
  const handleCancelItem = (id: string) => {
    resetRefs.current.get(id)?.()
    setDirtyIds((prev) => { const n = new Set(prev); n.delete(id); return n })
    setExpandedIds((prev) => { const n = new Set(prev); n.delete(id); return n })
  }

  // Cancel all: reset every dirty form, clear all dirty state
  const handleCancelAll = () => {
    dirtyIds.forEach((id) => resetRefs.current.get(id)?.())
    setDirtyIds(new Set())
  }

  const handleSaveAll = async () => {
    setSavingAll(true)
    dirtyIds.forEach((id) => submitRefs.current.get(id)?.())
    setSavingAll(false)
  }

  return (
    <div className="px-4 space-y-3 pb-24">
      {addingNew ? (
        <div className="rounded-xl border border-primary/40 bg-card p-3">
          <p className="font-semibold text-sm">New item</p>
          <InlineItemForm
            restaurantId={restaurant.id}
            categories={categories}
            onSave={handleCreate}
            onCancel={() => setAddingNew(false)}
            loading={createItem.isPending}
            submitLabel="Add item"
          />
          {createItem.isError && (
            <p className="text-xs text-destructive mt-2">Something went wrong. Try again.</p>
          )}
        </div>
      ) : (
        <Button
          className="w-full gap-2"
          onClick={() => { setAddingNew(true); setExpandedIds(new Set()) }}
        >
          <Plus className="w-4 h-4" /> Add item
        </Button>
      )}

      {isLoading ? (
        [1, 2, 3].map((n) => <Skeleton key={n} className="h-20 rounded-xl" />)
      ) : !items?.length ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No items yet. Tap &ldquo;Add item&rdquo; above.
        </p>
      ) : (
        items.map((item) => {
          const isExpanded = expandedIds.has(item.id)
          const isConfirmingDelete = confirmDeleteId === item.id
          const isDirtyItem = dirtyIds.has(item.id)

          return (
            <div
              key={item.id}
              className={[
                'rounded-xl border bg-card p-3 transition-colors',
                isDirtyItem ? 'border-primary/50' : 'border-border',
              ].join(' ')}
            >
              {/* Tappable header — tap anywhere to expand */}
              <button
                type="button"
                onClick={() => toggleExpand(item.id)}
                className="flex items-center gap-3 w-full text-left"
              >
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-12 h-12 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-muted shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={[
                      'font-medium text-sm truncate',
                      !item.is_available ? 'line-through text-muted-foreground' : '',
                    ].join(' ')}>
                      {item.name}
                    </p>
                    {isDirtyItem && (
                      <span className="text-xs text-primary font-medium shrink-0">Unsaved</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {formatPrice(item.price)}
                    {item.categories?.name ? ` · ${item.categories.name}` : ''}
                    {!item.is_available ? ' · Hidden' : ''}
                    {item.is_out_of_stock ? ' · Out of stock' : ''}
                  </p>
                </div>
                {isExpanded
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                }
              </button>

              {/* Form — always mounted so edits survive accordion close; hidden with CSS */}
              <div className={isExpanded ? '' : 'hidden'}>
                <InlineItemForm
                  restaurantId={restaurant.id}
                  categories={categories}
                  defaultValues={item}
                  onSave={(values) => handleUpdate(item.id, values)}
                  onCancel={() => handleCancelItem(item.id)}
                  loading={updateItem.isPending}
                  submitLabel="Save changes"
                  itemId={item.id}
                  onRegisterSubmit={(fn) => handleRegister(item.id, fn)}
                  onUnregisterSubmit={() => handleUnregister(item.id)}
                  onRegisterReset={(fn) => handleRegisterReset(item.id, fn)}
                  onDirtyChange={(dirty) => handleDirtyChange(item.id, dirty)}
                />

                {/* Delete button swaps to confirm row in-place */}
                {isConfirmingDelete ? (
                    <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
                      <p className="flex-1 text-xs text-destructive font-medium">
                        Delete &ldquo;{item.name}&rdquo;?
                      </p>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await deleteItem.mutateAsync({ id: item.id, restaurantId: restaurant.id })
                            setConfirmDeleteId(null)
                            toggleExpand(item.id)
                          } catch {
                            // error shown below
                          }
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(item.id)}
                      className="mt-2 w-full text-xs text-destructive flex items-center justify-center gap-1.5 py-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Delete item
                    </button>
                  )}
                {deleteItem.isError && (
                  <p className="text-xs text-destructive text-center mt-1">
                    {(deleteItem.error as Error)?.message ?? 'Delete failed. Try again.'}
                  </p>
                )}
              </div>
            </div>
          )
        })
      )}

      {/* Sticky Save all / Discard all — appears only when there are unsaved changes */}
      {dirtyIds.size > 0 && (
        <div className="fixed bottom-20 left-0 right-0 flex justify-center gap-2 z-20 pointer-events-none px-4">
          <Button
            variant="outline"
            onClick={handleCancelAll}
            className="pointer-events-auto shadow-lg bg-background"
          >
            Discard all
          </Button>
          <Button
            onClick={handleSaveAll}
            disabled={savingAll}
            className="pointer-events-auto shadow-lg gap-2 px-6"
          >
            {savingAll ? 'Saving…' : `Save all (${dirtyIds.size})`}
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── CATEGORIES TAB ───────────────────────────────────────────────────────────

function CategoriesTab({ restaurant }: { restaurant: Restaurant }) {
  const { data: categories, isLoading: loadingCats } = useAdminCategories(restaurant.id)
  const { data: allItems = [] } = useAdminMenuItems(restaurant.id)
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState<string | null>(null)
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null)

  const itemsByCategory = allItems.reduce<Record<string, typeof allItems>>((acc, item) => {
    const key = item.category_id ?? '__none__'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  const handleAdd = async () => {
    if (!newName.trim()) return
    await createCategory.mutateAsync({ restaurant_id: restaurant.id, name: newName.trim() })
    setNewName('')
    setAdding(false)
  }

  const startEdit = (id: string, name: string) => {
    setConfirmDeleteCatId(null)
    setEditingId(id)
    setEditName(name)
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return
    await updateCategory.mutateAsync({ id: editingId, name: editName.trim() })
    setEditingId(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
  }

  const toggleExpand = (id: string) => {
    setExpandedCatId((prev) => (prev === id ? null : id))
    setConfirmDeleteCatId(null)
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

      {loadingCats ? (
        [1, 2].map((n) => <Skeleton key={n} className="h-14 rounded-xl" />)
      ) : !categories?.length ? (
        <p className="text-sm text-muted-foreground text-center py-8">No categories yet.</p>
      ) : (
        categories.map((cat) => {
          const catItems = itemsByCategory[cat.id] ?? []
          const isExpanded = expandedCatId === cat.id
          const isConfirmingDelete = confirmDeleteCatId === cat.id

          return (
            <div key={cat.id} className="rounded-xl border border-border bg-card px-4 py-3">
              {editingId === cat.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit()
                      if (e.key === 'Escape') cancelEdit()
                    }}
                    className="h-8 text-sm"
                  />
                  <button
                    onClick={handleSaveEdit}
                    disabled={updateCategory.isPending}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-foreground disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  {/* Tappable: name + count + chevron */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(cat.id)}
                    className="flex-1 flex items-center gap-2 text-left min-w-0"
                  >
                    <p className="font-medium text-sm flex-1 truncate">{cat.name}</p>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {catItems.length} item{catItems.length !== 1 ? 's' : ''}
                    </span>
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    }
                  </button>
                  <button
                    onClick={() => startEdit(cat.id, cat.name)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteCatId(cat.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-destructive/10 text-destructive transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Items list dropdown */}
              {isExpanded && !isConfirmingDelete && (
                <div className="mt-2 pt-2 border-t border-border space-y-0.5">
                  {catItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-1">No items in this category.</p>
                  ) : (
                    catItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 py-1.5">
                        {item.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-8 h-8 rounded-md object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-md bg-muted shrink-0" />
                        )}
                        <p className={[
                          'text-xs flex-1 truncate',
                          !item.is_available ? 'line-through text-muted-foreground' : '',
                        ].join(' ')}>
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground shrink-0">
                          {formatPrice(item.price)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Delete confirm */}
              {isConfirmingDelete && (
                <div className="flex items-center gap-2 border-t border-border pt-3 mt-2">
                  <p className="flex-1 text-xs text-destructive font-medium">
                    Delete &ldquo;{cat.name}&rdquo;?
                  </p>
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
          )
        })
      )}
    </div>
  )
}
