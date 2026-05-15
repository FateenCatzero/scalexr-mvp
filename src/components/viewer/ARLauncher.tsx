'use client'

import { useEffect, useRef } from 'react'
import { Scan } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { loadModelViewerScript } from '@/components/viewer/ModelViewer'
import type { ModelViewerElement } from '@/types/model-viewer'

interface ARLauncherProps {
  glbUrl?: string
  usdzUrl?: string
  itemName: string
}

export default function ARLauncher({ glbUrl, usdzUrl, itemName }: ARLauncherProps) {
  const mvRef = useRef<ModelViewerElement>(null)

  useEffect(() => {
    loadModelViewerScript()
  }, [])

  const handleAR = () => {
    mvRef.current?.activateAR()
  }

  return (
    <div className="relative w-full">
      {/* Hidden model-viewer — handles all AR launch logic */}
      <model-viewer
        ref={mvRef}
        src={glbUrl || usdzUrl || ''}
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
