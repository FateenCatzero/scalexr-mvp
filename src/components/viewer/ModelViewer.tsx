'use client'

import { useEffect } from 'react'

interface ModelViewerProps {
  glbUrl: string
  usdzUrl?: string
  itemName: string
}

const CDN_URL =
  'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js'

function loadModelViewerScript() {
  if (typeof window === 'undefined') return
  if (customElements.get('model-viewer')) return
  if (document.querySelector('script[data-mvscript]')) return
  const s = document.createElement('script')
  s.type = 'module'
  s.src = CDN_URL
  s.setAttribute('data-mvscript', '1')
  document.head.appendChild(s)
}

export default function ModelViewer({ glbUrl, usdzUrl, itemName }: ModelViewerProps) {
  useEffect(() => {
    loadModelViewerScript()
  }, [])

  return (
    <div className="w-full h-72 rounded-xl overflow-hidden bg-muted">
      <model-viewer
        src={glbUrl}
        ios-src={usdzUrl ?? ''}
        ar
        ar-modes="scene-viewer quick-look webxr"
        camera-controls
        title={itemName}
        shadow-intensity="1"
        min-camera-orbit="auto auto 5%"
        style={{ width: '100%', height: '100%' }}
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
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
            <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
            <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
            <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
          </svg>
          View in AR
        </button>
      </model-viewer>
    </div>
  )
}
