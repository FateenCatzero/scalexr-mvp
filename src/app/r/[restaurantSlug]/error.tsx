'use client'

// Error boundary for the /r/[restaurantSlug] route segment.
// Next.js automatically renders this component when an unhandled error is thrown
// anywhere in the menu page tree (MenuPageClient, MenuGrid, etc.).
// The `digest` field is a server-generated hash for correlating errors in server logs.

export default function MenuError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 p-8 text-center">
      <p className="font-semibold text-sm">Something went wrong loading this page.</p>
      <p className="text-xs text-destructive font-mono break-all max-w-sm">
        {error.message || 'Unknown error'}
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground">Digest: {error.digest}</p>
      )}
      <button
        onClick={() => window.location.reload()}
        className="text-xs underline text-muted-foreground mt-2"
      >
        Reload
      </button>
    </div>
  )
}
