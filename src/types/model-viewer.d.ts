import '@google/model-viewer'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        src?: string
        'ios-src'?: string
        ar?: boolean | string
        'ar-modes'?: string
        title?: string
        'camera-controls'?: boolean | string
        autoplay?: boolean | string
        'shadow-intensity'?: string
        style?: React.CSSProperties
      }
    }
  }
}
