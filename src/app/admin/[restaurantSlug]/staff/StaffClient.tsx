'use client'

// StaffClient — restaurant admin's staff management page.
//
// Features:
//   - Live staff list with online/offline status (polling every 30s)
//   - Search by name or email
//   - Filter by role (all / waiter / kitchen / restaurant_admin)
//   - Filter by online status (all / online / offline)
//   - Per-card actions: change role, toggle active/inactive, remove
//   - Add Staff modal (looks up by email, assigns role)
//
// Online threshold: last_active_at within the past 3 minutes (matches the
// upsert_staff_activity() RPC and is also derived here in the client for display).
//
// Security: all mutations go through restaurant_users which has admin-only RLS.
// Cross-restaurant access is impossible — all queries are scoped to restaurant.id.

import { useState, useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { UserPlus, Search, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useStaffList,
  useAddStaff,
  useUpdateStaffRole,
  useToggleStaffActive,
  useRemoveStaff,
} from '@/lib/queries/adminStaff'
import type { RestaurantRole, StaffMember } from '@/lib/types'

// Three minutes in milliseconds — matches the server-side online threshold.
const ONLINE_THRESHOLD_MS = 3 * 60 * 1000

function isOnline(lastActiveAt: string | null): boolean {
  if (!lastActiveAt) return false
  return Date.now() - new Date(lastActiveAt).getTime() < ONLINE_THRESHOLD_MS
}

function formatLastActive(lastActiveAt: string | null): string {
  if (!lastActiveAt) return 'Never'
  return formatDistanceToNow(new Date(lastActiveAt), { addSuffix: true })
}

const ROLE_LABELS: Record<RestaurantRole, string> = {
  restaurant_admin: 'Admin',
  waiter:           'Waiter',
  kitchen:          'Kitchen',
}

const ROLE_COLORS: Record<RestaurantRole, string> = {
  restaurant_admin: 'bg-purple-100 text-purple-800',
  waiter:           'bg-blue-100 text-blue-800',
  kitchen:          'bg-orange-100 text-orange-800',
}

interface StaffClientProps {
  restaurant: { id: string; name: string; slug: string }
  // The currently logged-in admin's user ID. Used to disable the role selector on
  // the admin's own card — self-role-change is blocked server-side by update_staff_role
  // RPC (raises 'cannot_change_own_role') but blocking it in the UI provides instant feedback.
  currentUserId: string
}

export default function StaffClient({ restaurant, currentUserId }: StaffClientProps) {
  const [search, setSearch]         = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [onlineFilter, setOnlineFilter] = useState<string>('all')
  const [addOpen, setAddOpen]       = useState(false)

  const { data: staff, isLoading } = useStaffList(restaurant.id)

  // Apply search + role + online filters client-side.
  // The list is typically small (<50 staff) so client filtering is fine.
  const filtered = useMemo(() => {
    if (!staff) return []
    return staff.filter((s) => {
      const matchesSearch =
        !search ||
        (s.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase())

      const matchesRole = roleFilter === 'all' || s.role === roleFilter

      const online = isOnline(s.last_active_at)
      const matchesOnline =
        onlineFilter === 'all' ||
        (onlineFilter === 'online' && online) ||
        (onlineFilter === 'offline' && !online)

      return matchesSearch && matchesRole && matchesOnline
    })
  }, [staff, search, roleFilter, onlineFilter])

  const onlineCount = useMemo(
    () => (staff ?? []).filter((s) => isOnline(s.last_active_at)).length,
    [staff]
  )

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Staff</h1>
          <p className="text-sm text-muted-foreground">
            {staff?.length ?? 0} members · {onlineCount} online
          </p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add Staff
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={roleFilter} onValueChange={(v) => v && setRoleFilter(v)}>
            <SelectTrigger className="flex-1 text-sm">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="waiter">Waiter</SelectItem>
              <SelectItem value="kitchen">Kitchen</SelectItem>
              <SelectItem value="restaurant_admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Select value={onlineFilter} onValueChange={(v) => v && setOnlineFilter(v)}>
            <SelectTrigger className="flex-1 text-sm">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">
            {staff?.length === 0
              ? 'No staff members yet. Add someone to get started.'
              : 'No staff match your filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((member) => (
            <StaffCard
              key={member.restaurant_user_id}
              member={member}
              restaurantId={restaurant.id}
              isSelf={member.user_id === currentUserId}
            />
          ))}
        </div>
      )}

      {/* Add Staff Dialog */}
      <AddStaffDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        restaurantId={restaurant.id}
      />
    </div>
  )
}

// ─── STAFF CARD ───────────────────────────────────────────────────────────────

function StaffCard({
  member,
  restaurantId,
  isSelf,
}: {
  member: StaffMember
  restaurantId: string
  isSelf: boolean  // true when this card represents the currently logged-in admin
}) {
  const online = isOnline(member.last_active_at)
  const updateRole   = useUpdateStaffRole(restaurantId)
  const toggleActive = useToggleStaffActive(restaurantId)
  const remove       = useRemoveStaff(restaurantId)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [roleError, setRoleError] = useState<string | null>(null)

  return (
    <div
      className={[
        'rounded-xl border p-4 space-y-3 transition-opacity',
        !member.is_active ? 'opacity-50' : '',
      ].join(' ')}
    >
      {/* Top row: name, email, status, role */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {/* Online indicator dot */}
            <span
              className={[
                'w-2 h-2 rounded-full shrink-0',
                online ? 'bg-green-500' : 'bg-muted-foreground/40',
              ].join(' ')}
              title={online ? 'Online' : 'Offline'}
            />
            <p className="font-medium text-sm truncate">
              {member.full_name ?? member.email}
            </p>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {member.email}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {online ? 'Online now' : `Last seen ${formatLastActive(member.last_active_at)}`}
          </p>
        </div>
        {/* Role badge */}
        <span
          className={[
            'text-xs font-medium px-2 py-0.5 rounded-full shrink-0',
            ROLE_COLORS[member.role],
          ].join(' ')}
        >
          {ROLE_LABELS[member.role]}
        </span>
      </div>

      {/* Performance stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <StatPill label="Confirmed" value={member.orders_confirmed} />
        <StatPill label="Delivered" value={member.orders_delivered} />
        <StatPill label="Cancelled" value={member.orders_cancelled} />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
        {/* Change role — disabled for the admin's own card to prevent self-lockout */}
        <Select
          value={member.role}
          onValueChange={(role) => {
            setRoleError(null)
            updateRole.mutate(
              { restaurantUserId: member.restaurant_user_id, role: role as RestaurantRole },
              { onError: (err) => setRoleError((err as Error).message) },
            )
          }}
          disabled={updateRole.isPending || isSelf}
        >
          <SelectTrigger className="h-7 text-xs flex-1 min-w-[110px]" title={isSelf ? 'You cannot change your own role' : undefined}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="waiter">Waiter</SelectItem>
            <SelectItem value="kitchen">Kitchen</SelectItem>
            <SelectItem value="restaurant_admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        {roleError && (
          <p className="w-full text-xs text-destructive">{roleError}</p>
        )}

        {/* Toggle active */}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          disabled={toggleActive.isPending}
          onClick={() =>
            toggleActive.mutate({
              restaurantUserId: member.restaurant_user_id,
              isActive: !member.is_active,
            })
          }
        >
          {member.is_active ? 'Deactivate' : 'Activate'}
        </Button>

        {/* Remove — requires confirmation */}
        {confirmRemove ? (
          <div className="flex gap-1 ml-auto">
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs"
              disabled={remove.isPending}
              onClick={() => {
                remove.mutate(member.restaurant_user_id)
                setConfirmRemove(false)
              }}
            >
              Confirm
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setConfirmRemove(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-destructive hover:text-destructive ml-auto"
            onClick={() => setConfirmRemove(true)}
          >
            Remove
          </Button>
        )}
      </div>
    </div>
  )
}

// Small stat pill used in the performance row of each staff card.
function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted rounded-lg py-1.5">
      <p className="text-base font-bold leading-tight">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}

// ─── ADD STAFF DIALOG ─────────────────────────────────────────────────────────

const ERROR_MESSAGES: Record<string, string> = {
  user_not_found:
    'No account found with that email. The person must sign up on ScaleXR before they can be added.',
  already_member: 'This person is already a member of this restaurant.',
  unauthorized:   'You do not have permission to add staff.',
}

function AddStaffDialog({
  open,
  onClose,
  restaurantId,
}: {
  open: boolean
  onClose: () => void
  restaurantId: string
}) {
  const [email, setEmail] = useState('')
  const [role, setRole]   = useState<RestaurantRole>('waiter')
  const [error, setError] = useState<string | null>(null)

  const addStaff = useAddStaff(restaurantId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await addStaff.mutateAsync({ email, role })
      setEmail('')
      setRole('waiter')
      onClose()
    } catch (err) {
      const msg = (err as Error).message
      setError(ERROR_MESSAGES[msg] ?? 'Something went wrong. Please try again.')
    }
  }

  const handleClose = () => {
    setEmail('')
    setRole('waiter')
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Staff Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="staff-email">Email address</Label>
            <Input
              id="staff-email"
              type="email"
              placeholder="staff@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="staff-role">Role</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as RestaurantRole)}
            >
              <SelectTrigger id="staff-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="waiter">Waiter — floor staff, confirms and delivers orders</SelectItem>
                <SelectItem value="kitchen">Kitchen — prepares orders, marks ready</SelectItem>
                <SelectItem value="restaurant_admin">Admin — full access to this restaurant's panel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={addStaff.isPending || !email}>
              {addStaff.isPending ? 'Adding…' : 'Add Staff'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
