'use client'

import { useWhiteboardStore } from '@/store/whiteboardStore'
import { Button } from '@/components/ui/button'

export default function ZoomControl() {
  const { zoom, setZoom } = useWhiteboardStore()
  const pct = Math.round(zoom * 100)

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" onClick={() => setZoom(zoom - 0.1)} className="h-7 w-7 p-0 text-base">−</Button>
      <button onClick={() => setZoom(1)} className="text-xs text-gray-600 min-w-[48px] text-center hover:text-blue-600 transition-colors">
        {pct}%
      </button>
      <Button variant="ghost" size="sm" onClick={() => setZoom(zoom + 0.1)} className="h-7 w-7 p-0 text-base">+</Button>
    </div>
  )
}
