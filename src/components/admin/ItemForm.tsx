'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import ImageUpload from './ImageUpload'
import type { Category, MenuItem } from '@/lib/types'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be 0 or more'),
  category_id: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  is_available: z.boolean(),
})

export type ItemFormValues = z.infer<typeof schema>

interface ItemFormProps {
  restaurantId: string
  categories: Category[]
  defaultValues?: Partial<MenuItem>
  onSubmit: (values: ItemFormValues) => Promise<void>
  loading: boolean
  submitLabel: string
}

export default function ItemForm({
  restaurantId,
  categories,
  defaultValues,
  onSubmit,
  loading,
  submitLabel,
}: ItemFormProps) {
  const { register, handleSubmit, control, formState: { errors } } = useForm<ItemFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '',
      price: defaultValues?.price ?? 0,
      category_id: defaultValues?.category_id ?? null,
      image_url: defaultValues?.image_url ?? null,
      is_available: defaultValues?.is_available ?? true,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-4 py-5">
      {/* Image */}
      <div className="space-y-1.5">
        <Label>Photo</Label>
        <Controller
          name="image_url"
          control={control}
          render={({ field }) => (
            <ImageUpload
              restaurantId={restaurantId}
              value={field.value ?? null}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="e.g. Chicken Karahi" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Description <span className="text-muted-foreground">(optional)</span></Label>
        <Textarea
          id="description"
          placeholder="What's in this dish?"
          rows={3}
          {...register('description')}
        />
      </div>

      {/* Price */}
      <div className="space-y-1.5">
        <Label htmlFor="price">Price (PKR)</Label>
        <Input id="price" type="number" min="0" step="1" placeholder="850" {...register('price', { valueAsNumber: true })} />
        {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label>Category <span className="text-muted-foreground">(optional)</span></Label>
        <Controller
          name="category_id"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ?? 'none'}
              onValueChange={(v) => field.onChange(v === 'none' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No category</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Available toggle */}
      <div className="flex items-center justify-between py-1">
        <div>
          <p className="font-medium text-sm">Available</p>
          <p className="text-xs text-muted-foreground">Show this item on the menu</p>
        </div>
        <Controller
          name="is_available"
          control={control}
          render={({ field }) => (
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}
