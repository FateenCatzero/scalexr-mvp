'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

// TanStack Query provider — wraps the entire app so any component can use
// useQuery / useMutation hooks without prop-drilling.
//
// The QueryClient is created with useState (not at module level) so that
// each server-side render gets its own client instance, preventing shared
// state between different users' requests.
//
// Default options:
//   staleTime: 60s — queries are considered fresh for 1 minute, avoiding
//     unnecessary background refetches when the user switches tabs briefly.
//   retry: 1 — failed queries retry once before surfacing an error.
export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
