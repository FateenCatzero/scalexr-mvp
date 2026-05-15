alter table menu_items add column if not exists is_out_of_stock boolean not null default false;
