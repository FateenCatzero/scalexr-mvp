-- Migration 012: Restaurant Branding System
--
-- Extends restaurant_settings with branding/theme columns.
-- Adds new feature keys: cart, ratings, top_selling, most_viewed, best_rated.
--
-- Existing RLS policies from migration 010 already protect the entire
-- restaurant_settings table row — no new policies needed for new columns.
--
-- Run in Supabase Dashboard → SQL Editor → New Query → Run

-- ─── BRANDING COLUMNS ─────────────────────────────────────────────────────────

ALTER TABLE restaurant_settings
  ADD COLUMN IF NOT EXISTS primary_color          text    NOT NULL DEFAULT '#09090b',
  ADD COLUMN IF NOT EXISTS secondary_color        text    NOT NULL DEFAULT '#18181b',
  ADD COLUMN IF NOT EXISTS accent_color           text    NOT NULL DEFAULT '#f97316',
  ADD COLUMN IF NOT EXISTS background_type        text    NOT NULL DEFAULT 'solid',
  ADD COLUMN IF NOT EXISTS background_value       text    NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS button_style           text    NOT NULL DEFAULT 'rounded',
  ADD COLUMN IF NOT EXISTS font_family            text    NOT NULL DEFAULT 'inter',
  -- Controls which portals the restaurant's custom theme is applied to.
  -- Master admin sets these — restaurant admin cannot change portal scope.
  ADD COLUMN IF NOT EXISTS customer_theme_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_theme_enabled    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS waiter_theme_enabled   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kitchen_theme_enabled  boolean NOT NULL DEFAULT false,
  -- Controls what the restaurant admin is allowed to edit themselves.
  -- Master admin sets these — they gate the restaurant admin UI fields.
  ADD COLUMN IF NOT EXISTS allow_logo_edit              boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_color_edit             boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_menu_edit              boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_feature_toggle_edit    boolean NOT NULL DEFAULT false;

-- ─── NEW FEATURE KEYS ─────────────────────────────────────────────────────────

-- Seed new feature keys for all existing restaurants.
-- cart:        true  — ordering is core to the platform, on by default.
-- ratings, top_selling, most_viewed, best_rated: false — optional discovery features.
INSERT INTO restaurant_features (restaurant_id, feature_key, enabled)
SELECT r.id, f.feature_key, f.enabled_default
FROM restaurants r
CROSS JOIN (VALUES
  ('cart',        true),
  ('ratings',     false),
  ('top_selling', false),
  ('most_viewed', false),
  ('best_rated',  false)
) AS f(feature_key, enabled_default)
ON CONFLICT (restaurant_id, feature_key) DO NOTHING;
