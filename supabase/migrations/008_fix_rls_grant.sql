-- ============================================================
-- MIGRATION 008 — Fix is_master_admin() execute permission
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- Without this, Postgres denies the `authenticated` role from calling
-- is_master_admin() when evaluating RLS policies, causing all master admin
-- insert/update operations to fail with "row-level security policy" errors.

GRANT EXECUTE ON FUNCTION is_master_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_master_admin() TO service_role;

-- Also add the update_restaurant action label to admin_logs (no schema change needed,
-- just ensuring the logAction helper can record it).
