'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useWhiteboardStore } from '@/store/whiteboardStore'
import { renderLatexPreview, validateLatex } from '@/lib/canvas/katexHelpers'
import type { Canvas as FabricCanvas } from 'fabric'

const EXAMPLES = [
  { label: 'A_x', latex: 'A_x' },
  { label: 'ä_x', latex: '\\ddot{a}_x' },
  { label: 'nEx', latex: '{}_nE_x' },
  { label: 'npx', latex: '{}_np_x' },
  { label: 'tqx', latex: '{}_tq_x' },
  { label: 'APV', latex: 'A_x = \\sum_{k=0}^{\\infty} v^{k+1} \\cdot {}_kp_x \\cdot q_{x+k}' },
]

interface Props {
  getCanvas: () => FabricCanvas | null
}

export default function KaTeXInputModal({ getCanvas: _ }: Props) {
  const { isKaTeXModalOpen, toggleKaTeXModal, setTool, setPendingSymbolLatex } = useWhiteboardStore()
  const [latex, setLatex] = useState('')
  const [error, setError] = useState<string | null>(null)
  function handleLatexChange(val: string) {
    setLatex(val)
    setError(validateLatex(val))
  }

  function handleInsert() {
    if (!latex.trim() || error) return
    setPendingSymbolLatex(latex.trim())
    setTool('place-symbol')
    toggleKaTeXModal()
    setLatex('')
  }

  const preview = latex ? renderLatexPreview(latex) : ''

  return (
    <Dialog open={isKaTeXModalOpen} onOpenChange={toggleKaTeXModal}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#1E2D5E]">KaTeX 수식 삽입</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick examples */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">빠른 삽입</label>
            <div className="flex flex-wrap gap-1">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => handleLatexChange(ex.latex)}
                  className="text-xs border border-gray-200 rounded px-2 py-1 hover:border-blue-400 hover:bg-blue-50 font-mono"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          {/* LaTeX input */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">LaTeX 입력</label>
            <textarea
              value={latex}
              onChange={(e) => handleLatexChange(e.target.value)}
              placeholder="예: A_x = \sum_{k=0}^{\infty} v^{k+1} {}_kp_x q_{x+k}"
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              rows={3}
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          {/* Preview */}
          {preview && (
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">미리보기</label>
              <div
                className="border border-gray-200 rounded bg-white p-3 min-h-[60px] overflow-x-auto flex items-center justify-center katex-preview"
                dangerouslySetInnerHTML={{ __html: preview }}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={toggleKaTeXModal}>취소</Button>
          <Button
            onClick={handleInsert}
            disabled={!latex.trim() || !!error}
            className="bg-[#1E2D5E] hover:bg-[#162248]"
          >
            배치 모드로
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
