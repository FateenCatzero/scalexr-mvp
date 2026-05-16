'use client'

// ImageUpload — controlled image picker used in ItemForm.
// Supports both click-to-browse and drag-and-drop.
// Uploads immediately on file selection (fire-and-forget to Supabase Storage),
// then calls `onChange` with the returned public URL so the parent form field is updated.
//
// Two visual states:
//   - No image: a dashed drop zone with an ImagePlus icon.
//   - Has image: the uploaded image fills the container with "×" (remove) and "Change" overlays.
//     Drag-and-drop on the image shows a "Drop to replace" overlay.
//
// dragCounter tracks nested drag events (entering/leaving child elements) so isDragging
// doesn't flicker when the pointer moves between children inside the drop zone.

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
  const [isDragging, setIsDragging] = useState(false)
  // dragCounter counts how many nested drag-enter events are active — prevents
  // isDragging from flickering when moving between child DOM elements in the drop zone.
  const dragCounter = useRef(0)

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.')
      return
    }
    setUploading(true)
    setError(null)
    try {
      const url = await uploadImage(restaurantId, file)
      onChange(url)
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      // Reset the file input so the same file can be re-selected if needed.
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await processFile(file)
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current++
    setIsDragging(true)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) await processFile(file)
  }

  const dragProps = {
    onDragEnter: handleDragEnter,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
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
        <div
          {...dragProps}
          className={[
            'relative w-full aspect-video rounded-xl overflow-hidden border-2 transition-all',
            isDragging ? 'border-primary border-dashed' : 'border-transparent',
          ].join(' ')}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Item" className="w-full h-full object-cover rounded-xl" />

          {isDragging ? (
            <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center pointer-events-none">
              <p className="text-white text-sm font-semibold">Drop to replace</p>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      ) : (
        <div
          {...dragProps}
          role="button"
          tabIndex={0}
          onClick={() => !uploading && inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && !uploading && inputRef.current?.click()}
          className={[
            'w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all cursor-pointer select-none',
            uploading ? 'opacity-50 pointer-events-none' : '',
            isDragging
              ? 'border-primary bg-primary/5 scale-[1.01]'
              : 'border-border hover:border-foreground/40 hover:bg-muted/50',
          ].join(' ')}
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          ) : (
            <ImagePlus className={['w-6 h-6 transition-colors', isDragging ? 'text-primary' : 'text-muted-foreground'].join(' ')} />
          )}
          <span className={['text-sm transition-colors', isDragging ? 'text-primary font-medium' : 'text-muted-foreground'].join(' ')}>
            {uploading ? 'Uploading…' : isDragging ? 'Drop image here' : 'Tap or drag & drop'}
          </span>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
