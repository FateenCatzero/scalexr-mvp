// adminStaff.ts — TanStack Query hooks for restaurant admin staff management.
//
// All hooks use the ['staff', restaurantId] query key namespace so they can be
// invalidated together when any staff mutation succeeds.
//
// Hooks:
//   useStaffList        — fetches all staff members via get_restaurant_staff() RPC
//   useAddStaff         — adds a user by email via add_staff_by_email() RPC
//   useUpdateStaffRole  — changes a staff member's role in restaurant_users
//   useToggleStaffActive — flips is_active on a restaurant_users row
//   useRemoveStaff      — deletes the restaurant_users row (does NOT delete Auth user)
//
// Security: all write operations hit restaurant_users which has admin-only RLS.
// The add and list operations go through security-definer RPCs that include
// inline auth checks. No cross-restaurant access is possible.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { RestaurantRole, StaffMember } from '@/lib/types'

// ─── QUERIES ──────────────────────────────────────────────────────────────────

// Fetches all staff members for a restaurant, including joined activity and
// performance data. Polls every 30 seconds to refresh online status without
// requiring a full Realtime subscription (the heartbeat granularity is 30s,
// so polling at the same rate is sufficient).
export function useStaffList(restaurantId: string) {
  return useQuery({
    queryKey: ['staff', restaurantId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .rpc('get_restaurant_staff', { p_restaurant_id: restaurantId })
      if (error) throw error
      return (data ?? []) as StaffMember[]
    },
    enabled: !!restaurantId,
    refetchInterval: 30_000, // keep online status fresh
  })
}

// ─── MUTATIONS ────────────────────────────────────────────────────────────────

// Adds a staff member by email. Returns the RPC result JSON so the UI can
// display a meaningful error if the user isn't found or is already a member.
//
// Possible result shapes:
//   { success: true }
//   { error: 'user_not_found' }
//   { error: 'already_member' }
//   { error: 'unauthorized' }
export function useAddStaff(restaurantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: RestaurantRole }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .rpc('add_staff_by_email', {
          p_restaurant_id: restaurantId,
          p_email:         email.trim().toLowerCase(),
          p_role:          role,
        })
      if (error) throw error
      // The RPC returns JSON — parse the error field if present.
      const result = data as { success?: boolean; error?: string }
      if (result?.error) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', restaurantId] })
    },
  })
}

// Changes a staff member's role via the update_staff_role RPC.
//
// The RPC (not a direct table update) is required because:
//   1. It updates BOTH restaurant_users.role AND users.role atomically.
//      Updating only restaurant_users.role causes an infinite login redirect loop.
//   2. It prevents an admin from changing their own role, which would remove
//      the last restaurant_admin and make the staff list inaccessible to everyone.
//   3. It enforces the admin-only auth check server-side (SECURITY DEFINER).
//
// RPC raises exceptions with these codes:
//   'staff_not_found'        — restaurant_user_id doesn't exist
//   'cannot_change_own_role' — admin attempted self-role-change (blocked in UI too)
//   'unauthorized'           — caller is not admin for this restaurant
const ROLE_ERROR_MESSAGES: Record<string, string> = {
  staff_not_found:        'Staff member not found.',
  cannot_change_own_role: 'You cannot change your own role.',
  unauthorized:           'You do not have permission to change roles.',
}

export function useUpdateStaffRole(restaurantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      restaurantUserId,
      role,
    }: {
      restaurantUserId: string
      role: RestaurantRole
    }) => {
      const supabase = createClient()
      const { error } = await supabase
        .rpc('update_staff_role', {
          p_restaurant_user_id: restaurantUserId,
          p_role:               role,
        })
      if (error) {
        // Postgres RAISE EXCEPTION puts the message in error.message
        const friendly = ROLE_ERROR_MESSAGES[error.message] ?? 'Failed to update role.'
        throw new Error(friendly)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', restaurantId] })
    },
  })
}

// Flips is_active on a restaurant_users row. Deactivated staff are still in the
// table (so their history is preserved) but are blocked from accessing the staff
// portal at the layout level via requireStaffAccess().
export function useToggleStaffActive(restaurantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      restaurantUserId,
      isActive,
    }: {
      restaurantUserId: string
      isActive: boolean
    }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('restaurant_users')
        .update({ is_active: isActive })
        .eq('id', restaurantUserId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', restaurantId] })
    },
  })
}

// Removes a staff member from this restaurant by deleting their restaurant_users row.
// Does NOT touch Supabase Auth — the user's account is preserved. They simply lose
// access to this restaurant's staff portal.
export function useRemoveStaff(restaurantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (restaurantUserId: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('restaurant_users')
        .delete()
        .eq('id', restaurantUserId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', restaurantId] })
    },
  })
}
