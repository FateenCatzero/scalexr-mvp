// Thin page — no server-side data fetching needed since MasterLogsClient fetches
// its own data via useMasterLogs (a TanStack Query hook). Auth is enforced by the
// parent layout at /admin/master/layout.tsx (requires master_admin role).
import MasterLogsClient from './MasterLogsClient'

export default function MasterLogsPage() {
  return <MasterLogsClient />
}
