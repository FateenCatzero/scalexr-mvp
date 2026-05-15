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
  const upload = useUploadModel()
  const deleteModel = useDeleteModel()

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await upload.mutateAsync({ restaurantId, menuItemId, file, assetType })
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
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
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full flex items-center gap-1.5 bg-muted rounded px-2 py-1.5 hover:bg-muted/70 transition-colors"
          >
            <Box className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground flex-1 text-left truncate">Uploaded</span>
            <span className="text-xs underline text-muted-foreground shrink-0">Replace</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full rounded border-2 border-dashed border-border py-3 flex flex-col items-center gap-1 hover:border-foreground/40 hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {uploading ? 'Uploading…' : 'Upload'}
            </span>
          </button>
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
        <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
          <Box className="w-4 h-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground truncate flex-1">
            Model uploaded
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs underline text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            Replace
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full rounded-lg border-2 border-dashed border-border py-4 flex flex-col items-center gap-1.5 hover:border-foreground/40 hover:bg-muted/50 transition-colors disabled:opacity-50"
        >
          <Upload className="w-5 h-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {uploading ? 'Uploading…' : `Upload ${label}`}
          </span>
        </button>
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
