'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useWhiteboardStore } from '@/store/whiteboardStore'
import { LocalBoard, LocalPage } from '@/types/board'
import Image from 'next/image'

interface LeftSidebarProps {
  boards: LocalBoard[]
  currentBoard: LocalBoard | null
  currentPageIndex: number
  pages: LocalPage[]
  onLoadBoard: (board: LocalBoard) => void
  onDeleteBoard: (id: string) => void
  onSwitchPage: (index: number) => void
  onDeletePage: (index: number) => void
  onDuplicatePage: (index: number) => void
}

export default function LeftSidebar({
  boards, currentBoard, currentPageIndex, pages,
  onLoadBoard, onDeleteBoard, onSwitchPage, onDeletePage, onDuplicatePage,
}: LeftSidebarProps) {
  const { isSidebarOpen, toggleSidebar } = useWhiteboardStore()

  return (
    <Sheet open={isSidebarOpen} onOpenChange={toggleSidebar}>
      <SheetContent side="left" className="w-64 p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-gray-200">
          <SheetTitle className="text-sm font-semibold text-[#1E2D5E]">보드 & 페이지</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Current board pages */}
          {currentBoard && (
            <div className="p-3 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">현재 보드 페이지</p>
              <div className="space-y-1">
                {pages.map((page, idx) => (
                  <div
                    key={page.id}
                    className={`flex items-center gap-2 rounded-md p-1.5 cursor-pointer group transition-colors ${
                      idx === currentPageIndex ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => onSwitchPage(idx)}
                  >
                    <div className="w-16 h-10 bg-white border border-gray-200 rounded overflow-hidden shrink-0">
                      {page.thumbnail ? (
                        <img src={page.thumbnail} alt={`페이지 ${idx + 1}`} className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-300">빈 페이지</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{idx + 1}페이지</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); onDuplicatePage(idx) }}
                        className="text-gray-400 hover:text-blue-500 text-xs px-1"
                        title="복제"
                      >⊕</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeletePage(idx) }}
                        className="text-gray-400 hover:text-red-500 text-xs px-1"
                        title="삭제"
                      >✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Saved boards */}
          <div className="p-3">
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">저장된 보드</p>
            {boards.length === 0 ? (
              <p className="text-xs text-gray-400 italic">저장된 보드가 없습니다.</p>
            ) : (
              <div className="space-y-1">
                {boards.map((board) => (
                  <div
                    key={board.id}
                    className={`flex items-center gap-2 rounded-md p-2 cursor-pointer group transition-colors ${
                      board.id === currentBoard?.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => onLoadBoard(board)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{board.name}</p>
                      <p className="text-xs text-gray-400">{board.pages.length}페이지 · {new Date(board.updatedAt).toLocaleDateString('ko-KR')}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteBoard(board.id) }}
                      className="text-gray-300 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      title="보드 삭제"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
