// buildCssVars — converts a RestaurantSettings row into CSS custom properties
// plus the direct React style properties that apply them to the wrapper element.
// Both CSS vars (for cascade to child components) and direct props (so the wrapper
// itself gets the font and background) are returned in one object.

import type { CSSProperties } from 'react'
import type { RestaurantSettings } from '@/lib/types'

export const BUTTON_RADIUS: Record<string, string> = {
  rounded: '0.5rem',
  square:  '0rem',
  pill:    '9999px',
}

export const FONT_STACKS: Record<string, string> = {
  inter:   'Inter, system-ui, sans-serif',
  georgia: 'Georgia, "Times New Roman", serif',
  poppins: '"Trebuchet MS", Arial, sans-serif',
  mono:    '"Courier New", Courier, monospace',
}

// Returns a white or black hex depending on which has better contrast against
// the given hex background — used for text/icons on colored headers.
export function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? '#000000' : '#ffffff'
}

export function buildCssVars(settings: RestaurantSettings): CSSProperties {
  const fontStack = FONT_STACKS[settings.font_family] ?? FONT_STACKS.inter

  const bg =
    settings.background_type === 'solid'
      ? settings.background_value
      : settings.background_type === 'gradient'
        ? settings.background_value
        : `url(${settings.background_value}) center/cover no-repeat`

  return {
    // CSS custom properties — cascade to all child components via var(...)
    '--color-primary':   settings.primary_color,
    '--color-secondary': settings.secondary_color,
    '--color-accent':    settings.accent_color,
    '--button-radius':   BUTTON_RADIUS[settings.button_style] ?? '0.5rem',
    '--font-family':     fontStack,
    '--background':      bg,
    // Direct style props — applied to the wrapper element itself so font and
    // background take effect without child components needing to use var(...).
    fontFamily:          fontStack,
    background:          bg,
  } as CSSProperties
}
