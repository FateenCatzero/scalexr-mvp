// Thin page — no server-side data fetching needed since MasterDashboardClient fetches
// its own data via useMasterRestaurants and useMasterPlatformStats. Auth is enforced
// by the parent layout at /admin/master/layout.tsx (requires master_admin role).
import MasterDashboardClient from './MasterDashboardClient'

export default function MasterDashboardPage() {
  return <MasterDashboardClient />
}
