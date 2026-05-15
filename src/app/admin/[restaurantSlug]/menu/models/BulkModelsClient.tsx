'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Box } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import ModelUpload from '@/components/admin/ModelUpload'
import { useAdminMenuItems, useAllItemAssets } from '@/lib/queries/admin'
import type { ItemAsset, Restaurant } from '@/lib/types'

export default function BulkModelsClient({ restaurant }: { restaurant: Restaurant }) {
  const router = useRouter()
  const { data: items, isLoading: loadingItems } = useAdminMenuItems(restaurant.id)
  const { data: allAssets = [], isLoading: loadingAssets } = useAllItemAssets(restaurant.id)

  const assetsByItem = allAssets.reduce<Record<string, ItemAsset[]>>((acc, asset) => {
    if (!acc[asset.menu_item_id]) acc[asset.menu_item_id] = []
    acc[asset.menu_item_id].push(asset)
    return acc
  }, {})

  const isLoading = loadingItems || loadingAssets

  const glbCount = allAssets.filter((a) => a.asset_type === 'model_glb').length
  const usdzCount = allAssets.filter((a) => a.asset_type === 'model_usdz').length

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="font-bold text-lg leading-tight">3D Models</h2>
          <p className="text-xs text-muted-foreground">
            {isLoading ? '—' : `${glbCount} GLB · ${usdzCount} USDZ uploaded`}
          </p>
        </div>
      </div>

      <p className="px-4 text-xs text-muted-foreground mb-4">
        Upload GLB and USDZ files for all menu items from one place.
        GLB enables the 3D viewer and Android AR. USDZ adds iOS AR support.
      </p>

      <div className="px-4 space-y-4">
        {isLoading ? (
          [1, 2, 3].map((n) => <Skeleton key={n} className="h-40 rounded-xl" />)
        ) : !items?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No menu items yet. Add items first.
          </p>
        ) : (
          items.map((item) => {
            const assets = assetsByItem[item.id] ?? []
            const glb = assets.find((a) => a.asset_type === 'model_glb')
            const usdz = assets.find((a) => a.asset_type === 'model_usdz')

            return (
              <div
                key={item.id}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                {/* Item header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-10 h-10 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted shrink-0 flex items-center justify-center">
                      <Box className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {glb && usdz
                        ? '3D + AR ready'
                        : glb
                        ? '3D ready · no iOS AR'
                        : usdz
                        ? 'iOS AR only · no GLB'
                        : 'No models uploaded'}
                    </p>
                  </div>
                </div>

                {/* Upload slots */}
                <div className="p-3 grid grid-cols-2 gap-2">
                  <ModelUpload
                    restaurantId={restaurant.id}
                    menuItemId={item.id}
                    assetType="model_glb"
                    label="GLB"
                    accept=".glb"
                    hint="3D + Android AR"
                    existing={glb}
                    compact
                  />
                  <ModelUpload
                    restaurantId={restaurant.id}
                    menuItemId={item.id}
                    assetType="model_usdz"
                    label="USDZ"
                    accept=".usdz,.reality"
                    hint="iOS AR"
                    existing={usdz}
                    compact
                  />
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
