'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { uploadImage } from '@/lib/queries/admin'

interface ImageUploadProps {
  restaurantId: string
  value: string | null
  onChange: (url: string | null) => void
}

export default function ImageUpload({ restaurantId, value, onChange }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const url = await uploadImage(restaurantId, file)
      onChange(url)
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      {value ? (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Item" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 right-2 rounded-lg bg-black/60 text-white text-xs px-2.5 py-1 hover:bg-black/80 transition-colors"
          >
            Change
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full aspect-video rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          ) : (
            <ImagePlus className="w-6 h-6 text-muted-foreground" />
          )}
          <span className="text-sm text-muted-foreground">
            {uploading ? 'Uploading…' : 'Tap to upload image'}
          </span>
        </button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
