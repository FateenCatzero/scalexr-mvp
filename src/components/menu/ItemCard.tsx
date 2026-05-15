'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useCartStore } from '@/lib/store/cartStore'
import { formatPrice } from '@/lib/utils'
import type { MenuItem } from '@/lib/types'

interface ItemCardProps {
  item: MenuItem
  restaurantSlug: string
}

export default function ItemCard({ item, restaurantSlug }: ItemCardProps) {
  const addItem = useCartStore((s) => s.addItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const cartItem = useCartStore((s) =>
    s.items.find((i) => i.menuItem.id === item.id)
  )
  const quantity = cartItem?.quantity ?? 0

  return (
    <div className="rounded-xl overflow-hidden bg-card border border-border">
      <Link href={`/r/${restaurantSlug}/item/${item.id}`}>
        <div className="relative aspect-square bg-muted">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              className="object-cover"
              sizes="(max-width: 448px) 50vw, 224px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
              No image
            </div>
          )}
          {(item.has_3d_model || item.has_ar) && (
            <div className="absolute top-2 left-2 flex gap-1">
              {item.has_3d_model && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  3D
                </Badge>
              )}
              {item.has_ar && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  AR
                </Badge>
              )}
            </div>
          )}
        </div>
      </Link>

      <div className="p-3">
        <Link href={`/r/${restaurantSlug}/item/${item.id}`}>
          <p className="font-medium text-sm leading-tight line-clamp-1">
            {item.name}
          </p>
          {item.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {item.description}
            </p>
          )}
        </Link>

        <div className="flex items-center justify-between mt-2">
          <span className="font-semibold text-sm">{formatPrice(item.price)}</span>

          {quantity === 0 ? (
            <button
              onClick={() => addItem(item)}
              className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-80 transition-opacity"
              aria-label={`Add ${item.name} to cart`}
            >
              <Plus className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => updateQuantity(item.id, quantity - 1)}
                className="w-6 h-6 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-5 text-center text-sm font-bold">{quantity}</span>
              <button
                onClick={() => updateQuantity(item.id, quantity + 1)}
                className="w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-80 transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
