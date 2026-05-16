'use client'

// ModelViewer — wraps Google's <model-viewer> web component for interactive 3D display.
// The <model-viewer> library is too large to bundle; instead it's loaded at runtime
// from a CDN as an ES module, which registers the `model-viewer` custom element.
//
// CDN pin: v3.5.0 (the npm package is v4.2.0 — only used for TypeScript types).
// The `loadModelViewerScript` function is exported so ARLauncher can share the
// same script without loading it twice.

import { useEffect, useRef, useState } from 'react'
import type { ModelViewerElement } from '@/types/model-viewer'

interface ModelViewerProps {
  glbUrl: string
  usdzUrl?: string
  itemName: string
}

// Runtime CDN URL for the model-viewer script (v3.5.0).
// Pinned to a specific version to prevent unexpected breaking changes.
const CDN_URL =
  'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js'

// Injects the model-viewer script into <head> exactly once.
// Three guards prevent duplicate injection:
//   1. Server-side check (typeof window)
//   2. Already-registered custom element (customElements.get)
//   3. Script tag with our sentinel attribute already in the DOM
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

  // Kick off CDN script load as soon as this component mounts in the browser.
  useEffect(() => {
    loadModelViewerScript()
  }, [])

  // Reset loading state when the GLB URL changes (user navigated to a different item).
  useEffect(() => {
    setLoaded(false)
    setProgress(0)
  }, [glbUrl])

  // Attach event listeners to the <model-viewer> element to track download progress.
  // `progress` event fires as the GLB binary streams in; `load` fires when rendering starts.
  // Listeners are cleaned up on unmount to avoid memory leaks.
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
      {/*
        Key attributes:
          camera-controls   — enables pinch/drag to rotate/zoom
          disable-pan       — prevents the model from being dragged out of view
          min-camera-orbit  — keeps the camera at least 5% of the model's bounding sphere
          auto-rotate       — spins until the user touches it, then stops
          auto-rotate-delay — 500ms idle before auto-rotate resumes after touch release
          rotation-per-second — 30 deg/s spin speed
          loading="eager"   — starts downloading the model immediately (not on-scroll)
          reveal="auto"     — fades in the model once it finishes loading
      */}
      <model-viewer
        ref={mvRef}
        src={glbUrl}
        camera-controls
        disable-pan
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

      {/* Loading overlay — solid background so no image bleeds through while GLB loads.
          Fades out (opacity-0) when `loaded` becomes true via CSS transition. */}
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
