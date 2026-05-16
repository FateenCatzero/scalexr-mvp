import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Combines multiple class names and resolves Tailwind conflicts.
// Used everywhere instead of raw `className` concatenation — e.g.
// cn('px-4', condition && 'bg-red-500', 'hover:bg-blue-500') works correctly
// even if class names conflict (tailwind-merge picks the last one).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formats a price number as Pakistani Rupees with no decimal places.
// All prices in the database are stored as plain numbers (e.g. 850).
// This produces "PKR 850" or "PKR 1,250" with locale-aware comma separators.
export function formatPrice(amount: number): string {
  return `PKR ${Math.round(amount).toLocaleString()}`
}

// A custom relative time formatter — does NOT use date-fns or any library.
// Converts an ISO date string to a human-readable "time ago" label:
//   < 1 minute  → "just now"
//   < 60 minutes → "Xm ago"
//   ≥ 60 minutes → "Xh ago"
// Used in order cards and dashboards wherever a timestamp needs to be shown.
export function formatDistanceToNow(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ago`
}
