'use client'

// MasterDashboardClient — the platform-level admin dashboard.
// Shows platform-wide stats (total restaurants, active count, orders today, new this month)
// and a list of all restaurants with per-restaurant order count and revenue.
//
// Actions per restaurant:
//   - "Admin dashboard" link: navigates to /admin/[slug] as the master admin
//     (the layout there shows the MasterControlBanner in this case).
//   - Suspend/Activate toggle: sets is_active on the restaurant.
//     Suspending requires a confirmation step (two clicks to prevent accidents).
//   - Settings gear: inline form to edit restaurant name and description.
//
// Creating a new restaurant:
//   1. Master admin fills in name (slug is auto-slugified from the name).
//   2. useMasterCreateRestaurant inserts the restaurant row.
//   3. The success state shows the signup URL and the slug — the master admin
//      shares these with the restaurant owner who signs up to create their admin account.

import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Power, PowerOff, Check, X, Store,
  Users, CalendarPlus, ShoppingBag, Settings, LayoutDashboard, Zap, Palette,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatPrice } from '@/lib/utils'
import {
  useMasterRestaurants,
  useMasterCreateRestaurant,
  useMasterToggleRestaurant,
  useMasterUpdateRestaurant,
  useMasterPlatformStats,
  useMasterRestaurantFeatures,
  useMasterSavePlanAndFeatures,
  useSubscriptionPlans,
} from '@/lib/queries/master'
import type { RestaurantWithStats, FeatureKey } from '@/lib/types'

const FEATURE_LABELS: Record<FeatureKey, string> = {
  '3d_view':          '3D View',
  ar_view:            'AR View',
  cart:               'Cart & Checkout',
  ratings:            'Ratings & Reviews',
  top_selling:        'Top Selling',
  most_viewed:        'Most Viewed',
  best_rated:         'Best Rated',
  analytics:          'Analytics',
  inventory_tracking: 'Inventory Tracking',
  staff_management:   'Staff Management',
  bulk_upload:        'Bulk Upload',
}

const ALL_FEATURE_KEYS: FeatureKey[] = [
  '3d_view', 'ar_view',
  'cart',
  'ratings', 'top_selling', 'most_viewed', 'best_rated',
  'analytics',
  'inventory_tracking', 'staff_management', 'bulk_upload',
]

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers and hyphens'),
  description: z.string().optional(),
})
type CreateValues = z.infer<typeof createSchema>

// Auto-generates a URL-safe slug from the restaurant name as the admin types.
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function MasterDashboardClient() {
  const { data: restaurants = [], isLoading } = useMasterRestaurants()
  const { data: stats } = useMasterPlatformStats()
  const [adding, setAdding] = useState(false)

  return (
    <div className="px-4 pt-6 space-y-6 pb-6">
      {/* Platform stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Store className="w-4 h-4" />}
          label="Total clients"
          value={stats?.totalRestaurants ?? '—'}
          sub={stats ? `${stats.activeRestaurants} active` : undefined}
        />
        <StatCard
          icon={<Users className="w-4 h-4" />}
          label="Active now"
          value={stats?.activeRestaurants ?? '—'}
          sub={stats ? `${(stats.totalRestaurants ?? 0) - (stats.activeRestaurants ?? 0)} suspended` : undefined}
        />
        <StatCard
          icon={<ShoppingBag className="w-4 h-4" />}
          label="Orders today"
          value={stats?.ordersToday ?? '—'}
          sub="across all restaurants"
        />
        <StatCard
          icon={<CalendarPlus className="w-4 h-4" />}
          label="New this month"
          value={stats?.newThisMonth ?? '—'}
          sub="new restaurants"
        />
      </div>

      {/* Restaurant list header */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-base">Restaurants</h2>
        {!adding && (
          <Button size="sm" className="gap-1.5" onClick={() => setAdding(true)}>
            <Plus className="w-3.5 h-3.5" /> New
          </Button>
        )}
      </div>

      {/* Create form */}
      {adding && (
        <CreateRestaurantForm
          onDone={() => setAdding(false)}
          onCancel={() => setAdding(false)}
        />
      )}

      {/* Restaurant cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => <Skeleton key={n} className="h-28 rounded-xl" />)}
        </div>
      ) : !restaurants.length ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No restaurants yet. Add the first one above.
        </p>
      ) : (
        <div className="space-y-3">
          {restaurants.map((r) => (
            <RestaurantCard key={r.id} restaurant={r} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── CREATE FORM ──────────────────────────────────────────────────────────────

function CreateRestaurantForm({
  onDone,
  onCancel,
}: {
  onDone: () => void
  onCancel: () => void
}) {
  const create = useMasterCreateRestaurant()
  const [created, setCreated] = useState<string | null>(null)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
  })

  const onSubmit = async (values: CreateValues) => {
    await create.mutateAsync(values)
    setCreated(values.slug)
  }

  if (created) {
    return (
      <div className="rounded-xl border border-primary/40 bg-card p-4 space-y-3">
        <div className="flex items-start gap-2">
          <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold text-sm">Restaurant created!</p>
            <p className="text-xs text-muted-foreground">
              Share this signup link with the restaurant owner so they can create their admin account:
            </p>
            <div className="rounded-lg bg-muted px-3 py-2 text-xs font-mono select-all break-all">
              {typeof window !== 'undefined' ? window.location.origin : ''}/admin/login
            </div>
            <p className="text-xs text-muted-foreground">
              They will need the slug: <span className="font-semibold text-foreground">{created}</span>
            </p>
          </div>
        </div>
        <Button size="sm" className="w-full" onClick={onDone}>Done</Button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-primary/40 bg-card p-4 space-y-3">
      <p className="font-semibold text-sm">New restaurant</p>

      <div className="space-y-1">
        <Label className="text-xs">Restaurant name *</Label>
        <Input
          placeholder="Karahi Palace"
          className="h-8 text-sm"
          {...register('name', {
            onChange: (e) => setValue('slug', slugify(e.target.value), { shouldValidate: false }),
          })}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1">
        <Label className="text-xs">URL slug *</Label>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground shrink-0">/r/</span>
          <Input
            placeholder="karahi-palace"
            className="h-8 text-sm"
            {...register('slug')}
          />
        </div>
        {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
        <p className="text-xs text-muted-foreground">Auto-filled from name. Only lowercase letters, numbers, hyphens.</p>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Description <span className="text-muted-foreground">(optional)</span></Label>
        <Input
          placeholder="A short description"
          className="h-8 text-sm"
          {...register('description')}
        />
      </div>

      {create.isError && (
        <p className="text-xs text-destructive">
          {(create.error as Error)?.message ?? 'Failed to create. Slug may already be taken.'}
        </p>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={handleSubmit(onSubmit)}
          disabled={create.isPending}
        >
          {create.isPending ? 'Creating…' : 'Create restaurant'}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ─── RESTAURANT CARD ──────────────────────────────────────────────────────────

const settingsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
})
type SettingsValues = z.infer<typeof settingsSchema>

function RestaurantCard({ restaurant: r }: { restaurant: RestaurantWithStats }) {
  const toggle = useMasterToggleRestaurant()
  const update = useMasterUpdateRestaurant()
  const [confirming, setConfirming] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showFeatures, setShowFeatures] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)

  const handleToggle = async () => {
    if (!confirming && r.is_active) { setConfirming(true); return }
    await toggle.mutateAsync({ id: r.id, is_active: !r.is_active })
    setConfirming(false)
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { name: r.name, description: r.description ?? '' },
  })

  const onSettingsSave = async (values: SettingsValues) => {
    await update.mutateAsync({
      id: r.id,
      updates: { name: values.name, description: values.description || null },
    })
    reset(values)
    setSettingsSaved(true)
    setTimeout(() => setSettingsSaved(false), 3000)
  }

  return (
    <div className={[
      'rounded-xl border bg-card p-4 space-y-3 transition-colors',
      !r.is_active ? 'border-border opacity-60' : 'border-border',
    ].join(' ')}>
      {/* Name row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm truncate">{r.name}</p>
            <Badge variant={r.is_active ? 'default' : 'secondary'} className="text-xs shrink-0">
              {r.is_active ? 'Active' : 'Suspended'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">/r/{r.slug}</p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={() => { setShowFeatures((v) => !v); setShowSettings(false); setConfirming(false) }}
            className={[
              'flex items-center justify-center w-8 h-8 rounded-lg border transition-colors',
              showFeatures
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border hover:bg-muted text-muted-foreground',
            ].join(' ')}
            title="Feature flags"
          >
            <Zap className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setShowSettings((v) => !v); setShowFeatures(false); setConfirming(false) }}
            className={[
              'flex items-center justify-center w-8 h-8 rounded-lg border transition-colors',
              showSettings
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border hover:bg-muted text-muted-foreground',
            ].join(' ')}
            title="Restaurant settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Inline settings panel */}
      {showSettings && (
        <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Settings</p>
          <div className="space-y-1">
            <Label className="text-xs">Restaurant name</Label>
            <Input className="h-8 text-sm" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea className="text-sm resize-none" rows={2} {...register('description')} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Menu URL</Label>
            <div className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground font-mono select-all">
              /r/{r.slug}
            </div>
          </div>
          {update.isError && (
            <p className="text-xs text-destructive">
              {(update.error as Error)?.message ?? 'Failed to save'}
            </p>
          )}
          <Button
            size="sm"
            className="w-full"
            onClick={handleSubmit(onSettingsSave)}
            disabled={update.isPending || !isDirty}
          >
            {update.isPending ? 'Saving…' : settingsSaved ? <><Check className="w-3.5 h-3.5 inline mr-1" />Saved!</> : 'Save settings'}
          </Button>
        </div>
      )}

      {/* Features panel */}
      {showFeatures && (
        <FeaturesPanel restaurantId={r.id} currentPlanId={r.plan_id ?? null} />
      )}

      {/* Stats row */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span><span className="font-medium text-foreground">{r.orderCount}</span> orders</span>
        <span><span className="font-medium text-foreground">{formatPrice(r.revenue)}</span> revenue</span>
        <span className="text-muted-foreground/60">
          since {new Date(r.created_at).toLocaleDateString()}
        </span>
      </div>

      {/* Action row */}
      {confirming ? (
        <div className="flex items-center gap-2">
          <p className="flex-1 text-xs text-destructive font-medium">Suspend &ldquo;{r.name}&rdquo;?</p>
          <button
            onClick={() => setConfirming(false)}
            className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleToggle}
            disabled={toggle.isPending}
            className="text-xs px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
          >
            Suspend
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Link
            href={`/admin/${r.slug}`}
            className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
          >
            <LayoutDashboard className="w-3.5 h-3.5" /> Admin dashboard
          </Link>
          <Link
            href={`/admin/master/restaurants/${r.slug}/branding`}
            className="flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
            title="Branding"
          >
            <Palette className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={handleToggle}
            disabled={toggle.isPending}
            className={[
              'flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors',
              r.is_active
                ? 'text-destructive border border-destructive/30 hover:bg-destructive/10'
                : 'text-primary border border-primary/30 hover:bg-primary/10',
            ].join(' ')}
          >
            {r.is_active
              ? <><PowerOff className="w-3.5 h-3.5" /> Suspend</>
              : <><Power className="w-3.5 h-3.5" /> Activate</>
            }
          </button>
        </div>
      )}
    </div>
  )
}

// ─── FEATURES PANEL ───────────────────────────────────────────────────────────

type Snapshot = { planId: string | null; features: Record<string, boolean> }

function FeaturesPanel({
  restaurantId,
  currentPlanId,
}: {
  restaurantId: string
  currentPlanId: string | null
}) {
  const { data: features, isLoading } = useMasterRestaurantFeatures(restaurantId)
  const { data: plans } = useSubscriptionPlans()
  const save = useMasterSavePlanAndFeatures()

  // baseline = last saved state. null while loading / after save (triggers re-init).
  const [baseline, setBaseline] = useState<Snapshot | null>(null)
  const [draftPlanId, setDraftPlanId] = useState<string | null>(currentPlanId)
  const [draftFeatures, setDraftFeatures] = useState<Record<string, boolean>>({})

  // Initialise draft from server data on first load (and after save invalidation).
  useEffect(() => {
    if (!features || baseline !== null) return
    const map = Object.fromEntries(features.map((f) => [f.feature_key, f.enabled]))
    setBaseline({ planId: currentPlanId, features: map })
    setDraftPlanId(currentPlanId)
    setDraftFeatures(map)
  }, [features, baseline, currentPlanId])

  const isDirty = useMemo(() => {
    if (!baseline) return false
    if (draftPlanId !== baseline.planId) return true
    return ALL_FEATURE_KEYS.some((k) => (draftFeatures[k] ?? false) !== (baseline.features[k] ?? false))
  }, [baseline, draftPlanId, draftFeatures])

  const handlePlanChange = (value: string | null) => {
    if (!value) return
    const planId = value === 'none' ? null : value
    setDraftPlanId(planId)
    if (!planId) return // "No plan" — keep current feature overrides
    const plan = plans?.find((p) => p.id === planId)
    if (!plan) return
    // Auto-apply plan features: enabled iff the plan's features[] includes the key.
    setDraftFeatures(
      Object.fromEntries(ALL_FEATURE_KEYS.map((k) => [k, plan.features.includes(k)]))
    )
  }

  const handleSave = async () => {
    await save.mutateAsync({ restaurantId, planId: draftPlanId, features: draftFeatures })
    setBaseline(null) // lets useEffect re-init from fresh server data after invalidation
  }

  const handleCancel = () => {
    if (!baseline) return
    setDraftPlanId(baseline.planId)
    setDraftFeatures(baseline.features)
  }

  if (isLoading || baseline === null) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
        {[1, 2, 3].map((n) => <Skeleton key={n} className="h-7 w-full rounded-md" />)}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Features & Plan</p>

      {/* Plan selector — controlled, drives feature auto-fill */}
      {plans && plans.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Subscription plan</p>
          <Select value={draftPlanId ?? 'none'} onValueChange={handlePlanChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No plan (basic/free)</SelectItem>
              {plans.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name.charAt(0).toUpperCase() + p.name.slice(1)} —{' '}
                  {p.price === 0 ? 'Free' : `PKR ${p.price.toLocaleString()}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Feature toggles — local draft only, persisted on Save */}
      <div className="space-y-2">
        {ALL_FEATURE_KEYS.map((key) => (
          <div key={key} className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium">{FEATURE_LABELS[key]}</p>
            <Switch
              checked={draftFeatures[key] ?? false}
              onCheckedChange={(checked) =>
                setDraftFeatures((prev) => ({ ...prev, [key]: checked }))
              }
            />
          </div>
        ))}
      </div>

      {/* Save / Cancel — only visible when there are unsaved changes */}
      {isDirty && (
        <div className="flex gap-2 pt-2 border-t border-border">
          <Button
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={handleSave}
            disabled={save.isPending}
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={handleCancel}
            disabled={save.isPending}
          >
            Cancel
          </Button>
        </div>
      )}

      {save.isError && (
        <p className="text-xs text-destructive">
          {(save.error as Error)?.message ?? 'Failed to save. Try again.'}
        </p>
      )}
    </div>
  )
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  sub?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-3 flex flex-col gap-1">
      <div className="text-muted-foreground">{icon}</div>
      <p className="text-xl font-bold leading-tight">{value}</p>
      <p className="text-xs font-medium text-foreground/80">{label}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}
