-- ScaleXR MVP — Initial Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
create type user_role as enum (
  'customer', 'waiter', 'kitchen', 'restaurant_admin', 'master_admin'
);

create type order_status as enum (
  'pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'
);

create type asset_type as enum (
  'image', 'model_glb', 'model_usdz', 'thumbnail', 'video'
);

-- ============================================================
-- TABLES
-- ============================================================

-- Restaurants (one row per restaurant)
create table restaurants (
  id          uuid primary key default uuid_generate_v4(),
  slug        text unique not null,
  name        text not null,
  description text,
  logo_url    text,
  theme       jsonb not null default '{}',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- User profiles (mirrors auth.users)
create table public.users (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text unique,
  full_name  text,
  avatar_url text,
  role       user_role not null default 'customer',
  created_at timestamptz not null default now()
);

-- Links users to restaurants with a role
create table restaurant_users (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  role          user_role not null,
  created_at    timestamptz not null default now(),
  unique(restaurant_id, user_id)
);

-- Menu categories
create table categories (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name          text not null,
  description   text,
  image_url     text,
  sort_order    integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Menu items
create table menu_items (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  category_id   uuid references categories(id) on delete set null,
  name          text not null,
  description   text,
  price         numeric(10,2) not null,
  image_url     text,
  has_3d_model  boolean not null default false,
  has_ar        boolean not null default false,
  is_available  boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 3D/AR assets per menu item
create table item_assets (
  id             uuid primary key default uuid_generate_v4(),
  menu_item_id   uuid not null references menu_items(id) on delete cascade,
  restaurant_id  uuid not null references restaurants(id) on delete cascade,
  asset_type     asset_type not null,
  storage_path   text not null,
  public_url     text,
  file_size_bytes bigint,
  is_optimized   boolean not null default false,
  metadata       jsonb not null default '{}',
  created_at     timestamptz not null default now()
);

-- Physical tables with QR codes
create table restaurant_tables (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  table_number  text not null,
  qr_code_url   text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  unique(restaurant_id, table_number)
);

-- Customer orders
create table orders (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  table_number  text,
  customer_name text,
  customer_note text,
  status        order_status not null default 'pending',
  total_amount  numeric(10,2) not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Line items in an order
create table order_items (
  id           uuid primary key default uuid_generate_v4(),
  order_id     uuid not null references orders(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id) on delete restrict,
  quantity     integer not null check (quantity > 0),
  unit_price   numeric(10,2) not null,
  subtotal     numeric(10,2) generated always as (quantity * unit_price) stored,
  notes        text,
  created_at   timestamptz not null default now()
);

-- Analytics event log
create table analytics_events (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  event_type    text not null,
  payload       jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

-- Admin audit trail
create table admin_logs (
  id            uuid primary key default uuid_generate_v4(),
  actor_id      uuid references public.users(id) on delete set null,
  restaurant_id uuid references restaurants(id) on delete set null,
  action        text not null,
  target_table  text,
  target_id     uuid,
  payload       jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index on categories(restaurant_id, sort_order);
create index on menu_items(restaurant_id, sort_order);
create index on menu_items(category_id);
create index on item_assets(menu_item_id);
create index on restaurant_tables(restaurant_id);
create index on orders(restaurant_id, created_at desc);
create index on orders(status);
create index on order_items(order_id);
create index on analytics_events(restaurant_id, created_at desc);

-- ============================================================
-- AUTO-UPDATE updated_at
-- ============================================================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_restaurants_updated_at
  before update on restaurants
  for each row execute function update_updated_at();

create trigger trg_categories_updated_at
  before update on categories
  for each row execute function update_updated_at();

create trigger trg_menu_items_updated_at
  before update on menu_items
  for each row execute function update_updated_at();

create trigger trg_orders_updated_at
  before update on orders
  for each row execute function update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table restaurants         enable row level security;
alter table public.users        enable row level security;
alter table restaurant_users    enable row level security;
alter table categories          enable row level security;
alter table menu_items          enable row level security;
alter table item_assets         enable row level security;
alter table restaurant_tables   enable row level security;
alter table orders              enable row level security;
alter table order_items         enable row level security;
alter table analytics_events    enable row level security;
alter table admin_logs          enable row level security;

-- ============================================================
-- RLS POLICIES (Phase 1 — anonymous customer access)
-- ============================================================

-- Public browse: restaurants, categories, menu items, assets, tables
create policy "public read restaurants"
  on restaurants for select using (is_active = true);

create policy "public read categories"
  on categories for select using (is_active = true);

create policy "public read menu items"
  on menu_items for select using (is_available = true);

create policy "public read item assets"
  on item_assets for select using (true);

create policy "public read restaurant tables"
  on restaurant_tables for select using (is_active = true);

-- Orders: anyone can create and read (no login required for Phase 1)
create policy "public insert orders"
  on orders for insert with check (true);

create policy "public read orders"
  on orders for select using (true);

create policy "public update orders status"
  on orders for update using (true);

-- Order items: anyone can create and read
create policy "public insert order items"
  on order_items for insert with check (true);

create policy "public read order items"
  on order_items for select using (true);

-- Analytics: anyone can log events
create policy "public insert analytics"
  on analytics_events for insert with check (true);

-- ============================================================
-- REALTIME (for order status page)
-- ============================================================
alter publication supabase_realtime add table orders;

-- ============================================================
-- SEED: demo restaurant for local testing
-- ============================================================
insert into restaurants (slug, name, description)
values (
  'demo',
  'Demo Restaurant',
  'A sample restaurant for local development and testing'
);
