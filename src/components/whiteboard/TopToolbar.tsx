'use client'

import { useState } from 'react'
import { useWhiteboardStore } from '@/store/whiteboardStore'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Slider } from '@/components/ui/slider'
import type { Canvas as FabricCanvas } from 'fabric'
import { exportCurrentPageAsPNG } from '@/lib/canvas/exportUtils'

interface TopToolbarProps {
  onUndo: () => void
  onSave: () => void
  onStrokeEnd: () => void
  getCanvas: () => FabricCanvas | null
  isSymbolPanelOpen: boolean
  onToggleSymbolPanel: () => void
}

const COLORS = [
  { key: 'black' as const, hex: '#1A1A1A', label: '검정 (B)', shortcut: 'B' },
  { key: 'red' as const, hex: '#DC2626', label: '빨강 (R)', shortcut: 'R' },
  { key: 'blue' as const, hex: '#2563EB', label: '파랑 (U)', shortcut: 'U' },
]

const WIDTHS = [2, 4, 8]

export default function TopToolbar({ onUndo, onSave, onStrokeEnd, getCanvas, isSymbolPanelOpen, onToggleSymbolPanel }: TopToolbarProps) {
  const [showClearMenu, setShowClearMenu] = useState(false)
  const {
    tool, setTool, color, setColor, strokeWidth, setStrokeWidth,
    eraserWidth, setEraserWidth,
    toggleTimelineModal, toggleKaTeXModal, toggleCalculator,
    boardName, savedAt,
    numberLineStart, numberLineEnd, setNumberLineStart, setNumberLineEnd,
  } = useWhiteboardStore()

  const saveTime = savedAt ? new Date(savedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : null

  function handleExportPNG() {
    const canvas = getCanvas()
    if (!canvas) return
    exportCurrentPageAsPNG(canvas, boardName ?? '화이트보드', useWhiteboardStore.getState().currentPageIndex)
  }

  function handleClearAll() {
    const canvas = getCanvas()
    if (!canvas) return
    canvas.clear()
    canvas.backgroundColor = '#ffffff'
    canvas.requestRenderAll()
    setShowClearMenu(false)
    onStrokeEnd()
  }

  function handleClearPathsOnly() {
    const canvas = getCanvas()
    if (!canvas) return
    // 최상위 path 타입만 제거 (자유 필기) — SVG 그룹·이미지·텍스트는 유지
    const paths = canvas.getObjects('path')
    if (paths.length > 0) {
      canvas.remove(...paths)
      canvas.requestRenderAll()
      onStrokeEnd()
    }
    setShowClearMenu(false)
  }

  return (
    <div className="h-12 flex items-center gap-1 px-3 border-b border-gray-200 bg-white/95 backdrop-blur-sm z-10 flex-shrink-0">
      {/* 이자론 기호 패널 토글 */}
      <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isSymbolPanelOpen ? 'default' : 'ghost'}
              size="sm"
              onClick={onToggleSymbolPanel}
              className="h-8 px-2 text-xs font-bold text-[#1E2D5E]"
            >
              𝑖 기호
            </Button>
          </TooltipTrigger>
          <TooltipContent>이자론 기호 패널 열기/닫기</TooltipContent>
        </Tooltip>
      </div>

      {/* 선택 도구 */}
      <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={tool === 'select' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTool(tool === 'select' ? 'pen' : 'select')}
              className="h-8 px-2 text-xs"
            >
              ↖ 선택 (S)
            </Button>
          </TooltipTrigger>
          <TooltipContent>개체 선택·이동·크기 조절 — S</TooltipContent>
        </Tooltip>
      </div>

      {/* 펜 색상 */}
      <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
        {COLORS.map((c) => (
          <Tooltip key={c.key}>
            <TooltipTrigger asChild>
              <button
                onClick={() => { setColor(c.key); setTool('pen') }}
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  color === c.key && tool === 'pen'
                    ? 'border-blue-500 scale-110 shadow-md'
                    : 'border-gray-300 hover:scale-105'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            </TooltipTrigger>
            <TooltipContent>{c.label}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      {/* 펜 굵기 */}
      <div className="flex items-center gap-2 px-2 border-r border-gray-200 w-28">
        <span className="text-xs text-gray-500 shrink-0">굵기</span>
        <Slider
          value={[strokeWidth]}
          min={1}
          max={20}
          step={1}
          onValueChange={([v]) => setStrokeWidth(v)}
          className="w-full"
        />
      </div>

      {/* 지우개 */}
      <div className="flex items-center gap-1 px-2 border-r border-gray-200">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={tool === 'eraser' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTool('eraser')}
              className="h-8 px-2 text-xs"
            >
              지우개 (E)
            </Button>
          </TooltipTrigger>
          <TooltipContent>지우개 — freehand 획만 지움</TooltipContent>
        </Tooltip>
        {/* 지우개 크기 슬라이더 — 지우개 모드일 때만 강조 */}
        <div className={`flex items-center gap-1.5 transition-opacity ${tool === 'eraser' ? 'opacity-100' : 'opacity-40'}`}>
          <span className="text-xs text-gray-500 shrink-0">크기</span>
          <Slider
            value={[eraserWidth]}
            min={5}
            max={80}
            step={1}
            disabled={tool !== 'eraser'}
            onValueChange={([v]) => setEraserWidth(v)}
            className="w-20"
          />
          <span className="text-xs text-gray-400 w-6 text-right">{eraserWidth}</span>
        </div>
        <div className="relative">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowClearMenu(v => !v)}
                className="h-8 px-2 text-xs text-red-600 hover:text-red-700"
              >
                전체 지우기 ▾
              </Button>
            </TooltipTrigger>
            <TooltipContent>현재 페이지 초기화 옵션</TooltipContent>
          </Tooltip>
          {showClearMenu && (
            <>
              {/* 배경 오버레이 — 클릭하면 메뉴 닫힘 */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowClearMenu(false)}
              />
              <div className="absolute left-0 top-9 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]">
                <button
                  onClick={handleClearAll}
                  className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 font-medium"
                >
                  모두 지우기
                </button>
                <button
                  onClick={handleClearPathsOnly}
                  className="w-full text-left px-4 py-2 text-xs text-orange-600 hover:bg-orange-50 font-medium"
                >
                  필기만 지우기
                  <span className="block text-[10px] text-gray-400 font-normal">개체·수식 유지</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 실행취소 */}
      <div className="flex items-center gap-1 px-2 border-r border-gray-200">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={onUndo} className="h-8 px-2 text-xs">
              ↩ 실행취소
            </Button>
          </TooltipTrigger>
          <TooltipContent>Ctrl+Z</TooltipContent>
        </Tooltip>
      </div>

      {/* 보험수리 도구 — 타임라인 모달 + KaTeX */}
      <div className="flex items-center gap-1 px-2 border-r border-gray-200">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={toggleTimelineModal} className="h-8 px-2 text-xs font-medium text-[#1E2D5E]">
              타임라인 (T)
            </Button>
          </TooltipTrigger>
          <TooltipContent>보험수리 타임라인 다이어그램 삽입</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={toggleKaTeXModal} className="h-8 px-2 text-xs font-medium text-[#1E2D5E]">
              수식 KaTeX (K)
            </Button>
          </TooltipTrigger>
          <TooltipContent>LaTeX 수식 삽입</TooltipContent>
        </Tooltip>
      </div>

      {/* 자동 화살표·숫자선 그리기 */}
      <div className="flex items-center gap-1 px-2 border-r border-gray-200">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={tool === 'arrow-line' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTool(tool === 'arrow-line' ? 'pen' : 'arrow-line')}
              className="h-8 px-2 text-xs font-medium"
            >
              → 화살표
            </Button>
          </TooltipTrigger>
          <TooltipContent>캔버스 클릭 위치에 수평 화살표 배치</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={tool === 'time-line' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTool(tool === 'time-line' ? 'pen' : 'time-line')}
              className="h-8 px-2 text-xs font-medium"
            >
              시간선
            </Button>
          </TooltipTrigger>
          <TooltipContent>클릭 위치에 시간 눈금 타임라인 배치</TooltipContent>
        </Tooltip>
        {/* 시작/끝 입력 — time-line 모드일 때만 강조 */}
        <div className={`flex items-center gap-1 transition-opacity ${tool === 'time-line' ? 'opacity-100' : 'opacity-40'}`}>
          <span className="text-xs text-gray-500">시작</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <input
                value={numberLineStart}
                onChange={(e) => setNumberLineStart(e.target.value)}
                disabled={tool !== 'time-line'}
                className="w-10 h-7 border border-gray-300 rounded px-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
                placeholder="0"
              />
            </TooltipTrigger>
            <TooltipContent>시작값 (숫자 또는 - 로 -∞)</TooltipContent>
          </Tooltip>
          <span className="text-xs text-gray-400">~</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <input
                value={numberLineEnd}
                onChange={(e) => setNumberLineEnd(e.target.value)}
                disabled={tool !== 'time-line'}
                className="w-10 h-7 border border-gray-300 rounded px-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
                placeholder="10"
              />
            </TooltipTrigger>
            <TooltipContent>끝값 (숫자, n, 또는 - 로 ∞)</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* 필기 인식 */}
      <div className="flex items-center gap-1 px-2 border-r border-gray-200">
        {tool === 'recognize' ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTool('pen')}
                className="h-8 px-2 text-xs text-red-600 border-red-300 hover:bg-red-50"
              >
                취소 (Esc)
              </Button>
            </TooltipTrigger>
            <TooltipContent>인식 모드 취소 → 펜으로 복귀</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTool('recognize')}
                className="h-8 px-2 text-xs font-medium text-purple-700 hover:text-purple-800"
              >
                인식 변환
              </Button>
            </TooltipTrigger>
            <TooltipContent>박스를 드래그하여 필기를 텍스트로 변환</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* 계산기 */}
      <div className="flex items-center gap-1 px-2 border-r border-gray-200">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={toggleCalculator} className="h-8 px-2 text-xs">
              계산기 (C)
            </Button>
          </TooltipTrigger>
          <TooltipContent>공학용 계산기 팝업</TooltipContent>
        </Tooltip>
      </div>

      {/* 저장 / PNG */}
      <div className="flex items-center gap-1 px-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={onSave} className="h-8 px-2 text-xs">
              저장 (Ctrl+S)
            </Button>
          </TooltipTrigger>
          <TooltipContent>로컬 IndexedDB 저장</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={handleExportPNG} className="h-8 px-2 text-xs">
              PNG 내보내기
            </Button>
          </TooltipTrigger>
          <TooltipContent>현재 페이지를 PNG로 다운로드</TooltipContent>
        </Tooltip>
      </div>

      {/* 저장 상태 */}
      <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
        {boardName && <span className="font-medium text-gray-600">{boardName}</span>}
        {saveTime && <span>저장됨 · {saveTime}</span>}
      </div>
    </div>
  )
}
