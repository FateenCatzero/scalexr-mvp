'use client'

import { Button } from '@/components/ui/button'
import { Scan } from 'lucide-react'

interface ARLauncherProps {
  glbUrl: string
  usdzUrl?: string
  itemName: string
}

export default function ARLauncher({ glbUrl, usdzUrl, itemName }: ARLauncherProps) {
  const isIOS =
    typeof navigator !== 'undefined' &&
    /iPhone|iPad|iPod/i.test(navigator.userAgent)

  if (isIOS && usdzUrl) {
    return (
      <a rel="ar" href={usdzUrl} className="block w-full">
        <Button variant="outline" className="w-full gap-1.5">
          <Scan className="w-4 h-4" />
          View in AR
        </Button>
      </a>
    )
  }

  // Android Scene Viewer intent
  const intentUrl = [
    `intent://arvr.google.com/scene-viewer/1.0`,
    `?file=${encodeURIComponent(glbUrl)}`,
    `&mode=ar_preferred`,
    `&title=${encodeURIComponent(itemName)}`,
    `#Intent;scheme=https;package=com.google.ar.core;`,
    `action=android.intent.action.VIEW;end;`,
  ].join('')

  return (
    <a href={intentUrl} className="block w-full">
      <Button variant="outline" className="w-full gap-1.5">
        <Scan className="w-4 h-4" />
        View in AR
      </Button>
    </a>
  )
}
