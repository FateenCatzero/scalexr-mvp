'use client'

import { ClipboardList } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useMasterLogs } from '@/lib/queries/master'
import type { AdminLog } from '@/lib/types'

const ACTION_LABELS: Record<string, string> = {
  create_restaurant: 'Created restaurant',
  activate_restaurant: 'Activated restaurant',
  suspend_restaurant: 'Suspended restaurant',
}

function formatAction(log: AdminLog) {
  return ACTION_LABELS[log.action] ?? log.action
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  }) + ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export default function MasterLogsClient() {
  const { data: logs = [], isLoading } = useMasterLogs()

  return (
    <div className="px-4 pt-6 space-y-4">
      <h2 className="font-bold text-base">Audit logs</h2>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((n) => <Skeleton key={n} className="h-16 rounded-xl" />)}
        </div>
      ) : !logs.length ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <ClipboardList className="w-8 h-8 opacity-40" />
          <p className="text-sm">No log entries yet.</p>
          <p className="text-xs text-center max-w-xs">
            Actions like creating or suspending restaurants will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2 pb-4">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-xl border border-border bg-card px-4 py-3 space-y-1"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{formatAction(log)}</p>
                <span className={[
                  'text-xs px-2 py-0.5 rounded-full shrink-0',
                  log.action === 'suspend_restaurant'
                    ? 'bg-destructive/10 text-destructive'
                    : log.action === 'activate_restaurant'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground',
                ].join(' ')}>
                  {log.action.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                {log.users?.email && <span>by {log.users.email}</span>}
                {log.restaurants?.name && <span>· {log.restaurants.name}</span>}
                {log.payload && Object.keys(log.payload).length > 0 && (
                  <span className="font-mono text-muted-foreground/60 truncate max-w-[160px]">
                    {JSON.stringify(log.payload)}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground/60">{formatTime(log.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
