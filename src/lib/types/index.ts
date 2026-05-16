// ─── TYPE DEFINITIONS ────────────────────────────────────────────────────────
// All TypeScript types mirror the Supabase database schema exactly.
// These are used throughout the codebase to ensure type safety when reading
// from or writing to the database.

// A restaurant on the platform. The `slug` is the URL identifier (e.g. "demo"
// maps to /r/demo). `theme` is reserved for future custom branding.
export type Restaurant = {
  id: string
  slug: string
  name: string
  description: string | null
  logo_url: string | null
  theme: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

// A menu category (e.g. "Starters", "Drinks"). Categories are sorted by
// `sort_order` and can be toggled on/off with `is_active`.
export type Category = {
  id: string
  restaurant_id: string
  name: string
  description: string | null
  image_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// The type of file stored in `item_assets`. `model_glb` is used for both 3D
// viewing and Android AR. `model_usdz` is required for iOS Quick Look AR.
export type AssetType = 'image' | 'model_glb' | 'model_usdz' | 'thumbnail' | 'video'

// A file asset attached to a menu item. `storage_path` is the path in the
// Supabase Storage bucket; `public_url` is the CDN-accessible URL.
export type ItemAsset = {
  id: string
  menu_item_id: string
  restaurant_id: string
  asset_type: AssetType
  storage_path: string
  public_url: string | null
  file_size_bytes: number | null
  is_optimized: boolean
  metadata: Record<string, unknown>
  created_at: string
}

// A single item on the menu. `has_3d_model` and `has_ar` are denormalized
// flags that are updated automatically when models are uploaded/deleted — they
// allow the menu grid to show 3D/AR badges without joining `item_assets`.
// `is_available` hides the item from customers; `is_out_of_stock` shows it
// but with an "Out of stock" overlay instead of an add-to-cart button.
export type MenuItem = {
  id: string
  restaurant_id: string
  category_id: string | null
  name: string
  description: string | null
  price: number
  image_url: string | null
  has_3d_model: boolean
  has_ar: boolean
  is_available: boolean
  is_out_of_stock: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// MenuItem with its related assets joined in — used on the item detail page
// where we need the actual GLB/USDZ URLs to power the 3D viewer and AR.
export type MenuItemWithAssets = MenuItem & { item_assets: ItemAsset[] }

// A single analytics event row. `payload` contains context-specific data
// such as item_id and item_name for item_view events.
export type AnalyticsEvent = {
  id: string
  restaurant_id: string | null
  event_type: string
  payload: Record<string, unknown>
  created_at: string
}

// A physical table in the restaurant. `table_number` is a string so it can
// include names like "Patio 1". Deletion is a soft-delete: `is_active = false`.
export type RestaurantTable = {
  id: string
  restaurant_id: string
  table_number: string
  qr_code_url: string | null
  is_active: boolean
  created_at: string
}

// All possible states an order can be in. The flow is one-directional:
// pending → confirmed → preparing → ready → delivered
// `cancelled` can happen from `pending` (waiter cancels before confirming).
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled'

// An order placed by a customer. `table_number` and `customer_name` come from
// the checkout form. `customer_note` is the optional special requests field.
// `total_amount` is stored in PKR.
export type Order = {
  id: string
  restaurant_id: string
  table_number: string | null
  customer_name: string | null
  customer_note: string | null
  status: OrderStatus
  total_amount: number
  created_at: string
  updated_at: string
}

// A single line item within an order. `unit_price` is the price at the time
// of ordering (not the current menu price, which may have changed).
// `subtotal` = unit_price × quantity. `notes` is per-item notes (reserved
// for future use — not yet exposed in any UI).
export type OrderItem = {
  id: string
  order_id: string
  menu_item_id: string
  quantity: number
  unit_price: number
  subtotal: number
  notes: string | null
  created_at: string
}

// OrderItem with the menu item name and image joined in — used on order
// display screens so we can show "Biryani × 2" without a separate query.
export type OrderItemWithMenuItem = OrderItem & {
  menu_items: Pick<MenuItem, 'name' | 'image_url'>
}

// Full order with all its items joined — used everywhere orders are displayed.
export type OrderWithItems = Order & { order_items: OrderItemWithMenuItem[] }

// What the Zustand cart stores per item. `notes` is optional per-item notes
// that persist to `order_items.notes` in the DB but are not yet exposed in UI.
export type CartItem = {
  menuItem: MenuItem
  quantity: number
  notes?: string
}

// All possible roles a user can have on the platform.
export type UserRole = 'customer' | 'waiter' | 'kitchen' | 'restaurant_admin' | 'master_admin'

// A user record. `id` matches the Supabase Auth UUID so we can join
// `auth.users` → `public.users` by ID without a separate lookup.
export type AppUser = {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
}

// Restaurant with aggregated order stats — used in the master admin dashboard
// to show per-restaurant metrics without a dedicated stats table.
export type RestaurantWithStats = Restaurant & {
  orderCount: number
  revenue: number
}

// A row from the audit log. `users` and `restaurants` are optional joined
// relations (present when queried with select('*, users(email), restaurants(name, slug)')).
export type AdminLog = {
  id: string
  actor_id: string | null
  restaurant_id: string | null
  action: string
  target_table: string | null
  target_id: string | null
  payload: Record<string, unknown>
  created_at: string
  users?: { email: string } | null
  restaurants?: { name: string; slug: string } | null
}

// ─── STAFF SYSTEM ─────────────────────────────────────────────────────────────

// Roles that appear in restaurant_users.role — excludes master_admin which
// is a platform role stored in users.role only.
export type RestaurantRole = 'restaurant_admin' | 'waiter' | 'kitchen'

// A staff member as returned by the get_restaurant_staff() RPC.
// Combines restaurant_users + users + staff_activity + staff_performance in one row.
export type StaffMember = {
  restaurant_user_id: string
  user_id: string
  email: string
  full_name: string | null
  role: RestaurantRole
  is_active: boolean
  // null when the staff member has never sent a heartbeat
  last_active_at: string | null
  // cumulative order counters
  orders_confirmed: number
  orders_preparing: number
  orders_delivered: number
  orders_cancelled: number
}

// Performance counter names used with increment_staff_performance() RPC.
export type PerformanceCounter =
  | 'orders_confirmed'
  | 'orders_preparing'
  | 'orders_delivered'
  | 'orders_cancelled'
