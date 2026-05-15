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
