'use client'

import { useRef, useState } from 'react'
import { Box, Trash2, Upload } from 'lucide-react'
import { useUploadModel, useDeleteModel } from '@/lib/queries/admin'
import type { ItemAsset } from '@/lib/types'

interface ModelUploadProps {
  restaurantId: string
  menuItemId: string
  assetType: 'model_glb' | 'model_usdz'
  label: string
  accept: string
  hint: string
  existing: ItemAsset | undefined
  compact?: boolean
}

export default function ModelUpload({
  restaurantId,
  menuItemId,
  assetType,
  label,
  accept,
  hint,
  existing,
  compact = false,
}: ModelUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)
  const upload = useUploadModel()
  const deleteModel = useDeleteModel()

  const processFile = async (file: File) => {
    setUploading(true)
    try {
      await upload.mutateAsync({ restaurantId, menuItemId, file, assetType })
    } finally {
      setUploading(false)
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

  const handleDelete = async () => {
    if (!existing) return
    await deleteModel.mutateAsync({ asset: existing, menuItemId })
  }

  if (compact) {
    return (
      <div className="rounded-lg border border-border bg-background p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-xs">{label}</p>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </div>
          {existing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteModel.isPending}
              className="w-6 h-6 rounded flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>

        {existing ? (
          <div
            {...dragProps}
            onClick={() => inputRef.current?.click()}
            className={[
              'w-full flex items-center gap-1.5 rounded px-2 py-1.5 transition-all cursor-pointer border-2 border-dashed',
              isDragging ? 'border-primary bg-primary/5' : 'border-transparent bg-muted hover:bg-muted/70',
            ].join(' ')}
          >
            <Box className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground flex-1 text-left truncate">
              {isDragging ? 'Drop to replace' : 'Uploaded'}
            </span>
            {!isDragging && (
              <span className="text-xs underline text-muted-foreground shrink-0">Replace</span>
            )}
          </div>
        ) : (
          <div
            {...dragProps}
            onClick={() => !uploading && inputRef.current?.click()}
            className={[
              'w-full rounded border-2 border-dashed py-3 flex flex-col items-center gap-1 transition-all cursor-pointer select-none',
              uploading ? 'opacity-50 pointer-events-none' : '',
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-foreground/40 hover:bg-muted/50',
            ].join(' ')}
          >
            <Upload className={['w-4 h-4 transition-colors', isDragging ? 'text-primary' : 'text-muted-foreground'].join(' ')} />
            <span className={['text-xs transition-colors', isDragging ? 'text-primary font-medium' : 'text-muted-foreground'].join(' ')}>
              {uploading ? 'Uploading…' : isDragging ? 'Drop here' : 'Tap or drop'}
            </span>
          </div>
        )}

        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
        {(upload.isError || deleteModel.isError) && (
          <p className="text-xs text-destructive">Error. Try again.</p>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">{label}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        {existing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteModel.isPending}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {existing ? (
        <div
          {...dragProps}
          onClick={() => inputRef.current?.click()}
          className={[
            'flex items-center gap-2 rounded-lg px-3 py-2 transition-all cursor-pointer border-2 border-dashed',
            isDragging ? 'border-primary bg-primary/5' : 'border-transparent bg-muted hover:bg-muted/70',
          ].join(' ')}
        >
          <Box className="w-4 h-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground truncate flex-1">
            {isDragging ? 'Drop to replace' : 'Model uploaded'}
          </p>
          {!isDragging && (
            <span className="text-xs underline text-muted-foreground hover:text-foreground transition-colors shrink-0">
              Replace
            </span>
          )}
        </div>
      ) : (
        <div
          {...dragProps}
          onClick={() => !uploading && inputRef.current?.click()}
          className={[
            'w-full rounded-lg border-2 border-dashed py-4 flex flex-col items-center gap-1.5 transition-all cursor-pointer select-none',
            uploading ? 'opacity-50 pointer-events-none' : '',
            isDragging
              ? 'border-primary bg-primary/5 scale-[1.01]'
              : 'border-border hover:border-foreground/40 hover:bg-muted/50',
          ].join(' ')}
        >
          <Upload className={['w-5 h-5 transition-colors', isDragging ? 'text-primary' : 'text-muted-foreground'].join(' ')} />
          <span className={['text-xs transition-colors', isDragging ? 'text-primary font-medium' : 'text-muted-foreground'].join(' ')}>
            {uploading ? 'Uploading…' : isDragging ? `Drop ${label} here` : 'Tap or drag & drop'}
          </span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFile}
      />

      {(upload.isError || deleteModel.isError) && (
        <p className="text-xs text-destructive">Something went wrong. Try again.</p>
      )}
    </div>
  )
}
