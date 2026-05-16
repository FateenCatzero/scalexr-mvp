'use client'

import { createClient } from '@/lib/supabase/client'

// The four analytics events the platform tracks. Every event is associated
// with a restaurant so the admin analytics dashboard can filter by restaurant.
export type EventType = 'menu_view' | 'item_view' | '3d_view' | 'ar_view'

// Fire-and-forget analytics logger. Inserts a row into `analytics_events`
// without awaiting or surfacing errors — analytics failures must never block
// or crash the user-facing flow. The `payload` contains extra context:
//   menu_view  → { restaurant_slug }
//   item_view  → { item_id, item_name }
//   3d_view    → { item_id, item_name }
//   ar_view    → { item_id, item_name }
export async function trackEvent(
  restaurantId: string,
  eventType: EventType,
  payload: Record<string, unknown> = {}
) {
  try {
    const supabase = createClient()
    await supabase.from('analytics_events').insert({
      restaurant_id: restaurantId,
      event_type: eventType,
      payload,
    })
  } catch {
    // Intentionally swallowed — analytics must never break UX
  }
}
