'use client'

import { useWhiteboardStore } from '@/store/whiteboardStore'
import { Button } from '@/components/ui/button'

interface ZoomControlProps {
  /** 전체보기: 브라우저 UI를 숨기고 앱만 전체 화면으로 (공간 확보) */
  onToggleFullscreen?: () => void
  isFullscreen?: boolean
}

export default function ZoomControl({ onToggleFullscreen, isFullscreen }: ZoomControlProps) {
  const { zoom, setZoom } = useWhiteboardStore()
  const pct = Math.round(zoom * 100)

  return (
    <div className="flex items-center gap-2">
      {onToggleFullscreen && (
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="text-xs text-gray-600 hover:text-blue-600 transition-colors whitespace-nowrap"
          title={isFullscreen ? '전체보기 해제' : '주소창·북마크 등을 숨기고 앱만 전체 화면으로'}
        >
          {isFullscreen ? '전체보기 해제' : '전체보기'}
        </button>
      )}
      <Button variant="ghost" size="sm" onClick={() => setZoom(zoom - 0.1)} className="h-7 w-7 p-0 text-base">−</Button>
      <button onClick={() => setZoom(1)} className="text-xs text-gray-600 min-w-[48px] text-center hover:text-blue-600 transition-colors">
        {pct}%
      </button>
      <Button variant="ghost" size="sm" onClick={() => setZoom(zoom + 0.1)} className="h-7 w-7 p-0 text-base">+</Button>
    </div>
  )
}
