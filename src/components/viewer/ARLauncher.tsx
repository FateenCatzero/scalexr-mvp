'use client'

import { useEffect, useRef } from 'react'
import { Scan } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ModelViewerEl extends HTMLElement {
  activateAR(): void
}

interface ARLauncherProps {
  glbUrl: string
  usdzUrl?: string
  itemName: string
}

export default function ARLauncher({ glbUrl, usdzUrl, itemName }: ARLauncherProps) {
  const mvRef = useRef<ModelViewerEl>(null)

  useEffect(() => {
    import('@google/model-viewer')
  }, [])

  const handleAR = () => {
    mvRef.current?.activateAR()
  }

  return (
    <div className="relative w-full">
      {/* Hidden model-viewer — handles all AR launch logic */}
      {/* @ts-expect-error model-viewer is a web component registered at runtime */}
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
