-- Allow restaurant admins to read analytics events for their restaurants
create policy "admin read analytics"
  on analytics_events for select
  using (
    exists (
      select 1
      from restaurant_users ru
      where ru.user_id = auth.uid()
        and ru.restaurant_id = analytics_events.restaurant_id
    )
  );

-- Allow restaurant admins to manage tables
create policy "admin manage tables"
  on restaurant_tables for all
  using (
    exists (
      select 1
      from restaurant_users ru
      where ru.user_id = auth.uid()
        and ru.restaurant_id = restaurant_tables.restaurant_id
    )
  )
  with check (
    exists (
      select 1
      from restaurant_users ru
      where ru.user_id = auth.uid()
        and ru.restaurant_id = restaurant_tables.restaurant_id
    )
  );
