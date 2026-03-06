'use client'

import { useState } from 'react'
import katex from 'katex'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useWhiteboardStore } from '@/store/whiteboardStore'
import { renderLatexPreview, validateLatex } from '@/lib/canvas/katexHelpers'
import type { Canvas as FabricCanvas } from 'fabric'

function renderPreviewKatex(latex: string): string {
  try { return katex.renderToString(latex, { throwOnError: false, displayMode: false }) } catch { return latex }
}

const EXAMPLE_GROUPS = [
  {
    title: '기본 생명보험',
    items: [
      { label: 'A_x', latex: 'A_x' },
      { label: 'A_{x:n|}', latex: 'A_{x:\\overline{n}|}' },
      { label: 'A^1_{x:n|}', latex: 'A^{1}_{x:\\overline{n}|}' },
      { label: 'A^{\\;1}_{x:n|}', latex: 'A^{\\;1}_{x:\\overline{n}|}' },
      { label: 'nEx', latex: '{}_{n}E_{x}' },
      { label: '₁₀₀₀A_x', latex: '1000\\,A_x' },
      { label: 'A_x 급수', latex: 'A_x = \\sum_{k=0}^{\\infty} v^{k+1}\\,{}_{k}p_{x}\\,q_{x+k}' },
    ],
  },
  {
    title: '연금 현가',
    items: [
      { label: 'ä_x', latex: '\\ddot{a}_x' },
      { label: 'a_x', latex: 'a_x' },
      { label: 'ä_{x:n|}', latex: '\\ddot{a}_{x:\\overline{n}|}' },
      { label: 'a_{x:n|}', latex: 'a_{x:\\overline{n}|}' },
      { label: 'ä_x 급수', latex: '\\ddot{a}_x = \\sum_{k=0}^{\\infty} v^{k}\\,{}_{k}p_{x}' },
      { label: 'A=1-dä', latex: 'A_x = 1 - d\\,\\ddot{a}_x' },
      { label: 'ä=（1-A)/d', latex: '\\ddot{a}_x = \\dfrac{1-A_x}{d}' },
    ],
  },
  {
    title: '현가·종가 함수',
    items: [
      { label: 'a_{n|}', latex: 'a_{\\overline{n}|}' },
      { label: 's_{n|}', latex: 's_{\\overline{n}|}' },
      { label: 'ä_{n|}', latex: '\\ddot{a}_{\\overline{n}|}' },
      { label: 's̈_{n|}', latex: '\\ddot{s}_{\\overline{n}|}' },
      { label: 'a^(m)_{n|}', latex: 'a^{(m)}_{\\overline{n}|}' },
      { label: 'ä^(m)_{n|}', latex: '\\ddot{a}^{(m)}_{\\overline{n}|}' },
      { label: 'ā_{n|}', latex: '\\bar{a}_{\\overline{n}|}' },
      { label: 'a_n|公式', latex: 'a_{\\overline{n}|} = \\dfrac{1-v^n}{i}' },
      { label: 's_n|公式', latex: 's_{\\overline{n}|} = \\dfrac{(1+i)^n-1}{i}' },
      { label: 'ä_n|公式', latex: '\\ddot{a}_{\\overline{n}|} = \\dfrac{1-v^n}{d}' },
    ],
  },
  {
    title: '생존·사망 확률',
    items: [
      { label: 'npx', latex: '{}_{n}p_{x}' },
      { label: 'tqx', latex: '{}_{t}q_{x}' },
      { label: 'nqx', latex: '{}_{n}q_{x}' },
      { label: 'n|qx', latex: '{}_{n|}q_{x}' },
      { label: 'μ_x', latex: '\\mu_x' },
      { label: 'tpx·μ', latex: '{}_{t}p_{x}\\,\\mu_{x+t}' },
      { label: 'npx급수', latex: '{}_{n}p_{x} = \\exp\\!\\left(-\\int_{0}^{n}\\mu_{x+t}\\,dt\\right)' },
    ],
  },
  {
    title: '순보험료·책임준비금',
    items: [
      { label: 'P(A_x)', latex: 'P(A_x) = \\dfrac{A_x}{\\ddot{a}_x}' },
      { label: 'P_{x:n|}', latex: 'P_{x:\\overline{n}|}' },
      { label: 'V_t', latex: '{}_{t}V' },
      { label: 'tVx', latex: '{}_{t}V_x' },
      { label: 'tV 공식', latex: '{}_{t}V_x = A_{x+t} - P_x\\,\\ddot{a}_{x+t}' },
      { label: 'Var[Z]', latex: '\\mathrm{Var}[Z] = {}^{2}A_x - (A_x)^2' },
    ],
  },
  {
    title: '복잡한 수식',
    items: [
      { label: 'EPV 급수', latex: 'EPV = \\sum_{k=0}^{n-1} b_{k+1}\\,v^{k+1}\\,{}_{k}p_x\\,q_{x+k}' },
      { label: 'Woolhouse', latex: 'a^{(m)}_x \\approx \\ddot{a}_x - \\dfrac{m-1}{2m} - \\dfrac{m^2-1}{12m^2}(\\delta+\\mu_x)' },
      { label: 'ODE', latex: '\\dfrac{d}{dt}{}_{t}V = \\delta\\,{}_{t}V + P - \\mu_{x+t}(b_t - {}_{t}V)' },
      { label: 'ILT μ_x', latex: '\\mu_x = \\dfrac{f_T(t)}{{}_{t}p_x}' },
    ],
  },
]

interface Props {
  getCanvas: () => FabricCanvas | null
}

export default function KaTeXInputModal({ getCanvas: _ }: Props) {
  const { isKaTeXModalOpen, toggleKaTeXModal, setTool, setPendingSymbolLatex } = useWhiteboardStore()
  const [latex, setLatex] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [activeGroup, setActiveGroup] = useState(0)

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
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-[#1E2D5E]">KaTeX 수식 삽입</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 overflow-y-auto flex-1 min-h-0">
          {/* 그룹 탭 */}
          <div className="shrink-0">
            <label className="text-xs font-medium text-gray-600 block mb-1">예제 수식</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {EXAMPLE_GROUPS.map((g, i) => (
                <button
                  key={g.title}
                  onClick={() => setActiveGroup(i)}
                  className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                    activeGroup === i
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                      : 'border-gray-200 text-gray-500 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  {g.title}
                </button>
              ))}
            </div>

            {/* 선택된 그룹의 예제 버튼 */}
            <div className="flex flex-wrap gap-1.5 border border-gray-100 rounded-md p-2 bg-gray-50 min-h-[56px]">
              {EXAMPLE_GROUPS[activeGroup].items.map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => handleLatexChange(ex.latex)}
                  title={ex.latex}
                  className={`inline-flex items-center px-2 py-1 rounded border text-[12px] transition-colors bg-white hover:border-blue-400 hover:bg-blue-50 ${
                    latex === ex.latex ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <span dangerouslySetInnerHTML={{ __html: renderPreviewKatex(ex.latex) }} />
                </button>
              ))}
            </div>
          </div>

          {/* LaTeX 직접 입력 */}
          <div className="shrink-0">
            <label className="text-xs font-medium text-gray-600 block mb-1">LaTeX 직접 입력</label>
            <textarea
              value={latex}
              onChange={(e) => handleLatexChange(e.target.value)}
              placeholder="예: A_x = \sum_{k=0}^{\infty} v^{k+1}\,{}_kp_x\,q_{x+k}"
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              rows={2}
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          {/* 미리보기 */}
          {preview && (
            <div className="shrink-0">
              <label className="text-xs font-medium text-gray-600 block mb-1">미리보기</label>
              <div
                className="border border-gray-200 rounded bg-white p-3 min-h-[56px] overflow-x-auto flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: preview }}
              />
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 pt-2">
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
