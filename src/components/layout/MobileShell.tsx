// MobileShell — layout wrapper that centres and caps content at mobile width.
// All customer-facing pages wrap their content in this component to ensure
// the layout looks correct on both phones (full width) and desktops (capped at md).
// `className` allows callers to add padding or other overrides.

import { cn } from '@/lib/utils'

interface MobileShellProps {
  children: React.ReactNode
  className?: string
}

export default function MobileShell({ children, className }: MobileShellProps) {
  return (
    <div className={cn('mx-auto max-w-md min-h-screen relative', className)}>
      {children}
    </div>
  )
}
