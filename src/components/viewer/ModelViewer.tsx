'use client'

import { useEffect, useRef, useState } from 'react'
import type { ModelViewerElement } from '@/types/model-viewer'

interface ModelViewerProps {
  glbUrl: string
  usdzUrl?: string
  itemName: string
}

const CDN_URL =
  'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js'

export function loadModelViewerScript() {
  if (typeof window === 'undefined') return
  if (customElements.get('model-viewer')) return
  if (document.querySelector('script[data-mvscript]')) return
  const s = document.createElement('script')
  s.type = 'module'
  s.src = CDN_URL
  s.setAttribute('data-mvscript', '1')
  document.head.appendChild(s)
}

export default function ModelViewer({ glbUrl, itemName }: ModelViewerProps) {
  const mvRef = useRef<ModelViewerElement>(null)
  const [progress, setProgress] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    loadModelViewerScript()
  }, [])

  useEffect(() => {
    setLoaded(false)
    setProgress(0)
  }, [glbUrl])

  useEffect(() => {
    const mv = mvRef.current
    if (!mv) return
    const onProgress = (e: Event) => {
      setProgress(Math.round((e as CustomEvent).detail.totalProgress * 100))
    }
    const onLoad = () => setLoaded(true)
    mv.addEventListener('progress', onProgress)
    mv.addEventListener('load', onLoad)
    return () => {
      mv.removeEventListener('progress', onProgress)
      mv.removeEventListener('load', onLoad)
    }
  }, [])

  return (
    <div className="relative w-full h-72 rounded-xl overflow-hidden bg-muted">
      <model-viewer
        ref={mvRef}
        src={glbUrl}
        camera-controls
        title={itemName}
        shadow-intensity="1"
        min-camera-orbit="auto auto 5%"
        style={{ width: '100%', height: '100%' }}
        loading="eager"
        reveal="auto"
        auto-rotate
        auto-rotate-delay="500"
        rotation-per-second="30deg"
      />

      {/* Loading overlay — solid background so no image bleeds through */}
      <div
        className={`absolute inset-0 bg-muted flex flex-col items-center justify-center gap-3 transition-opacity duration-500 ${
          loaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="w-8 h-8 rounded-full border-2 border-muted-foreground/20 border-t-primary animate-spin" />
        <p className="text-xs text-muted-foreground font-medium tabular-nums">
          {progress > 0 ? `Loading 3D model… ${progress}%` : 'Loading 3D model…'}
        </p>
        <div className="w-40 h-1 bg-muted-foreground/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
