-- Admin RLS policies + storage setup for Phase 3

-- ─── RESTAURANTS ─────────────────────────────────────────────────────────────
create policy "Admin can update own restaurant" on restaurants
  for update using (
    auth.uid() in (
      select user_id from restaurant_users where restaurant_id = restaurants.id
    )
  );

-- ─── CATEGORIES ──────────────────────────────────────────────────────────────
create policy "Admin can insert categories" on categories
  for insert with check (
    auth.uid() in (
      select user_id from restaurant_users where restaurant_id = categories.restaurant_id
    )
  );

create policy "Admin can update categories" on categories
  for update using (
    auth.uid() in (
      select user_id from restaurant_users where restaurant_id = categories.restaurant_id
    )
  );

create policy "Admin can delete categories" on categories
  for delete using (
    auth.uid() in (
      select user_id from restaurant_users where restaurant_id = categories.restaurant_id
    )
  );

-- ─── MENU ITEMS ──────────────────────────────────────────────────────────────
create policy "Admin can insert menu items" on menu_items
  for insert with check (
    auth.uid() in (
      select user_id from restaurant_users where restaurant_id = menu_items.restaurant_id
    )
  );

create policy "Admin can update menu items" on menu_items
  for update using (
    auth.uid() in (
      select user_id from restaurant_users where restaurant_id = menu_items.restaurant_id
    )
  );

create policy "Admin can delete menu items" on menu_items
  for delete using (
    auth.uid() in (
      select user_id from restaurant_users where restaurant_id = menu_items.restaurant_id
    )
  );

-- ─── RESTAURANT USERS ─────────────────────────────────────────────────────────
-- Allow users to read their own restaurant links (needed for login redirect)
create policy "Users can read own restaurant links" on restaurant_users
  for select using (auth.uid() = user_id);

-- Allow insert so signup can create the link
create policy "Users can insert own restaurant link" on restaurant_users
  for insert with check (auth.uid() = user_id);

-- ─── STORAGE BUCKET ───────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('restaurant-assets', 'restaurant-assets', true)
on conflict (id) do nothing;

create policy "Public can view restaurant assets" on storage.objects
  for select using (bucket_id = 'restaurant-assets');

create policy "Authenticated users can upload restaurant assets" on storage.objects
  for insert with check (
    auth.uid() is not null and bucket_id = 'restaurant-assets'
  );

create policy "Authenticated users can update restaurant assets" on storage.objects
  for update using (
    auth.uid() is not null and bucket_id = 'restaurant-assets'
  );

create policy "Authenticated users can delete restaurant assets" on storage.objects
  for delete using (
    auth.uid() is not null and bucket_id = 'restaurant-assets'
  );
