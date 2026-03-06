'use client'

import { useWhiteboardStore } from '@/store/whiteboardStore'
import { Button } from '@/components/ui/button'

interface PageNavigatorProps {
  onPrevPage: () => void
  onNextPage: () => void
  onAddPage: () => void
}

export default function PageNavigator({ onPrevPage, onNextPage, onAddPage }: PageNavigatorProps) {
  const { currentPageIndex, totalPages } = useWhiteboardStore()

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={onPrevPage} disabled={currentPageIndex === 0} className="h-7 w-7 p-0">
        ‹
      </Button>
      <span className="text-xs text-gray-600 min-w-[48px] text-center">
        {currentPageIndex + 1} / {totalPages}
      </span>
      <Button variant="ghost" size="sm" onClick={onNextPage} disabled={currentPageIndex >= totalPages - 1} className="h-7 w-7 p-0">
        ›
      </Button>
      <Button variant="outline" size="sm" onClick={onAddPage} className="h-7 px-2 text-xs ml-1">
        + 페이지
      </Button>
    </div>
  )
}
