-- Migration 004: Fix delete constraints + missing RLS policies
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run

-- ─── 1. Allow deleting menu items that appear in past orders ─────────────────
-- Previously ON DELETE RESTRICT blocked deletion of any ordered item.
-- Changing to SET NULL preserves order history; item_id just becomes null.

ALTER TABLE order_items
  ALTER COLUMN menu_item_id DROP NOT NULL;

ALTER TABLE order_items
  DROP CONSTRAINT order_items_menu_item_id_fkey;

ALTER TABLE order_items
  ADD CONSTRAINT order_items_menu_item_id_fkey
  FOREIGN KEY (menu_item_id)
  REFERENCES menu_items(id)
  ON DELETE SET NULL;

-- ─── 2. Admins can see ALL menu items (including unavailable/hidden ones) ─────
-- The Phase 1 public policy only returns is_available = true, so admins
-- couldn't see hidden items. This policy gives admins full visibility.

CREATE POLICY "Admin can select all menu items" ON menu_items
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM restaurant_users
      WHERE restaurant_id = menu_items.restaurant_id
    )
  );

-- ─── 3. Item assets RLS — run if migration 003 was never applied ──────────────
-- Safe to skip if already run (Supabase will show a duplicate error; ignore it)

ALTER TABLE item_assets
  ADD CONSTRAINT item_assets_menu_item_asset_type_unique
  UNIQUE (menu_item_id, asset_type);

CREATE POLICY "Admin can insert item assets" ON item_assets
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM restaurant_users
      WHERE restaurant_id = item_assets.restaurant_id
    )
  );

CREATE POLICY "Admin can update item assets" ON item_assets
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM restaurant_users
      WHERE restaurant_id = item_assets.restaurant_id
    )
  );

CREATE POLICY "Admin can delete item assets" ON item_assets
  FOR DELETE USING (
    auth.uid() IN (
      SELECT user_id FROM restaurant_users
      WHERE restaurant_id = item_assets.restaurant_id
    )
  );

-- ─── 4. Staff can update and delete order items (waiter cancel/modify flow) ───

CREATE POLICY "Staff can update order items" ON order_items
  FOR UPDATE USING (true);

CREATE POLICY "Staff can delete order items" ON order_items
  FOR DELETE USING (true);
