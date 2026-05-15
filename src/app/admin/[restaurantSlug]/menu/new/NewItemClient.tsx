'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import ItemForm, { type ItemFormValues } from '@/components/admin/ItemForm'
import { useAdminCategories, useCreateMenuItem } from '@/lib/queries/admin'
import type { Restaurant } from '@/lib/types'

export default function NewItemClient({ restaurant }: { restaurant: Restaurant }) {
  const router = useRouter()
  const { data: categories = [] } = useAdminCategories(restaurant.id)
  const createItem = useCreateMenuItem()

  const handleSubmit = async (values: ItemFormValues) => {
    await createItem.mutateAsync({
      restaurant_id: restaurant.id,
      name: values.name,
      description: values.description || null,
      price: values.price,
      category_id: values.category_id || null,
      image_url: values.image_url || null,
      is_available: values.is_available,
    })
    router.push(`/admin/${restaurant.slug}/menu`)
  }

  return (
    <div>
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="font-bold text-lg">Add item</h2>
      </div>
      <ItemForm
        restaurantId={restaurant.id}
        categories={categories}
        onSubmit={handleSubmit}
        loading={createItem.isPending}
        submitLabel="Add item"
      />
      {createItem.isError && (
        <p className="text-xs text-destructive text-center px-4 pb-4">
          Something went wrong. Please try again.
        </p>
      )}
    </div>
  )
}
