'use client'

import { useState } from 'react'
import { formatDistanceToNow, formatPrice } from '@/lib/utils'
import StatusBadge from './StatusBadge'
import type { OrderWithItems } from '@/lib/types'

interface Action {
  label: string
  onClick: () => void
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
  requireConfirm?: boolean
}

interface OrderCardProps {
  order: OrderWithItems
  actions: Action[]
  onEdit?: () => void
}

export default function OrderCard({ order, actions, onEdit }: OrderCardProps) {
  const [confirmingLabel, setConfirmingLabel] = useState<string | null>(null)

  const handleActionClick = (action: Action) => {
    if (action.requireConfirm) {
      if (confirmingLabel === action.label) {
        // Clicking the same button again dismisses the confirmation
        setConfirmingLabel(null)
        return
      }
      setConfirmingLabel(action.label)
      return
    }
    setConfirmingLabel(null)
    action.onClick()
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">
              #{order.id.slice(-6).toUpperCase()}
            </span>
            <StatusBadge status={order.status} />
          </div>
          <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
            {order.table_number && <span>Table {order.table_number}</span>}
            {order.customer_name && <span>{order.customer_name}</span>}
            <span>{formatDistanceToNow(order.created_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-semibold text-sm">{formatPrice(Number(order.total_amount))}</span>
          {onEdit && (
            <button
              onClick={onEdit}
              className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Items */}
      <ul className="space-y-1">
        {order.order_items.map((item) => (
          <li key={item.id} className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {item.menu_items.name}
            </span>
            <span className="font-medium">×{item.quantity}</span>
          </li>
        ))}
      </ul>

      {order.customer_note && (
        <p className="text-xs text-muted-foreground italic border-t border-border pt-2">
          Note: {order.customer_note}
        </p>
      )}

      {/* Actions */}
      {actions.length > 0 && (
        <div className="space-y-2 pt-1">
          {confirmingLabel && (
            <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
              <p className="flex-1 text-xs font-medium">Are you sure?</p>
              <button
                onClick={() => {
                  const action = actions.find((a) => a.label === confirmingLabel)
                  if (action) {
                    setConfirmingLabel(null)
                    action.onClick()
                  }
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Yes, {confirmingLabel.toLowerCase()}
              </button>
              <button
                onClick={() => setConfirmingLabel(null)}
                className="text-xs px-3 py-1.5 rounded-lg bg-foreground text-background hover:opacity-90 transition-colors"
              >
                No
              </button>
            </div>
          )}
          <div className="flex gap-2 mt-1">
            {actions.map((action) => (
              <button
                key={action.label}
                onClick={() => handleActionClick(action)}
                disabled={action.loading}
                className={[
                  'flex-1 rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50',
                  confirmingLabel === action.label
                    ? 'ring-2 ring-foreground'
                    : '',
                  action.variant === 'secondary'
                    ? 'border border-border hover:bg-muted'
                    : action.variant === 'danger'
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-foreground text-background hover:opacity-90',
                ].join(' ')}
              >
                {action.loading ? '…' : action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
