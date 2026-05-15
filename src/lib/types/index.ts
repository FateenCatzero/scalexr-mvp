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

export type AssetType = 'image' | 'model_glb' | 'model_usdz' | 'thumbnail' | 'video'

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
  sort_order: number
  created_at: string
  updated_at: string
}

export type MenuItemWithAssets = MenuItem & { item_assets: ItemAsset[] }

export type AnalyticsEvent = {
  id: string
  restaurant_id: string | null
  event_type: string
  payload: Record<string, unknown>
  created_at: string
}

export type RestaurantTable = {
  id: string
  restaurant_id: string
  table_number: string
  qr_code_url: string | null
  is_active: boolean
  created_at: string
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled'

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

export type OrderItemWithMenuItem = OrderItem & {
  menu_items: Pick<MenuItem, 'name' | 'image_url'>
}

export type OrderWithItems = Order & { order_items: OrderItemWithMenuItem[] }

export type CartItem = {
  menuItem: MenuItem
  quantity: number
  notes?: string
}
