-- ScaleXR — Staff System
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
--
-- What this adds:
--   1. is_active column on restaurant_users (soft-deactivate staff)
--   2. staff_activity table (heartbeat-based online presence)
--   3. staff_performance table (cumulative order counters per staff member)
--   4. RLS policies for both new tables + expanded restaurant_users policies
--   5. RPCs: upsert_staff_activity, increment_staff_performance,
--            get_restaurant_staff, add_staff_by_email

-- ─── 1. SOFT-DEACTIVATE COLUMN ───────────────────────────────────────────────
-- Allows admins to deactivate a staff account without removing the link.
-- Deactivated staff can still log in to Supabase Auth but should be blocked
-- at the layout level (requireStaffAccess checks this column if needed).
alter table restaurant_users
  add column if not exists is_active boolean not null default true;

-- ─── 2. STAFF ACTIVITY ───────────────────────────────────────────────────────
-- One row per (user, restaurant). Updated every 30 seconds by the heartbeat
-- hook running in WaiterClient / KitchenClient. "Online" is derived at query
-- time: last_active_at > now() - interval '3 minutes'.
create table if not exists staff_activity (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references public.users(id) on delete cascade,
  restaurant_id  uuid not null references restaurants(id) on delete cascade,
  last_active_at timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  unique(user_id, restaurant_id)
);

create index if not exists idx_staff_activity_restaurant
  on staff_activity(restaurant_id, last_active_at desc);

-- ─── 3. STAFF PERFORMANCE ────────────────────────────────────────────────────
-- Cumulative counters per staff member per restaurant. Incremented atomically
-- via the increment_staff_performance() RPC — never via client-side read-modify-write.
create table if not exists staff_performance (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references public.users(id) on delete cascade,
  restaurant_id     uuid not null references restaurants(id) on delete cascade,
  orders_confirmed  integer not null default 0,
  orders_preparing  integer not null default 0,
  orders_delivered  integer not null default 0,
  orders_cancelled  integer not null default 0,
  updated_at        timestamptz not null default now(),
  unique(user_id, restaurant_id)
);

create index if not exists idx_staff_performance_restaurant
  on staff_performance(restaurant_id);

-- ─── 4. RLS ──────────────────────────────────────────────────────────────────
alter table staff_activity    enable row level security;
alter table staff_performance enable row level security;

-- staff_activity: each staff member can only insert/update their own row.
-- Any member of the same restaurant (staff or admin) can read all rows —
-- needed so the admin panel can display online status for all staff.
create policy "Staff upsert own activity"
  on staff_activity for insert
  with check (auth.uid() = user_id);

create policy "Staff update own activity"
  on staff_activity for update
  using (auth.uid() = user_id);

create policy "Restaurant members read activity"
  on staff_activity for select
  using (
    auth.uid() in (
      select user_id from restaurant_users
      where restaurant_id = staff_activity.restaurant_id
    )
  );

-- staff_performance: same pattern — each staff writes their own, restaurant
-- members can read all.
create policy "Staff upsert own performance"
  on staff_performance for insert
  with check (auth.uid() = user_id);

create policy "Staff update own performance"
  on staff_performance for update
  using (auth.uid() = user_id);

create policy "Restaurant members read performance"
  on staff_performance for select
  using (
    auth.uid() in (
      select user_id from restaurant_users
      where restaurant_id = staff_performance.restaurant_id
    )
  );

-- restaurant_users: add policies for admin read-all + update + delete.
-- The existing "Users can read own restaurant links" policy is kept as-is;
-- this new policy OR's on top of it so admins see all staff in their restaurant.
create policy "Admins read restaurant staff"
  on restaurant_users for select
  using (
    -- restaurant_admin can read all links for their restaurant
    auth.uid() in (
      select user_id from restaurant_users ru2
      where ru2.restaurant_id = restaurant_users.restaurant_id
        and ru2.role = 'restaurant_admin'
    )
    or
    -- master_admin can read any
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'master_admin'
    )
  );

create policy "Admins update restaurant staff"
  on restaurant_users for update
  using (
    auth.uid() in (
      select user_id from restaurant_users ru2
      where ru2.restaurant_id = restaurant_users.restaurant_id
        and ru2.role = 'restaurant_admin'
    )
    or
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'master_admin'
    )
  );

create policy "Admins delete restaurant staff"
  on restaurant_users for delete
  using (
    auth.uid() in (
      select user_id from restaurant_users ru2
      where ru2.restaurant_id = restaurant_users.restaurant_id
        and ru2.role = 'restaurant_admin'
    )
    or
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'master_admin'
    )
  );

-- ─── 5. RPCs ─────────────────────────────────────────────────────────────────

-- upsert_staff_activity
-- Called by the heartbeat hook every 30 seconds. SECURITY INVOKER means it runs
-- as the calling staff user, so the RLS "Staff upsert/update own activity" policy
-- enforces they can only touch their own row (user_id = auth.uid()).
create or replace function upsert_staff_activity(p_restaurant_id uuid)
returns void language plpgsql security invoker as $$
begin
  insert into staff_activity (user_id, restaurant_id, last_active_at)
  values (auth.uid(), p_restaurant_id, now())
  on conflict (user_id, restaurant_id)
  do update set last_active_at = now();
end;
$$;

-- increment_staff_performance
-- Called after a staff member changes an order status. Uses a case expression
-- to increment only the relevant counter. SECURITY INVOKER keeps RLS enforcement.
-- p_counter must be one of: orders_confirmed, orders_preparing, orders_delivered,
-- orders_cancelled. Invalid values are silently ignored (no-op).
create or replace function increment_staff_performance(
  p_restaurant_id uuid,
  p_counter       text
)
returns void language plpgsql security invoker as $$
begin
  insert into staff_performance (
    user_id, restaurant_id,
    orders_confirmed, orders_preparing, orders_delivered, orders_cancelled
  )
  values (
    auth.uid(), p_restaurant_id,
    case when p_counter = 'orders_confirmed'  then 1 else 0 end,
    case when p_counter = 'orders_preparing'  then 1 else 0 end,
    case when p_counter = 'orders_delivered'  then 1 else 0 end,
    case when p_counter = 'orders_cancelled'  then 1 else 0 end
  )
  on conflict (user_id, restaurant_id)
  do update set
    orders_confirmed  = staff_performance.orders_confirmed
                        + case when p_counter = 'orders_confirmed'  then 1 else 0 end,
    orders_preparing  = staff_performance.orders_preparing
                        + case when p_counter = 'orders_preparing'  then 1 else 0 end,
    orders_delivered  = staff_performance.orders_delivered
                        + case when p_counter = 'orders_delivered'  then 1 else 0 end,
    orders_cancelled  = staff_performance.orders_cancelled
                        + case when p_counter = 'orders_cancelled'  then 1 else 0 end,
    updated_at = now();
end;
$$;

-- get_restaurant_staff
-- Returns all staff members for a restaurant with joined activity + performance data.
-- SECURITY DEFINER runs as the function owner (bypasses RLS on the joined tables).
-- Authorization is enforced inline: the caller must be a restaurant_admin for this
-- restaurant, or a master_admin. Returns empty if the caller is unauthorized.
create or replace function get_restaurant_staff(p_restaurant_id uuid)
returns table (
  restaurant_user_id  uuid,
  user_id             uuid,
  email               text,
  full_name           text,
  role                text,
  is_active           boolean,
  last_active_at      timestamptz,
  orders_confirmed    integer,
  orders_preparing    integer,
  orders_delivered    integer,
  orders_cancelled    integer
) language sql security definer as $$
  select
    ru.id                                    as restaurant_user_id,
    u.id                                     as user_id,
    u.email,
    u.full_name,
    ru.role::text,
    ru.is_active,
    sa.last_active_at,
    coalesce(sp.orders_confirmed, 0)         as orders_confirmed,
    coalesce(sp.orders_preparing, 0)         as orders_preparing,
    coalesce(sp.orders_delivered, 0)         as orders_delivered,
    coalesce(sp.orders_cancelled, 0)         as orders_cancelled
  from restaurant_users ru
  join public.users u
    on u.id = ru.user_id
  left join staff_activity sa
    on sa.user_id = ru.user_id
   and sa.restaurant_id = ru.restaurant_id
  left join staff_performance sp
    on sp.user_id = ru.user_id
   and sp.restaurant_id = ru.restaurant_id
  where ru.restaurant_id = p_restaurant_id
    and (
      -- caller is restaurant_admin for this restaurant
      exists (
        select 1 from restaurant_users caller_ru
        where caller_ru.user_id = auth.uid()
          and caller_ru.restaurant_id = p_restaurant_id
          and caller_ru.role = 'restaurant_admin'
      )
      or
      -- caller is master_admin
      exists (
        select 1 from public.users caller_u
        where caller_u.id = auth.uid()
          and caller_u.role = 'master_admin'
      )
    );
$$;

-- add_staff_by_email
-- Looks up a user by email and adds them to restaurant_users with the given role.
-- SECURITY DEFINER so the function can read public.users freely.
-- Returns a JSON object with either {success: true} or {error: 'reason'}.
-- Possible error values:
--   'unauthorized'     — caller is not an admin for this restaurant
--   'user_not_found'   — no account found with that email
--   'already_member'   — user already has a restaurant_users row here
create or replace function add_staff_by_email(
  p_restaurant_id uuid,
  p_email         text,
  p_role          text
)
returns json language plpgsql security definer as $$
declare
  v_user_id uuid;
  v_exists  boolean;
begin
  -- authorization check
  if not (
    exists (
      select 1 from restaurant_users
      where user_id = auth.uid()
        and restaurant_id = p_restaurant_id
        and role = 'restaurant_admin'
    )
    or
    exists (
      select 1 from public.users
      where id = auth.uid()
        and role = 'master_admin'
    )
  ) then
    return json_build_object('error', 'unauthorized');
  end if;

  -- find the user
  select id into v_user_id
  from public.users
  where lower(email) = lower(p_email)
  limit 1;

  if v_user_id is null then
    return json_build_object('error', 'user_not_found');
  end if;

  -- check if already a member
  select exists (
    select 1 from restaurant_users
    where restaurant_id = p_restaurant_id and user_id = v_user_id
  ) into v_exists;

  if v_exists then
    return json_build_object('error', 'already_member');
  end if;

  -- insert
  insert into restaurant_users (restaurant_id, user_id, role)
  values (p_restaurant_id, v_user_id, p_role::user_role);

  return json_build_object('success', true);
end;
$$;

-- Realtime: broadcast staff_activity changes so the admin panel refreshes
-- online status without polling.
alter publication supabase_realtime add table staff_activity;
