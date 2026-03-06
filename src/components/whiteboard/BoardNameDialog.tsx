'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useWhiteboardStore } from '@/store/whiteboardStore'

interface Props {
  onConfirm: (name: string) => void
}

export default function BoardNameDialog({ onConfirm }: Props) {
  const { isBoardNameDialogOpen, toggleBoardNameDialog, boardName } = useWhiteboardStore()
  const [name, setName] = useState(boardName ?? '')

  function handleConfirm() {
    const trimmed = name.trim()
    if (!trimmed) return
    onConfirm(trimmed)
    toggleBoardNameDialog()
  }

  return (
    <Dialog open={isBoardNameDialogOpen} onOpenChange={toggleBoardNameDialog}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[#1E2D5E]">보드 저장</DialogTitle>
        </DialogHeader>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">보드 이름</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            placeholder="예: 생명보험수리학 3주차"
            autoFocus
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={toggleBoardNameDialog}>취소</Button>
          <Button onClick={handleConfirm} disabled={!name.trim()} className="bg-[#1E2D5E] hover:bg-[#162248]">
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
