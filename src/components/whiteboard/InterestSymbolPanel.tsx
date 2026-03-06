'use client'

import katex from 'katex'
import { useWhiteboardStore } from '@/store/whiteboardStore'

const SYMBOL_GROUPS: { title: string; items: { label: string; latex: string }[] }[] = [
  {
    title: '기본 이율',
    items: [
      { label: '이자율',         latex: 'i' },
      { label: '할인율',         latex: 'd' },
      { label: '현가율',         latex: 'v' },
      { label: '이력 (Force of interest)', latex: '\\delta' },
      { label: '명목 이자율 i^(m)',  latex: 'i^{(m)}' },
      { label: '명목 할인율 d^(m)',  latex: 'd^{(m)}' },
    ],
  },
  {
    title: '현가·종가 인수',
    items: [
      { label: '현가율 v^n',        latex: 'v^n' },
      { label: '종가율 (1+i)^n',    latex: '(1+i)^n' },
      { label: '현가율 (1+i)^{-n}', latex: '(1+i)^{-n}' },
      { label: '연속 복리 e^{nδ}',  latex: 'e^{n\\delta}' },
      { label: '연속 현가 e^{-nδ}', latex: 'e^{-n\\delta}' },
    ],
  },
  {
    title: '기말급 연금 (Immediate)',
    items: [
      { label: '기말급 연금 현가',        latex: 'a_{\\overline{n}|}' },
      { label: '기말급 연금 종가',        latex: 's_{\\overline{n}|}' },
      { label: '기말급 영구연금 현가',    latex: 'a_{\\overline{\\infty}|}' },
      { label: '기말급 연금 현가 (분기)', latex: 'a^{(m)}_{\\overline{n}|}' },
    ],
  },
  {
    title: '기시급 연금 (Due)',
    items: [
      { label: '기시급 연금 현가',        latex: '\\ddot{a}_{\\overline{n}|}' },
      { label: '기시급 연금 종가',        latex: '\\ddot{s}_{\\overline{n}|}' },
      { label: '기시급 영구연금 현가',    latex: '\\ddot{a}_{\\overline{\\infty}|}' },
      { label: '기시급 연금 현가 (분기)', latex: '\\ddot{a}^{(m)}_{\\overline{n}|}' },
    ],
  },
  {
    title: '연속 연금 (Continuous)',
    items: [
      { label: '연속 연금 현가', latex: '\\bar{a}_{\\overline{n}|}' },
      { label: '연속 연금 종가', latex: '\\bar{s}_{\\overline{n}|}' },
      { label: '연속 영구연금',  latex: '\\bar{a}_{\\overline{\\infty}|}' },
    ],
  },
  {
    title: '명목이율 세부',
    items: [
      { label: 'i^(2)',  latex: 'i^{(2)}' },
      { label: 'i^(4)',  latex: 'i^{(4)}' },
      { label: 'i^(12)', latex: 'i^{(12)}' },
      { label: 'd^(2)',  latex: 'd^{(2)}' },
      { label: 'd^(4)',  latex: 'd^{(4)}' },
      { label: 'd^(12)', latex: 'd^{(12)}' },
      { label: 'i^(m) 변환', latex: 'i^{(m)}=m\\left[(1+i)^{1/m}-1\\right]' },
      { label: 'd^(m) 변환', latex: 'd^{(m)}=m\\left[1-(1-d)^{1/m}\\right]' },
      { label: 'i↔d^(m)', latex: 'i^{(m)}=\\dfrac{d^{(m)}}{1-d^{(m)}/m}' },
    ],
  },
  {
    title: '시점별 적립 / 현가',
    items: [
      { label: 'A(0)', latex: 'A(0)' },
      { label: 'A(1)', latex: 'A(1)' },
      { label: 'A(t)', latex: 'A(t)' },
      { label: 'A(n)', latex: 'A(n)' },
      { label: 'a(0)', latex: 'a(0)' },
      { label: 'a(1)', latex: 'a(1)' },
      { label: 'a(t)', latex: 'a(t)' },
      { label: 'a(n)', latex: 'a(n)' },
    ],
  },
  {
    title: '주요 관계식',
    items: [
      { label: 'v = 1/(1+i)',  latex: 'v = \\dfrac{1}{1+i}' },
      { label: 'd = iv',       latex: 'd = iv' },
      { label: 'd = 1-v',      latex: 'd = 1-v' },
      { label: 'i = e^δ - 1',  latex: 'i = e^{\\delta}-1' },
      { label: 'a_n| 공식',    latex: 'a_{\\overline{n}|} = \\dfrac{1-v^n}{i}' },
      { label: 'ä_n| 공식',    latex: '\\ddot{a}_{\\overline{n}|} = \\dfrac{1-v^n}{d}' },
      { label: 'ä = a(1+i)',   latex: '\\ddot{a}_{\\overline{n}|} = a_{\\overline{n}|}(1+i)' },
    ],
  },
]

function renderKaTeX(latex: string): string {
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode: false })
  } catch {
    return latex
  }
}

export default function InterestSymbolPanel() {
  const { setTool, setPendingSymbolLatex, pendingSymbolLatex, tool } = useWhiteboardStore()

  function handleClick(latex: string) {
    if (pendingSymbolLatex === latex && tool === 'place-symbol') {
      // 이미 선택된 기호 다시 클릭 → 선택 해제
      setPendingSymbolLatex(null)
      setTool('pen')
    } else {
      // 즉시 선택 상태로 전환 (비동기 없음)
      setPendingSymbolLatex(latex)
      setTool('place-symbol')
    }
  }

  const isPlaceMode = tool === 'place-symbol'

  return (
    <div className="w-52 bg-white border-r border-gray-200 flex flex-col overflow-hidden shrink-0 select-none">
      {/* 헤더 */}
      <div className={`px-3 py-2 border-b border-gray-200 shrink-0 transition-colors ${isPlaceMode ? 'bg-blue-50 border-blue-200' : 'bg-[#1E2D5E]/5'}`}>
        <p className="text-xs font-bold text-[#1E2D5E] tracking-wide">이자론 기호</p>
        {isPlaceMode ? (
          <p className="text-[10px] text-blue-600 mt-0.5 font-medium">
            ▶ 캔버스를 클릭하여 배치 (ESC: 취소)
          </p>
        ) : (
          <p className="text-[10px] text-gray-400 mt-0.5">기호를 선택 후 캔버스 클릭</p>
        )}
      </div>

      {/* 기호 목록 */}
      <div className="flex-1 overflow-y-auto py-1">
        {SYMBOL_GROUPS.map((group) => (
          <div key={group.title} className="px-2 py-2 border-b border-gray-100 last:border-0">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
              {group.title}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {group.items.map((item) => {
                const isSelected = pendingSymbolLatex === item.latex && isPlaceMode
                return (
                  <button
                    key={item.latex}
                    onClick={() => handleClick(item.latex)}
                    title={item.label}
                    className={`
                      inline-flex items-center justify-center
                      min-w-[44px] px-2 py-1.5 rounded-md
                      border transition-all text-[13px] cursor-pointer
                      ${isSelected
                        ? 'border-blue-500 bg-blue-100 shadow-sm ring-1 ring-blue-400'
                        : 'border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50'}
                    `}
                  >
                    <span
                      dangerouslySetInnerHTML={{ __html: renderKaTeX(item.latex) }}
                      className="pointer-events-none"
                    />
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
