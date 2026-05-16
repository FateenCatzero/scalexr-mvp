'use client'

// lib/hooks/useFeature.ts — client-side feature flag consumption.
//
// RULES (enforced by architecture, not by code):
//   - This hook ONLY reads flags that the server already validated and passed down.
//   - It NEVER calls Supabase, fetches data, or decides access.
//   - It NEVER acts as a security gate — it is a rendering helper only.
//   - The server component that renders FeatureFlagsProvider is the enforcement point.
//
// Usage:
//   // In a server layout or page:
//   const flags = await getFeatureFlags(restaurantId)
//   return <FeatureFlagsProvider flags={flags}>{children}</FeatureFlagsProvider>
//
//   // In any client component under that layout:
//   const hasAR = useFeature('ar_view')
//   if (!hasAR) return null

import { createContext, useContext } from 'react'
import type { FeatureKey, FeatureFlags } from '@/lib/types'

const FeatureFlagsContext = createContext<FeatureFlags>({
  ar_view:             false,
  '3d_view':           false,
  analytics:           false,
  theme_customization: false,
  inventory_tracking:  false,
  staff_management:    false,
  bulk_upload:         false,
})

// Wrap server-validated feature flags into React context.
// Place this in the server layout that fetched the flags.
export function FeatureFlagsProvider({
  flags,
  children,
}: {
  flags: FeatureFlags
  children: React.ReactNode
}) {
  return (
    <FeatureFlagsContext.Provider value={flags}>
      {children}
    </FeatureFlagsContext.Provider>
  )
}

// Returns whether a feature is enabled. Returns false if the provider
// is not present (safe default — never accidentally grants access).
export function useFeature(key: FeatureKey): boolean {
  return useContext(FeatureFlagsContext)[key] ?? false
}

// Returns the full flags map. Use when a component needs to check multiple features.
export function useFeatureFlags(): FeatureFlags {
  return useContext(FeatureFlagsContext)
}
