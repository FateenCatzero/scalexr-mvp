// lib/security/featureGating.ts — server-only feature access service.
//
// IMPORT THIS FILE ONLY IN:
//   - Server Components (page.tsx, layout.tsx — no 'use client' at top)
//   - Route handlers (app/api/*)
//   - Server Actions
//
// NEVER import in 'use client' components. The Supabase server client reads
// HTTP cookies and cannot run in a browser context.
//
// All functions return data already validated by Supabase RLS — the database
// enforces ownership before any row is returned. This file adds a second
// application-level enforcement layer on top.

import { createClient } from '@/lib/supabase/server'
import type { FeatureKey, FeatureFlags, SubscriptionPlan, RestaurantSettings } from '@/lib/types'

// Default state when no feature row exists — everything off.
const DEFAULT_FLAGS: FeatureFlags = {
  '3d_view':          false,
  ar_view:            false,
  analytics:          false,
  inventory_tracking: false,
  staff_management:   false,
  bulk_upload:        false,
}

// Returns true if the given feature is enabled for the restaurant.
// Uses the session cookie from the incoming request — safe for server components.
export async function canAccessFeature(
  restaurantId: string,
  featureKey: FeatureKey,
): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('restaurant_features')
    .select('enabled')
    .eq('restaurant_id', restaurantId)
    .eq('feature_key', featureKey)
    .single()
  return data?.enabled ?? false
}

// Returns the full feature flag map for a restaurant.
// Designed to be called once per layout render and passed down to
// FeatureFlagsProvider — avoids N queries for N features.
export async function getFeatureFlags(restaurantId: string): Promise<FeatureFlags> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('restaurant_features')
    .select('feature_key, enabled')
    .eq('restaurant_id', restaurantId)

  const flags: FeatureFlags = { ...DEFAULT_FLAGS }
  for (const row of data ?? []) {
    if (Object.prototype.hasOwnProperty.call(flags, row.feature_key)) {
      flags[row.feature_key as FeatureKey] = row.enabled
    }
  }
  return flags
}

// Returns the restaurant's branding/UI settings row, or null if not yet seeded.
export async function getRestaurantSettings(
  restaurantId: string,
): Promise<RestaurantSettings | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('restaurant_settings')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .single()
  return (data as RestaurantSettings) ?? null
}

// Returns the subscription plan assigned to this restaurant.
// Two-step lookup: get plan_id from restaurants, then resolve the plan row.
// Avoids embedded join which can fail on stale PostgREST schema cache.
// Returns null when no plan is assigned (treated as basic/free tier by callers).
export async function getPlan(restaurantId: string): Promise<SubscriptionPlan | null> {
  const supabase = await createClient()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('plan_id')
    .eq('id', restaurantId)
    .single()

  if (!restaurant?.plan_id) return null

  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', restaurant.plan_id)
    .single()

  return (plan as SubscriptionPlan) ?? null
}

// Hard gate: throws a redirect to /admin/login if the feature is disabled.
// Use at the top of server component pages that require a specific feature.
// Import { redirect } from 'next/navigation' is done lazily to avoid bundling
// the redirect module in files that only import canAccessFeature.
export async function assertFeatureAccess(
  restaurantId: string,
  featureKey: FeatureKey,
  redirectTo = '/admin/login',
): Promise<void> {
  const enabled = await canAccessFeature(restaurantId, featureKey)
  if (!enabled) {
    const { redirect } = await import('next/navigation')
    redirect(redirectTo)
  }
}
