'use client'

import { useEffect, useRef, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

interface ModelViewerEl extends HTMLElement {
  activateAR(): void
}

interface ModelViewerProps {
  glbUrl: string
  usdzUrl?: string
  itemName: string
  autoAR?: boolean
}

export default function ModelViewer({ glbUrl, usdzUrl, itemName, autoAR = false }: ModelViewerProps) {
  const mvRef = useRef<ModelViewerEl>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    import('@google/model-viewer')
  }, [])

  useEffect(() => {
    const mv = mvRef.current
    if (!mv) return
    const onLoad = () => {
      setLoaded(true)
      if (autoAR) mv.activateAR()
    }
    mv.addEventListener('load', onLoad)
    return () => mv.removeEventListener('load', onLoad)
  }, [autoAR])

  return (
    <div className="w-full h-72 rounded-xl overflow-hidden bg-muted relative">
      {!loaded && <Skeleton className="absolute inset-0 w-full h-full rounded-xl" />}
      <model-viewer
        ref={mvRef}
        src={glbUrl}
        ios-src={usdzUrl ?? ''}
        ar
        ar-modes="scene-viewer quick-look webxr"
        camera-controls
        title={itemName}
        shadow-intensity="1"
        min-camera-orbit="auto auto 5%"
        style={{ width: '100%', height: '100%', opacity: loaded ? 1 : 0, transition: 'opacity 0.2s' }}
        loading="eager"
        auto-rotate
        auto-rotate-delay="500"
        rotation-per-second="30deg"
      >
        <button
          slot="ar-button"
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(0,0,0,0.65)',
            color: 'white',
            border: 'none',
            borderRadius: '999px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {/* Scan icon inline */}
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>
            <path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
          </svg>
          View in AR
        </button>
      </model-viewer>
    </div>
  )
}
