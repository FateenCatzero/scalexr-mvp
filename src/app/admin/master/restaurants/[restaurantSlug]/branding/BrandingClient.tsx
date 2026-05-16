'use client'

// BrandingClient — master admin UI for configuring a restaurant's branding.
//
// Sections:
//   Logo         — upload/remove logo stored in Supabase Storage restaurant-assets bucket
//   Colors       — primary / secondary / accent color pickers
//   Appearance   — font, button style, background type + value
//   Apply to     — which portals receive the custom theme (customer/admin/waiter/kitchen)
//   Permissions  — what the restaurant admin is allowed to self-edit
//
// All changes are held in local draft state. Save commits everything in one API call.
// Cancel reverts to the last saved baseline.

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Upload, Check, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { useMasterSaveBranding } from '@/lib/queries/master'
import { FONT_STACKS } from '@/lib/theme/buildCssVars'
import type { Restaurant, RestaurantSettings } from '@/lib/types'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const BUTTON_STYLES = [
  { value: 'rounded', label: 'Rounded' },
  { value: 'square',  label: 'Square' },
  { value: 'pill',    label: 'Pill' },
]

// Each font entry includes its CSS stack so the SelectItem can render the
// label text in the actual font — giving the user a live preview in the picker.
const FONTS: { value: string; label: string; stack: string }[] = [
  { value: 'inter',   label: 'Inter',    stack: FONT_STACKS.inter },
  { value: 'georgia', label: 'Georgia',  stack: FONT_STACKS.georgia },
  { value: 'poppins', label: 'Trebuchet', stack: FONT_STACKS.poppins },
  { value: 'mono',    label: 'Courier',  stack: FONT_STACKS.mono },
]

const BG_TYPES = [
  { value: 'solid',    label: 'Solid color' },
  { value: 'gradient', label: 'CSS gradient' },
  { value: 'image',    label: 'Image URL' },
]

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Draft = {
  logo_url:                  string | null
  primary_color:             string
  secondary_color:           string
  accent_color:              string
  background_type:           string
  background_value:          string
  button_style:              string
  font_family:               string
  customer_theme_enabled:    boolean
  admin_theme_enabled:       boolean
  waiter_theme_enabled:      boolean
  kitchen_theme_enabled:     boolean
  allow_logo_edit:           boolean
  allow_color_edit:          boolean
  allow_menu_edit:           boolean
  allow_feature_toggle_edit: boolean
}

// Matches the DEFAULT values from migration 012 — used by "Reset to defaults".
const DEFAULT_DRAFT: Draft = {
  logo_url:                  null,
  primary_color:             '#09090b',
  secondary_color:           '#18181b',
  accent_color:              '#f97316',
  background_type:           'solid',
  background_value:          '#ffffff',
  button_style:              'rounded',
  font_family:               'inter',
  customer_theme_enabled:    false,
  admin_theme_enabled:       false,
  waiter_theme_enabled:      false,
  kitchen_theme_enabled:     false,
  allow_logo_edit:           true,
  allow_color_edit:          false,
  allow_menu_edit:           true,
  allow_feature_toggle_edit: false,
}

function toDraft(s: RestaurantSettings): Draft {
  return {
    logo_url:                  s.logo_url,
    primary_color:             s.primary_color,
    secondary_color:           s.secondary_color,
    accent_color:              s.accent_color,
    background_type:           s.background_type,
    background_value:          s.background_value,
    button_style:              s.button_style,
    font_family:               s.font_family,
    customer_theme_enabled:    s.customer_theme_enabled,
    admin_theme_enabled:       s.admin_theme_enabled,
    waiter_theme_enabled:      s.waiter_theme_enabled,
    kitchen_theme_enabled:     s.kitchen_theme_enabled,
    allow_logo_edit:           s.allow_logo_edit,
    allow_color_edit:          s.allow_color_edit,
    allow_menu_edit:           s.allow_menu_edit,
    allow_feature_toggle_edit: s.allow_feature_toggle_edit,
  }
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function BrandingClient({
  restaurant,
  settings,
}: {
  restaurant: Restaurant
  settings: RestaurantSettings
}) {
  const save = useMasterSaveBranding()
  const [draft, setDraft]       = useState<Draft>(() => toDraft(settings))
  const [baseline, setBaseline] = useState<Draft>(() => toDraft(settings))
  const [uploading, setUploading]       = useState(false)
  const [saved, setSaved]               = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const isDirty = JSON.stringify(draft) !== JSON.stringify(baseline)

  const patch = (key: keyof Draft) => (value: string | boolean | null) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'png'
      const path = `branding/${restaurant.id}/logo.${ext}`
      const { error } = await supabase.storage
        .from('restaurant-assets')
        .upload(path, file, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('restaurant-assets').getPublicUrl(path)
      patch('logo_url')(data.publicUrl)
    } catch (err) {
      console.error('Logo upload failed:', err)
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    await save.mutateAsync({ restaurantId: restaurant.id, updates: draft })
    setBaseline(draft)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="px-4 pt-6 space-y-8 pb-24">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/master"
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-border hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-base leading-tight">Branding</h1>
          <p className="text-xs text-muted-foreground">{restaurant.name}</p>
        </div>
        <button
          onClick={() => setConfirmReset(true)}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors shrink-0"
          title="Reset all branding to platform defaults"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      {/* ── Logo ── */}
      <section className="space-y-3">
        <h2 className="font-semibold text-sm">Logo</h2>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
          {draft.logo_url ? (
            <img
              src={draft.logo_url}
              alt="Logo preview"
              className="w-16 h-16 object-contain rounded-lg border border-border bg-muted"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg border border-border bg-muted flex items-center justify-center shrink-0">
              <span className="text-xs text-muted-foreground">None</span>
            </div>
          )}
          <div className="space-y-2">
            <label className="cursor-pointer">
              <div className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">
                <Upload className="w-3.5 h-3.5" />
                {uploading ? 'Uploading…' : 'Upload logo'}
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
                disabled={uploading}
              />
            </label>
            {draft.logo_url && (
              <button
                className="block text-xs text-destructive hover:underline"
                onClick={() => patch('logo_url')(null)}
              >
                Remove
              </button>
            )}
            <p className="text-xs text-muted-foreground">
              Stored in <span className="font-mono">restaurant-assets</span> bucket.
            </p>
          </div>
        </div>
      </section>

      {/* ── Colors ── */}
      <section className="space-y-3">
        <h2 className="font-semibold text-sm">Colors</h2>
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          {(
            [
              { key: 'primary_color'   as keyof Draft, label: 'Primary' },
              { key: 'secondary_color' as keyof Draft, label: 'Secondary' },
              { key: 'accent_color'    as keyof Draft, label: 'Accent' },
            ] as const
          ).map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <label
                htmlFor={key}
                className="w-9 h-9 rounded-lg border border-border cursor-pointer shrink-0 overflow-hidden"
                style={{ backgroundColor: draft[key] as string }}
              >
                <input
                  id={key}
                  type="color"
                  value={draft[key] as string}
                  onChange={(e) => patch(key)(e.target.value)}
                  className="opacity-0 w-px h-px"
                />
              </label>
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground font-mono">{draft[key] as string}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Appearance ── */}
      <section className="space-y-3">
        <h2 className="font-semibold text-sm">Appearance</h2>
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">

          <div className="space-y-1.5">
            <Label className="text-xs">Font</Label>
            <Select value={draft.font_family} onValueChange={(v) => v && patch('font_family')(v)}>
              <SelectTrigger className="h-8 text-sm">
                {/* Show the current font name in its own typeface */}
                <span style={{ fontFamily: FONT_STACKS[draft.font_family] ?? FONT_STACKS.inter }}>
                  {FONTS.find((f) => f.value === draft.font_family)?.label ?? 'Inter'}
                </span>
              </SelectTrigger>
              <SelectContent>
                {FONTS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    <span style={{ fontFamily: f.stack }}>{f.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Button style</Label>
            <Select value={draft.button_style} onValueChange={(v) => v && patch('button_style')(v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BUTTON_STYLES.map((b) => (
                  <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Background</Label>
            <Select
              value={draft.background_type}
              onValueChange={(v) => v && patch('background_type')(v)}
            >
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BG_TYPES.map((b) => (
                  <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {draft.background_type === 'solid' ? (
              <label htmlFor="bg_color" className="flex items-center gap-2 mt-2 cursor-pointer">
                <div
                  className="w-8 h-8 rounded border border-border shrink-0"
                  style={{ backgroundColor: draft.background_value }}
                />
                <span className="text-xs text-muted-foreground font-mono">{draft.background_value}</span>
                <input
                  id="bg_color"
                  type="color"
                  value={draft.background_value}
                  onChange={(e) => patch('background_value')(e.target.value)}
                  className="opacity-0 w-px h-px"
                />
              </label>
            ) : (
              <input
                className="w-full h-8 text-xs rounded-md border border-border px-2 mt-2 bg-background"
                placeholder={
                  draft.background_type === 'gradient'
                    ? 'linear-gradient(135deg, #ff6600 0%, #ffcc00 100%)'
                    : 'https://example.com/image.jpg'
                }
                value={draft.background_value}
                onChange={(e) => patch('background_value')(e.target.value)}
              />
            )}
          </div>
        </div>
      </section>

      {/* ── Portal scope ── */}
      <section className="space-y-3">
        <h2 className="font-semibold text-sm">Apply theme to</h2>
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          {(
            [
              { key: 'customer_theme_enabled' as keyof Draft, label: 'Customer menu portal' },
              { key: 'admin_theme_enabled'    as keyof Draft, label: 'Admin portal' },
              { key: 'waiter_theme_enabled'   as keyof Draft, label: 'Waiter portal' },
              { key: 'kitchen_theme_enabled'  as keyof Draft, label: 'Kitchen portal' },
            ] as const
          ).map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{label}</p>
              <Switch
                checked={draft[key] as boolean}
                onCheckedChange={(v) => patch(key)(v)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── Permissions ── */}
      <section className="space-y-3">
        <h2 className="font-semibold text-sm">Restaurant admin permissions</h2>
        <p className="text-xs text-muted-foreground">
          What the restaurant admin is allowed to edit themselves.
        </p>
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          {(
            [
              { key: 'allow_logo_edit'           as keyof Draft, label: 'Can edit logo' },
              { key: 'allow_color_edit'          as keyof Draft, label: 'Can edit brand colors' },
              { key: 'allow_menu_edit'           as keyof Draft, label: 'Can edit menu items' },
              { key: 'allow_feature_toggle_edit' as keyof Draft, label: 'Can toggle features' },
            ] as const
          ).map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{label}</p>
              <Switch
                checked={draft[key] as boolean}
                onCheckedChange={(v) => patch(key)(v)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── Reset confirmation ── */}
      {confirmReset && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
          <p className="text-sm font-medium text-destructive">Reset all branding to defaults?</p>
          <p className="text-xs text-muted-foreground">
            This will clear the logo, restore default colors, font, and background, turn off all portal themes, and reset permissions. You can still cancel before saving.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              onClick={() => { setDraft(DEFAULT_DRAFT); setConfirmReset(false) }}
            >
              Confirm reset
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* ── Save / Cancel ── */}
      {isDirty && (
        <div className="fixed bottom-20 left-0 right-0 px-4 flex gap-2 max-w-lg mx-auto">
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={save.isPending}
          >
            {save.isPending ? 'Saving…' : 'Save branding'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setDraft(baseline)}
            disabled={save.isPending}
          >
            Cancel
          </Button>
        </div>
      )}

      {saved && !isDirty && (
        <p className="text-sm text-center text-primary flex items-center justify-center gap-1">
          <Check className="w-4 h-4" /> Branding saved
        </p>
      )}

      {save.isError && (
        <p className="text-sm text-destructive text-center">
          {(save.error as Error)?.message ?? 'Failed to save. Try again.'}
        </p>
      )}
    </div>
  )
}
