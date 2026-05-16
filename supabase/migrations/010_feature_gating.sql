-- Migration 010: Feature Gating System
-- Creates subscription_plans, restaurant_features, and restaurant_settings.
-- Adds plan_id FK to restaurants.
-- All RLS policies use SECURITY DEFINER helper functions to avoid recursive evaluation.
--
-- Run in Supabase Dashboard → SQL Editor → New Query → Run

-- ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

-- is_master_admin() may already exist from migration 009. CREATE OR REPLACE is safe.
CREATE OR REPLACE FUNCTION is_master_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'master_admin'
  )
$$;

-- Checks whether the calling user is a member of a given restaurant.
-- SECURITY DEFINER bypasses RLS on restaurant_users, preventing recursive policy
-- evaluation that would cause a 500 error (same root cause as the previous incident).
CREATE OR REPLACE FUNCTION is_restaurant_member(p_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM restaurant_users
    WHERE user_id = auth.uid()
      AND restaurant_id = p_restaurant_id
  )
$$;

-- ─── SUBSCRIPTION PLANS ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscription_plans (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL UNIQUE,
  price      numeric     NOT NULL DEFAULT 0,
  features   text[]      NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Plans are public read — they're not sensitive tier marketing info.
CREATE POLICY "Anyone can read plans"
ON subscription_plans FOR SELECT
USING (true);

CREATE POLICY "master_admin manage plans"
ON subscription_plans FOR ALL
USING (is_master_admin());

-- Seed the three tiers. ON CONFLICT is safe for re-runs.
INSERT INTO subscription_plans (name, price, features) VALUES
  ('basic',
   0,
   ARRAY['staff_management', 'analytics']),
  ('pro',
   9999,
   ARRAY['staff_management', 'analytics', '3d_view', 'bulk_upload']),
  ('enterprise',
   29999,
   ARRAY['staff_management', 'analytics', '3d_view', 'ar_view', 'theme_customization', 'inventory_tracking', 'bulk_upload'])
ON CONFLICT (name) DO NOTHING;

-- Add plan reference to restaurants. Nullable — null treated as basic/free.
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES subscription_plans(id);

-- ─── RESTAURANT FEATURES ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS restaurant_features (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  feature_key   text        NOT NULL,
  enabled       boolean     NOT NULL DEFAULT false,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, feature_key)
);

ALTER TABLE restaurant_features ENABLE ROW LEVEL SECURITY;

-- Restaurant members (any role) can read their own features.
-- master_admin can read all.
CREATE POLICY "Members read own restaurant features"
ON restaurant_features FOR SELECT
USING (is_restaurant_member(restaurant_id) OR is_master_admin());

-- Only master_admin can insert, update, or delete feature rows.
CREATE POLICY "master_admin manage features"
ON restaurant_features FOR ALL
USING (is_master_admin());

-- Seed default features for every existing restaurant.
-- Basic defaults: analytics + staff_management on, everything else off.
INSERT INTO restaurant_features (restaurant_id, feature_key, enabled)
SELECT r.id, f.feature_key, f.enabled_default
FROM restaurants r
CROSS JOIN (VALUES
  ('ar_view',             false),
  ('3d_view',             false),
  ('analytics',           true),
  ('theme_customization', false),
  ('inventory_tracking',  false),
  ('staff_management',    true),
  ('bulk_upload',         false)
) AS f(feature_key, enabled_default)
ON CONFLICT (restaurant_id, feature_key) DO NOTHING;

-- ─── RESTAURANT SETTINGS ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS restaurant_settings (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id        uuid        NOT NULL UNIQUE REFERENCES restaurants(id) ON DELETE CASCADE,
  logo_url             text,
  theme                jsonb       NOT NULL DEFAULT '{}',
  dark_mode_enabled    boolean     NOT NULL DEFAULT false,
  allow_guest_checkout boolean     NOT NULL DEFAULT true,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;

-- Members can read their own restaurant's settings.
CREATE POLICY "Members read own restaurant settings"
ON restaurant_settings FOR SELECT
USING (is_restaurant_member(restaurant_id) OR is_master_admin());

-- Restaurant members (admin) and master_admin can upsert settings.
-- The restaurant admin check is done via is_restaurant_member (non-recursive).
CREATE POLICY "Admins upsert own restaurant settings"
ON restaurant_settings FOR INSERT
WITH CHECK (is_restaurant_member(restaurant_id) OR is_master_admin());

CREATE POLICY "Admins update own restaurant settings"
ON restaurant_settings FOR UPDATE
USING (is_restaurant_member(restaurant_id) OR is_master_admin());

-- Seed a settings row for every existing restaurant using their current logo/theme.
INSERT INTO restaurant_settings (restaurant_id, logo_url, theme)
SELECT id, logo_url, COALESCE(theme, '{}')
FROM restaurants
ON CONFLICT (restaurant_id) DO NOTHING;
