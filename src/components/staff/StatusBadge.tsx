import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/lib/types'

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending:   'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-orange-100 text-orange-800',
  ready:     'bg-green-100 text-green-800',
  delivered: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending:   'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready:     'Ready',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        STATUS_STYLES[status]
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
