'use client'

// TablesClient — creates and manages table entries, each of which has a generated QR code.
// Each table gets a unique URL: /r/[restaurantSlug]?table=[tableNumber].
// When a customer scans the QR code, the table number is stored in the cart and pre-fills
// the checkout form — the customer never has to type their table number.
//
// QR codes are rendered onto a <canvas> element using the `qrcode` npm package.
// The TableRow component renders the canvas and provides a "Download PNG" button
// that exports the canvas to a data URL and triggers a browser download.

import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Download, QrCode } from 'lucide-react'
import QRCode from 'qrcode'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRestaurantTables, useCreateTable, useDeleteTable } from '@/lib/queries/admin'
import type { Restaurant, RestaurantTable } from '@/lib/types'

export default function TablesClient({ restaurant }: { restaurant: Restaurant }) {
  const [newTableNumber, setNewTableNumber] = useState('')
  const [adding, setAdding] = useState(false)
  const { data: tables, isLoading } = useRestaurantTables(restaurant.id)
  const createTable = useCreateTable()
  const deleteTable = useDeleteTable()

  const handleAdd = async () => {
    const trimmed = newTableNumber.trim()
    if (!trimmed) return
    setAdding(true)
    try {
      await createTable.mutateAsync({ restaurantId: restaurant.id, tableNumber: trimmed })
      setNewTableNumber('')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = (table: RestaurantTable) => {
    if (!confirm(`Remove table ${table.table_number}?`)) return
    deleteTable.mutate({ id: table.id, restaurantId: restaurant.id })
  }

  return (
    <div className="px-4 pt-6 space-y-6">
      <h2 className="text-xl font-bold">Tables &amp; QR Codes</h2>

      {/* Add table */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Table number or name"
          value={newTableNumber}
          onChange={(e) => setNewTableNumber(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button size="sm" onClick={handleAdd} disabled={adding || !newTableNumber.trim()}>
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Table list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((n) => <Skeleton key={n} className="h-16 rounded-xl" />)}
        </div>
      ) : !tables?.length ? (
        <div className="text-center py-12">
          <QrCode className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No tables yet. Add a table to generate its QR code.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tables.map((table) => (
            <TableRow
              key={table.id}
              table={table}
              restaurantSlug={restaurant.slug}
              onDelete={() => handleDelete(table)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// TableRow — renders a single table with its QR code and download button.
// QR code generation happens in a useEffect after mount (browser-only API).
// The download creates a temporary <a> element with the canvas PNG data URL
// and programmatically clicks it — no server round-trip needed.
function TableRow({
  table,
  restaurantSlug,
  onDelete,
}: {
  table: RestaurantTable
  restaurantSlug: string
  onDelete: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [qrReady, setQrReady] = useState(false)
  // The QR code encodes the full URL including the table number.
  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/r/${restaurantSlug}?table=${encodeURIComponent(table.table_number)}`

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    QRCode.toCanvas(canvas, url, { width: 200, margin: 2, color: { dark: '#000000', light: '#ffffff' } }, (err) => {
      if (!err) setQrReady(true)
    })
  }, [url])

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `table-${table.table_number}-qr.png`
    a.click()
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">Table {table.table_number}</p>
          <p className="text-xs text-muted-foreground break-all mt-0.5">{url}</p>
        </div>
        <button
          onClick={onDelete}
          className="text-muted-foreground hover:text-destructive transition-colors p-1"
          aria-label="Delete table"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* QR code */}
      <div className="flex items-center gap-4">
        <div className="rounded-lg overflow-hidden border border-border bg-white p-2 w-[84px] h-[84px] flex items-center justify-center shrink-0">
          <canvas ref={canvasRef} style={{ width: 68, height: 68 }} />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={!qrReady}
          className="gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          Download PNG
        </Button>
      </div>
    </div>
  )
}
