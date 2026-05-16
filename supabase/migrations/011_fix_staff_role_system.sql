-- Migration 011: Fix Staff Role System
--
-- Problems fixed:
--   1. Self-referential UPDATE/DELETE policies on restaurant_users (from migration 009)
--      caused unpredictable 500 errors and silent failures during role changes.
--   2. useUpdateStaffRole only updated restaurant_users.role, not users.role.
--      These diverged, causing infinite login redirect loops.
--   3. No protection against admin changing their own role, which could remove
--      the last restaurant_admin and lock everyone out of the staff list.
--
-- Run in Supabase Dashboard → SQL Editor → New Query → Run

-- ─── HELPER FUNCTION ──────────────────────────────────────────────────────────

-- is_restaurant_admin: SECURITY DEFINER so it bypasses RLS on restaurant_users.
-- Used by non-recursive UPDATE/DELETE policies below.
CREATE OR REPLACE FUNCTION is_restaurant_admin(p_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM restaurant_users
    WHERE user_id    = auth.uid()
      AND restaurant_id = p_restaurant_id
      AND role       = 'restaurant_admin'
  )
$$;

-- ─── FIX SELF-REFERENTIAL POLICIES ───────────────────────────────────────────

-- Drop the self-referential policies from migration 009.
-- These queried restaurant_users from inside restaurant_users RLS evaluation,
-- which caused recursive policy execution.
DROP POLICY IF EXISTS "Admins update restaurant staff" ON restaurant_users;
DROP POLICY IF EXISTS "Admins delete restaurant staff" ON restaurant_users;

-- Recreate using SECURITY DEFINER helpers — no recursion possible.
CREATE POLICY "Admins update restaurant staff"
ON restaurant_users FOR UPDATE
USING (is_restaurant_admin(restaurant_id) OR is_master_admin());

CREATE POLICY "Admins delete restaurant staff"
ON restaurant_users FOR DELETE
USING (is_restaurant_admin(restaurant_id) OR is_master_admin());

-- ─── ATOMIC ROLE UPDATE RPC ───────────────────────────────────────────────────

-- update_staff_role
-- Replaces the direct restaurant_users UPDATE in useUpdateStaffRole.
-- Runs as SECURITY DEFINER (bypasses RLS) with explicit inline auth checks.
--
-- What it does that the old client-side update did NOT:
--   1. Verifies the caller is restaurant_admin (or master_admin) for this restaurant.
--   2. Prevents an admin from changing their own role (would lock out the staff list).
--   3. Updates BOTH restaurant_users.role AND users.role atomically so they never diverge.
--
-- Raises exceptions (not JSON errors) so the client mutation throws and the error
-- is visible. Exception codes:
--   'staff_not_found'        — restaurant_user_id doesn't exist
--   'cannot_change_own_role' — admin attempted self-role-change
--   'unauthorized'           — caller is not admin for this restaurant
CREATE OR REPLACE FUNCTION update_staff_role(
  p_restaurant_user_id uuid,
  p_role               text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_user_id  uuid;
  v_restaurant_id   uuid;
BEGIN
  -- Resolve the row being updated
  SELECT user_id, restaurant_id
  INTO   v_target_user_id, v_restaurant_id
  FROM   restaurant_users
  WHERE  id = p_restaurant_user_id;

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'staff_not_found';
  END IF;

  -- Prevent self-role-change: an admin changing their own role could remove
  -- the last restaurant_admin, making the staff list inaccessible to everyone.
  IF v_target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot_change_own_role';
  END IF;

  -- Auth check: caller must be restaurant_admin for this restaurant or master_admin.
  -- Done inline (not via RLS) because this is SECURITY DEFINER.
  IF NOT (
    EXISTS (
      SELECT 1 FROM restaurant_users
      WHERE  user_id        = auth.uid()
        AND  restaurant_id  = v_restaurant_id
        AND  role           = 'restaurant_admin'
    )
    OR is_master_admin()
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Update restaurant_users.role (tenant-scoped role)
  UPDATE restaurant_users
  SET    role = p_role::user_role
  WHERE  id   = p_restaurant_user_id;

  -- Sync users.role (platform-level role) so auth.ts and middleware never
  -- see a diverged state. Without this, users.role says 'restaurant_admin'
  -- while restaurant_users.role says 'kitchen', causing an infinite redirect loop.
  UPDATE public.users
  SET    role = p_role::user_role
  WHERE  id   = v_target_user_id;
END;
$$;
