// StatusBadge — coloured pill that shows the current order status.
// Used in the staff dashboards (WaiterClient, KitchenClient) and AdminDashboardClient.
// Each status maps to a distinct colour so staff can identify status at a glance.

import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/lib/types'

// Tailwind colour classes for each status — intentionally hardcoded rather than
// computed to avoid Tailwind's purge removing unused dynamic class names.
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
