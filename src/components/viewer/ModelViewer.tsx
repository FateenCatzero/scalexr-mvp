'use client'

import { useEffect, useRef, useState } from 'react'
import type { ModelViewerElement } from '@/types/model-viewer'

interface ModelViewerProps {
  glbUrl: string
  usdzUrl?: string
  itemName: string
  poster?: string
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

export default function ModelViewer({ glbUrl, itemName, poster }: ModelViewerProps) {
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
        poster={poster}
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
      {!loaded && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1.5 pb-4 pointer-events-none">
          <p className="text-xs text-muted-foreground font-medium">
            {progress > 0 ? `Loading 3D model… ${progress}%` : 'Loading 3D model…'}
          </p>
          <div className="w-40 h-1 bg-muted-foreground/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
