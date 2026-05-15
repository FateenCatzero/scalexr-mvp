'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, ExternalLink, Power, PowerOff, Check, X, Store,
  ShoppingBag, TrendingUp, Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatPrice } from '@/lib/utils'
import {
  useMasterRestaurants,
  useMasterCreateRestaurant,
  useMasterToggleRestaurant,
} from '@/lib/queries/master'
import type { RestaurantWithStats } from '@/lib/types'

// ─── SCHEMA ───────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers and hyphens'),
  description: z.string().optional(),
})
type CreateValues = z.infer<typeof createSchema>

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function MasterDashboardClient() {
  const { data: restaurants = [], isLoading } = useMasterRestaurants()
  const [adding, setAdding] = useState(false)

  const totalActive = restaurants.filter((r) => r.is_active).length
  const totalRevenue = restaurants.reduce((s, r) => s + r.revenue, 0)
  const totalOrders = restaurants.reduce((s, r) => s + r.orderCount, 0)

  return (
    <div className="px-4 pt-6 space-y-6 pb-6">
      {/* Global stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Store className="w-4 h-4" />} label="Total restaurants" value={restaurants.length} />
        <StatCard icon={<Activity className="w-4 h-4" />} label="Active" value={totalActive} />
        <StatCard icon={<ShoppingBag className="w-4 h-4" />} label="Total orders" value={totalOrders} />
        <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Total revenue" value={`PKR ${totalRevenue.toLocaleString()}`} />
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

function RestaurantCard({ restaurant: r }: { restaurant: RestaurantWithStats }) {
  const toggle = useMasterToggleRestaurant()
  const [confirming, setConfirming] = useState(false)

  const handleToggle = async () => {
    if (!confirming && r.is_active) { setConfirming(true); return }
    await toggle.mutateAsync({ id: r.id, is_active: !r.is_active })
    setConfirming(false)
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
      </div>

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
          <a
            href={`/admin/${r.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> View admin
          </a>
          <a
            href={`/r/${r.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> View menu
          </a>
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

// ─── STAT CARD ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-3 flex flex-col gap-1">
      <div className="text-muted-foreground">{icon}</div>
      <p className="text-xl font-bold leading-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
