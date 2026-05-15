'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import ItemForm, { type ItemFormValues } from '@/components/admin/ItemForm'
import ModelUpload from '@/components/admin/ModelUpload'
import { useAdminCategories, useUpdateMenuItem, useItemAssets } from '@/lib/queries/admin'
import type { MenuItem, Restaurant } from '@/lib/types'

export default function EditItemClient({
  restaurant,
  item,
}: {
  restaurant: Restaurant
  item: MenuItem
}) {
  const router = useRouter()
  const { data: categories = [] } = useAdminCategories(restaurant.id)
  const updateItem = useUpdateMenuItem()
  const { data: assets = [] } = useItemAssets(item.id)

  const glbAsset = assets.find((a) => a.asset_type === 'model_glb')
  const usdzAsset = assets.find((a) => a.asset_type === 'model_usdz')

  const handleSubmit = async (values: ItemFormValues) => {
    await updateItem.mutateAsync({
      id: item.id,
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
        <h2 className="font-bold text-lg">Edit item</h2>
      </div>

      <ItemForm
        restaurantId={restaurant.id}
        categories={categories}
        defaultValues={item}
        onSubmit={handleSubmit}
        loading={updateItem.isPending}
        submitLabel="Save changes"
      />

      {/* 3D / AR models — only on edit since we need the item ID */}
      <div className="px-4 pb-6 space-y-3">
        <div>
          <p className="font-semibold text-sm mb-1">3D & AR models</p>
          <p className="text-xs text-muted-foreground">
            Upload a GLB file to enable the 3D viewer. Add a USDZ file to also enable AR on iOS.
          </p>
        </div>
        <ModelUpload
          restaurantId={restaurant.id}
          menuItemId={item.id}
          assetType="model_glb"
          label="GLB model"
          accept=".glb"
          hint="3D viewer + Android AR"
          existing={glbAsset}
        />
        <ModelUpload
          restaurantId={restaurant.id}
          menuItemId={item.id}
          assetType="model_usdz"
          label="USDZ model"
          accept=".usdz,.reality"
          hint="iOS AR (optional)"
          existing={usdzAsset}
        />
      </div>

      {updateItem.isError && (
        <p className="text-xs text-destructive text-center px-4 pb-4">
          Something went wrong. Please try again.
        </p>
      )}
    </div>
  )
}
