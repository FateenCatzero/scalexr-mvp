'use client'

// SettingsClient — restaurant admin settings page.
//
// Displays four sections:
//   1. Restaurant details (name, description) — editable by restaurant admin.
//   2. Subscription plan — read-only, set by master admin.
//   3. Feature flags — read-only grid showing which features are enabled.
//   4. Checkout settings — allow_guest_checkout toggle (writes restaurant_settings).
//
// Security: all feature data comes from the server (page.tsx) which called
// getFeatureFlags() → validates via RLS. The client never decides what is enabled.

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useUpdateRestaurant } from '@/lib/queries/admin'
import { createClient } from '@/lib/supabase/client'
import type { Restaurant, FeatureFlags, RestaurantSettings, SubscriptionPlan, FeatureKey } from '@/lib/types'

const FEATURE_LABELS: Record<FeatureKey, string> = {
  '3d_view':          '3D View',
  ar_view:            'AR View',
  analytics:          'Analytics',
  inventory_tracking: 'Inventory Tracking',
  staff_management:   'Staff Management',
  bulk_upload:        'Bulk Upload',
}

const PLAN_COLORS: Record<string, string> = {
  basic:      'bg-muted text-muted-foreground',
  pro:        'bg-blue-100 text-blue-800',
  enterprise: 'bg-purple-100 text-purple-800',
}

const detailsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
})
type DetailsValues = z.infer<typeof detailsSchema>

interface SettingsClientProps {
  restaurant: Restaurant
  flags: FeatureFlags
  settings: RestaurantSettings | null
  plan: SubscriptionPlan | null
}

export default function SettingsClient({ restaurant, flags, settings, plan }: SettingsClientProps) {
  const update = useUpdateRestaurant()
  const [saved, setSaved] = useState(false)
  const [checkoutSaving, setCheckoutSaving] = useState(false)
  const [guestCheckout, setGuestCheckout] = useState(settings?.allow_guest_checkout ?? true)

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      name: restaurant.name,
      description: restaurant.description ?? '',
    },
  })

  const onSubmit = async (values: DetailsValues) => {
    await update.mutateAsync({
      id: restaurant.id,
      updates: { name: values.name, description: values.description || null },
    })
    reset(values)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleGuestCheckoutToggle = async (checked: boolean) => {
    setGuestCheckout(checked)
    setCheckoutSaving(true)
    try {
      const supabase = createClient()
      await supabase
        .from('restaurant_settings')
        .update({ allow_guest_checkout: checked, updated_at: new Date().toISOString() })
        .eq('restaurant_id', restaurant.id)
    } finally {
      setCheckoutSaving(false)
    }
  }

  const enabledFeatures = (Object.keys(flags) as FeatureKey[]).filter((k) => flags[k])
  const disabledFeatures = (Object.keys(flags) as FeatureKey[]).filter((k) => !flags[k])

  return (
    <div className="px-4 pt-6 space-y-8 pb-6">

      {/* ── Plan ── */}
      <section className="space-y-3">
        <h2 className="font-bold text-base">Subscription plan</h2>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3">
          {plan ? (
            <>
              <div>
                <p className="font-semibold capitalize">{plan.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {plan.price === 0 ? 'Free' : `PKR ${plan.price.toLocaleString()} / month`}
                </p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${PLAN_COLORS[plan.name] ?? PLAN_COLORS.basic}`}>
                {plan.name}
              </span>
            </>
          ) : (
            <>
              <div>
                <p className="font-semibold">Basic</p>
                <p className="text-xs text-muted-foreground mt-0.5">Free tier</p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PLAN_COLORS.basic}`}>
                Basic
              </span>
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Lock className="w-3 h-3" /> Plan changes are managed by ScaleXR.
        </p>
      </section>

      {/* ── Features ── */}
      <section className="space-y-3">
        <h2 className="font-bold text-base">Features</h2>
        <div className="grid grid-cols-2 gap-2">
          {enabledFeatures.map((key) => (
            <div key={key} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              <p className="text-xs font-medium">{FEATURE_LABELS[key]}</p>
            </div>
          ))}
          {disabledFeatures.map((key) => (
            <div key={key} className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 opacity-50">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/40 shrink-0" />
              <p className="text-xs font-medium text-muted-foreground">{FEATURE_LABELS[key]}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Lock className="w-3 h-3" /> Features are managed by ScaleXR.
        </p>
      </section>

      {/* ── Restaurant details ── */}
      <section className="space-y-3">
        <h2 className="font-bold text-base">Restaurant details</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Restaurant name</Label>
            <Input id="name" placeholder="My Restaurant" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="description"
              placeholder="A short description for customers"
              rows={3}
              {...register('description')}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Menu URL</Label>
            <div className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground select-all">
              /r/{restaurant.slug}
            </div>
            <p className="text-xs text-muted-foreground">Share this with your customers. The slug cannot be changed.</p>
          </div>

          {update.isError && (
            <p className="text-sm text-destructive">Something went wrong. Please try again.</p>
          )}

          <Button type="submit" className="w-full" disabled={update.isPending || !isDirty}>
            {update.isPending ? 'Saving…' : saved
              ? <><Check className="w-4 h-4 inline mr-1" />Saved!</>
              : 'Save details'}
          </Button>
        </form>
      </section>

      {/* ── Checkout settings ── */}
      <section className="space-y-3">
        <h2 className="font-bold text-base">Checkout settings</h2>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Allow guest checkout</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Customers can order without entering a name.
            </p>
          </div>
          <Switch
            checked={guestCheckout}
            onCheckedChange={handleGuestCheckoutToggle}
            disabled={checkoutSaving}
          />
        </div>
      </section>

    </div>
  )
}
