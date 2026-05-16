'use client'

// SettingsClient — lets the restaurant admin update their restaurant's name and description.
// The slug is shown read-only (it cannot be changed after creation — changing it would
// break existing QR codes and bookmarks).
// After saving, the button briefly shows "Saved!" with a checkmark for 3 seconds.
// The save button is disabled until the form is dirty (any field changed from saved values).

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useUpdateRestaurant } from '@/lib/queries/admin'
import type { Restaurant } from '@/lib/types'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
})

type Values = z.infer<typeof schema>

export default function SettingsClient({ restaurant }: { restaurant: Restaurant }) {
  const update = useUpdateRestaurant()
  const [saved, setSaved] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: restaurant.name,
      description: restaurant.description ?? '',
    },
  })

  const onSubmit = async (values: Values) => {
    await update.mutateAsync({
      id: restaurant.id,
      updates: {
        name: values.name,
        description: values.description || null,
      },
    })
    reset(values)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="px-4 pt-6 space-y-6">
      <h2 className="font-bold text-lg">Restaurant settings</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
          <Label>Restaurant URL</Label>
          <div className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground select-all">
            /r/{restaurant.slug}
          </div>
          <p className="text-xs text-muted-foreground">Share this URL with your customers.</p>
        </div>

        {update.isError && (
          <p className="text-sm text-destructive">Something went wrong. Please try again.</p>
        )}

        <Button type="submit" className="w-full" disabled={update.isPending || !isDirty}>
          {update.isPending ? 'Saving…' : saved ? <><Check className="w-4 h-4 inline mr-1" />Saved!</> : 'Save settings'}
        </Button>
      </form>
    </div>
  )
}
