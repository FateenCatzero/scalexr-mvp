-- Unique constraint so upsert on (menu_item_id, asset_type) works
alter table item_assets
  add constraint item_assets_menu_item_asset_type_unique
  unique (menu_item_id, asset_type);

-- RLS policies for item_assets (admins of the restaurant can manage)
create policy "Admin can insert item assets" on item_assets
  for insert with check (
    auth.uid() in (
      select user_id from restaurant_users where restaurant_id = item_assets.restaurant_id
    )
  );

create policy "Admin can update item assets" on item_assets
  for update using (
    auth.uid() in (
      select user_id from restaurant_users where restaurant_id = item_assets.restaurant_id
    )
  );

create policy "Admin can delete item assets" on item_assets
  for delete using (
    auth.uid() in (
      select user_id from restaurant_users where restaurant_id = item_assets.restaurant_id
    )
  );
