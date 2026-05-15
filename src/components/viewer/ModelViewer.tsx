'use client'

import { useEffect } from 'react'

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
  useEffect(() => {
    loadModelViewerScript()
  }, [])

  return (
    <div className="w-full h-72 rounded-xl overflow-hidden bg-muted">
      <model-viewer
        src={glbUrl}
        camera-controls
        title={itemName}
        shadow-intensity="1"
        min-camera-orbit="auto auto 5%"
        style={{ width: '100%', height: '100%' }}
        loading="eager"
        auto-rotate
        auto-rotate-delay="500"
        rotation-per-second="30deg"
      />
    </div>
  )
}
