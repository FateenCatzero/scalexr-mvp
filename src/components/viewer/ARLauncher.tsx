'use client'

// ARLauncher — alternative AR launch button backed by a hidden <model-viewer>.
//
// NOTE: This component is NOT currently used in the app. ItemDetailClient handles
// AR directly (iOS via <a rel="ar">, Android via a Scene Viewer intent URL) because
// those approaches give more control over the UI. ARLauncher is kept as a simpler
// cross-platform option if the manual approach becomes too complex to maintain.
//
// How it works:
//   - A zero-size, invisible <model-viewer> element is rendered with the `ar` attribute.
//   - Clicking "View in AR" calls `activateAR()` on that element, which delegates
//     to the browser's AR handler (Quick Look on iOS, Scene Viewer on Android).
//   - The visible button is a plain React component; the AR plumbing lives in the
//     hidden web component behind it.

import { useEffect, useRef } from 'react'
import { Scan } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { loadModelViewerScript } from '@/components/viewer/ModelViewer'
import type { ModelViewerElement } from '@/types/model-viewer'

interface ARLauncherProps {
  glbUrl: string
  usdzUrl?: string
  itemName: string
}

export default function ARLauncher({ glbUrl, usdzUrl, itemName }: ARLauncherProps) {
  const mvRef = useRef<ModelViewerElement>(null)

  // Ensure the model-viewer CDN script is loaded — shares the same loader
  // as ModelViewer so it never downloads twice.
  useEffect(() => {
    loadModelViewerScript()
  }, [])

  const handleAR = () => {
    mvRef.current?.activateAR()
  }

  return (
    <div className="relative w-full">
      {/*
        Hidden <model-viewer> — collapsed to 0×0 with no pointer events.
        It holds the ar, ios-src, and ar-modes attributes that drive AR launch.
        ar-modes priority: Scene Viewer (Android) → Quick Look (iOS) → WebXR (desktop)
      */}
      <model-viewer
        ref={mvRef}
        src={glbUrl}
        ios-src={usdzUrl ?? ''}
        ar
        ar-modes="scene-viewer quick-look webxr"
        title={itemName}
        style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}
      />
      <Button
        variant="outline"
        className="w-full gap-1.5"
        onClick={handleAR}
      >
        <Scan className="w-4 h-4" />
        View in AR
      </Button>
    </div>
  )
}
