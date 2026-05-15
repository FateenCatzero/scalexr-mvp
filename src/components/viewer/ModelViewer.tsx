'use client'

import { useEffect } from 'react'
import { Scan } from 'lucide-react'

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

const TRANSPARENT_GIF =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

export default function ModelViewer({ glbUrl, usdzUrl, itemName }: ModelViewerProps) {
  const isIOS =
    typeof navigator !== 'undefined' &&
    /iPhone|iPad|iPod/i.test(navigator.userAgent)

  useEffect(() => {
    loadModelViewerScript()
  }, [])

  const handleAndroidAR = () => {
    const intentUrl = [
      'intent://arvr.google.com/scene-viewer/1.0',
      `?file=${encodeURIComponent(glbUrl)}`,
      '&mode=ar_preferred',
      `&title=${encodeURIComponent(itemName)}`,
      '#Intent;scheme=https;package=com.google.ar.core;',
      'action=android.intent.action.VIEW;end;',
    ].join('')
    window.location.href = intentUrl
  }

  const showARButton = isIOS ? !!usdzUrl : !!glbUrl

  return (
    <div className="w-full h-72 rounded-xl overflow-hidden bg-muted relative">
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

      {/* AR button — native Quick Look on iOS, Scene Viewer on Android */}
      {showARButton && (
        <div style={{ position: 'absolute', bottom: 12, right: 12 }}>
          {isIOS && usdzUrl ? (
            // iOS: <a rel="ar"> with img child is the ONLY reliable way to trigger Quick Look
            <a
              rel="ar"
              href={usdzUrl}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(0,0,0,0.65)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '999px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              {/* img child required for iOS Quick Look */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={TRANSPARENT_GIF} alt="" style={{ display: 'none' }} />
              <Scan size={14} />
              View in AR
            </a>
          ) : (
            // Android: Scene Viewer intent
            <button
              onClick={handleAndroidAR}
              style={{
                display: 'inline-flex',
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
              <Scan size={14} />
              View in AR
            </button>
          )}
        </div>
      )}
    </div>
  )
}
