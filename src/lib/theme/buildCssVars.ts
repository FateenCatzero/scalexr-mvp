// buildCssVars — converts a RestaurantSettings row into CSS custom properties.
// Used by portal layouts (server components) to inject theme variables as inline
// styles on the root wrapper div. Components consume them with bg-[var(--color-primary)] etc.
// No client-side JS needed — variables cascade via the DOM.

import type { RestaurantSettings } from '@/lib/types'

const BUTTON_RADIUS: Record<string, string> = {
  rounded: '0.5rem',
  square:  '0rem',
  pill:    '9999px',
}

const FONT_STACKS: Record<string, string> = {
  inter:   'Inter, system-ui, sans-serif',
  georgia: 'Georgia, "Times New Roman", serif',
  poppins: '"Trebuchet MS", Arial, sans-serif',
  mono:    '"Courier New", Courier, monospace',
}

export function buildCssVars(settings: RestaurantSettings): Record<string, string> {
  const bg =
    settings.background_type === 'solid'
      ? settings.background_value
      : settings.background_type === 'gradient'
        ? settings.background_value
        : `url(${settings.background_value}) center/cover no-repeat`

  return {
    '--color-primary':   settings.primary_color,
    '--color-secondary': settings.secondary_color,
    '--color-accent':    settings.accent_color,
    '--button-radius':   BUTTON_RADIUS[settings.button_style] ?? '0.5rem',
    '--font-family':     FONT_STACKS[settings.font_family] ?? FONT_STACKS.inter,
    '--background':      bg,
  }
}
