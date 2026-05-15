'use client'

import { createClient } from '@/lib/supabase/client'

export type EventType = 'menu_view' | 'item_view' | '3d_view' | 'ar_view'

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
    // Analytics failures must never break the user flow
  }
}
