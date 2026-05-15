-- ============================================================
-- MIGRATION 007 — Master Admin RLS + user profile policies
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── HELPER FUNCTION ────────────────────────────────────────
-- Returns true when the calling user has the master_admin role.
-- security definer so it can read public.users without triggering RLS.
create or replace function is_master_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'master_admin'
  );
$$;

-- ─── PUBLIC.USERS — self-read + self-insert (needed for login role check & signup) ──
-- Users can read their own profile (needed so login page can check role)
create policy "Users can read own profile"
  on public.users for select
  using (id = auth.uid());

-- Users can insert their own profile row (needed during signup)
create policy "Users can insert own profile"
  on public.users for insert
  with check (id = auth.uid());

-- ─── RESTAURANTS ────────────────────────────────────────────
-- master_admin can see ALL restaurants, including inactive ones.
-- (The existing "public read restaurants" policy only shows is_active = true;
--  multiple permissive SELECT policies are OR-d together by Postgres.)
create policy "master_admin read all restaurants"
  on restaurants for select
  using (is_master_admin());

-- master_admin can create new restaurants
create policy "master_admin insert restaurants"
  on restaurants for insert
  with check (is_master_admin());

-- master_admin can update any restaurant (e.g. suspend via is_active)
create policy "master_admin update restaurants"
  on restaurants for update
  using (is_master_admin());

-- ─── PUBLIC.USERS (master admin view) ───────────────────────
-- master_admin can read all user profiles
create policy "master_admin read all users"
  on public.users for select
  using (is_master_admin());

-- master_admin can update user roles
create policy "master_admin update users"
  on public.users for update
  using (is_master_admin());

-- master_admin can insert user profiles (when creating restaurant admin accounts)
create policy "master_admin insert users"
  on public.users for insert
  with check (is_master_admin());

-- ─── RESTAURANT_USERS ───────────────────────────────────────
-- master_admin can fully manage all restaurant ↔ user links
create policy "master_admin manage restaurant_users"
  on restaurant_users for all
  using (is_master_admin())
  with check (is_master_admin());

-- ─── ORDERS ─────────────────────────────────────────────────
-- master_admin can read all orders across every restaurant
create policy "master_admin read all orders"
  on orders for select
  using (is_master_admin());

-- ─── ANALYTICS EVENTS ───────────────────────────────────────
-- master_admin can read all analytics events
create policy "master_admin read all analytics_events"
  on analytics_events for select
  using (is_master_admin());

-- ─── ADMIN LOGS ─────────────────────────────────────────────
-- master_admin can read and write audit logs for all restaurants
create policy "master_admin manage admin_logs"
  on admin_logs for all
  using (is_master_admin())
  with check (is_master_admin());
