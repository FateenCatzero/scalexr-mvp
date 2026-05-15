'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowLeft, Box, Check, Minus, Plus, Scan } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import CartButton from '@/components/cart/CartButton'
import CartSheet from '@/components/cart/CartSheet'
import { useCartStore } from '@/lib/store/cartStore'
import { formatPrice } from '@/lib/utils'
import type { MenuItemWithAssets } from '@/lib/types'

const ModelViewer = dynamic(
  () => import('@/components/viewer/ModelViewer'),
  { ssr: false, loading: () => <Skeleton className="w-full h-72 rounded-xl" /> }
)

interface ItemDetailClientProps {
  item: MenuItemWithAssets
  restaurantSlug: string
}

export default function ItemDetailClient({
  item,
  restaurantSlug,
}: ItemDetailClientProps) {
  const [show3D, setShow3D] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    setIsIOS(/iPhone|iPad|iPod/i.test(navigator.userAgent))
  }, [])

  const addItem = useCartStore((s) => s.addItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const cartItem = useCartStore((s) =>
    s.items.find((i) => i.menuItem.id === item.id)
  )
  const quantity = cartItem?.quantity ?? 0

  const glbAsset = item.item_assets.find((a) => a.asset_type === 'model_glb')
  const usdzAsset = item.item_assets.find((a) => a.asset_type === 'model_usdz')

  const handleAdd = () => {
    addItem(item)
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1500)
  }

  const handleView3D = () => setShow3D((v) => !v)

  const handleAR = () => {
    if (isIOS && usdzAsset?.public_url) {
      // iOS Quick Look: create <a rel="ar"><img></a> and click it synchronously
      // within the user gesture so Safari treats it as a real Quick Look trigger
      const a = document.createElement('a')
      a.setAttribute('rel', 'ar')
      a.href = usdzAsset.public_url
      a.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px'
      const img = document.createElement('img')
      img.src = item.image_url ?? ''
      img.setAttribute('width', '1')
      img.setAttribute('height', '1')
      a.appendChild(img)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } else if (!isIOS && glbAsset?.public_url) {
      // Android: Scene Viewer via intent URL
      const intentUrl = [
        'intent://arvr.google.com/scene-viewer/1.0',
        `?file=${encodeURIComponent(glbAsset.public_url)}`,
        '&mode=ar_preferred',
        `&title=${encodeURIComponent(item.name)}`,
        '#Intent;scheme=https;package=com.google.ar.core;',
        'action=android.intent.action.VIEW;end;',
      ].join('')
      window.location.href = intentUrl
    }
  }

  // Show AR button on iOS only if USDZ exists; Android only if GLB exists
  const showAR = item.has_ar && (isIOS ? !!usdzAsset?.public_url : !!glbAsset?.public_url)

  return (
    <div className="mx-auto max-w-md min-h-screen pb-28">
      <div className="px-4 pt-4">
        <Link
          href={`/r/${restaurantSlug}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to menu
        </Link>
      </div>

      {/* Image / 3D viewer */}
      <div className="mt-4 px-4">
        {show3D && glbAsset?.public_url ? (
          <ModelViewer
            glbUrl={glbAsset.public_url}
            usdzUrl={usdzAsset?.public_url ?? undefined}
            itemName={item.name}
          />
        ) : (
          <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-muted">
            {item.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image_url}
                alt={item.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                No image
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {(item.has_3d_model || showAR) && (
        <div className="flex gap-2 px-4 mt-3">
          {item.has_3d_model && glbAsset?.public_url && (
            <Button
              variant={show3D ? 'default' : 'outline'}
              size="sm"
              onClick={handleView3D}
              className="flex-1 gap-1.5"
            >
              <Box className="w-4 h-4" />
              {show3D ? 'Show photo' : 'View in 3D'}
            </Button>
          )}

          {showAR && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAR}
              className="flex-1 gap-1.5"
            >
              <Scan className="w-4 h-4" />
              View in AR
            </Button>
          )}
        </div>
      )}

      {/* Item info */}
      <div className="px-4 mt-5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold leading-tight">{item.name}</h1>
          <span className="text-xl font-bold shrink-0">
            {formatPrice(item.price)}
          </span>
        </div>
        {item.description && (
          <p className="text-muted-foreground mt-2 leading-relaxed text-sm">
            {item.description}
          </p>
        )}
        <div className="flex gap-2 mt-3">
          {item.has_3d_model && <Badge variant="secondary">3D</Badge>}
          {item.has_ar && <Badge variant="secondary">AR</Badge>}
        </div>
      </div>

      {/* Add / Quantity controls */}
      <div className="px-4 mt-6">
        {quantity === 0 ? (
          <Button
            size="lg"
            className="w-full gap-2"
            onClick={handleAdd}
          >
            {justAdded ? (
              <>
                <Check className="w-4 h-4" />
                Added to cart
              </>
            ) : (
              `Add to cart — ${formatPrice(item.price)}`
            )}
          </Button>
        ) : (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 flex-1 justify-center">
              <button
                onClick={() => updateQuantity(item.id, quantity - 1)}
                className="w-10 h-10 rounded-full border-2 border-border flex items-center justify-center hover:bg-muted transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-2xl font-bold w-8 text-center">{quantity}</span>
              <button
                onClick={() => updateQuantity(item.id, quantity + 1)}
                className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-80 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">Subtotal</p>
              <p className="font-bold">{formatPrice(item.price * quantity)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Floating cart button */}
      <CartButton
        restaurantSlug={restaurantSlug}
        onClick={() => setCartOpen(true)}
      />

      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        restaurantSlug={restaurantSlug}
      />
    </div>
  )
}
