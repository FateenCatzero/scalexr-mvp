import * as React from 'react'

export interface ModelViewerElement extends HTMLElement {
  activateAR(): void
  src: string
  poster?: string
}

type ModelViewerProps = React.HTMLAttributes<ModelViewerElement> & React.RefAttributes<ModelViewerElement> & {
  src?: string
  'ios-src'?: string
  ar?: boolean | string
  'ar-modes'?: string
  title?: string
  'camera-controls'?: boolean | string
  'shadow-intensity'?: string
  'auto-rotate'?: boolean | string
  'auto-rotate-delay'?: string | number
  'rotation-per-second'?: string
  loading?: string
  'min-camera-orbit'?: string
  reveal?: string
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerProps
    }
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerProps
    }
  }
}
