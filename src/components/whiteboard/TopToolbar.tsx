'use client'

import { useState, useRef, useEffect } from 'react'
import { useWhiteboardStore } from '@/store/whiteboardStore'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Slider } from '@/components/ui/slider'
import type { Canvas as FabricCanvas } from 'fabric'
import { exportCurrentPageAsPNG } from '@/lib/canvas/exportUtils'

interface TopToolbarProps {
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onSave: () => void
  onStrokeEnd: () => void
  getCanvas: () => FabricCanvas | null
  isSymbolPanelOpen: boolean
  onToggleSymbolPanel: () => void
  onNewBoard: () => void
  onOpenBoards: () => void
  onRenameBoard: () => void
  isPointerDiagOpen: boolean
  onTogglePointerDiag: () => void
}

const COLORS = [
  { key: 'black' as const, hex: '#1A1A1A', label: '검정 (B)', shortcut: 'B' },
  { key: 'red' as const, hex: '#DC2626', label: '빨강 (R)', shortcut: 'R' },
  { key: 'blue' as const, hex: '#2563EB', label: '파랑 (U)', shortcut: 'U' },
]

const WIDTHS = [2, 4, 8]

export default function TopToolbar({ onUndo, onRedo, canUndo, canRedo, onSave, onStrokeEnd, getCanvas, isSymbolPanelOpen, onToggleSymbolPanel, onNewBoard, onOpenBoards, onRenameBoard, isPointerDiagOpen, onTogglePointerDiag }: TopToolbarProps) {
  const [showClearMenu, setShowClearMenu] = useState(false)
  const [clearMenuPos, setClearMenuPos] = useState<{ top: number; left: number } | null>(null)
  const clearBtnRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  function checkScroll() {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1)
  }

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', checkScroll)
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', checkScroll); ro.disconnect() }
  }, [])


  const {
    tool, setTool, color, setColor, strokeWidth, setStrokeWidth,
    eraserWidth, setEraserWidth,
    toggleTimelineModal, toggleKaTeXModal, toggleCalculator, toggleJS40B,
    boardName, savedAt, zoom, setZoom,
    numberLineStart, numberLineEnd, setNumberLineStart, setNumberLineEnd,
    allowMouse, setAllowMouse, allowPen, setAllowPen, allowTouch, setAllowTouch,
    recognizeMode, setRecognizeMode, isRecognitionEnabled, setIsRecognitionEnabled,
    clipboardJSON, setClipboardJSON,
  } = useWhiteboardStore()

  function handleCopy() {
    const canvas = getCanvas()
    if (!canvas) return
    const active = canvas.getActiveObjects()
    if (active.length === 0) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serialized = active.map((obj) => (obj as any).toObject())
    setClipboardJSON(JSON.stringify(serialized))
    setTool('paste')
  }

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
    <div className="flex items-stretch border-b border-gray-200 bg-white/95 backdrop-blur-sm z-10 flex-shrink-0 relative min-h-[48px]">
      {/* 왼쪽 스크롤 화살표 */}
      {canScrollLeft && (
        <button
          onClick={() => scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
          className="flex-shrink-0 w-7 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 border-r border-gray-200 text-lg font-bold z-10"
        >‹</button>
      )}
      <div
        ref={scrollRef}
        className="flex items-center gap-1 px-3 overflow-x-auto flex-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >
        {/* 이자론 기호 패널 토글 */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isSymbolPanelOpen ? 'default' : 'ghost'}
                size="sm"
                onClick={onToggleSymbolPanel}
                className={`h-8 px-2 text-xs font-bold ${isSymbolPanelOpen ? '' : 'text-[#1E2D5E]'}`}
              >
                𝑖 기호
              </Button>
            </TooltipTrigger>
            <TooltipContent>이자론 기호 패널 열기/닫기</TooltipContent>
          </Tooltip>
        </div>

        {/* 선택 도구 + 복사 */}
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
          {tool === 'paste' ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTool('select')}
                  className="h-8 px-2 text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
                >
                  붙여넣기 취소
                </Button>
              </TooltipTrigger>
              <TooltipContent>붙여넣기 모드 취소 (Esc)</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  disabled={tool !== 'select'}
                  className={`h-8 px-2 text-xs ${clipboardJSON ? 'text-blue-600' : ''}`}
                >
                  복사
                </Button>
              </TooltipTrigger>
              <TooltipContent>선택한 개체 복사 후 클릭 위치에 붙여넣기</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* 펜 — 두 줄: 색상 / 굵기 */}
        <div className="flex flex-col justify-center gap-1 px-2 border-r border-gray-200 py-1">
          {/* 1행: 색상 선택 */}
          <div className="flex items-center gap-1">
            {COLORS.map((c) => (
              <Tooltip key={c.key}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => { setColor(c.key); setTool('pen') }}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${color === c.key && tool === 'pen'
                        ? 'border-blue-500 scale-110 shadow-md'
                        : 'border-gray-300 hover:scale-105'
                      }`}
                    style={{ backgroundColor: c.hex }}
                  />
                </TooltipTrigger>
                <TooltipContent>{c.label}</TooltipContent>
              </Tooltip>
            ))}
            <span className="text-[10px] text-gray-400 pl-1">펜</span>
          </div>
          {/* 2행: 굵기 슬라이더 */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-500 shrink-0">굵기</span>
            <Slider
              value={[strokeWidth]}
              min={1}
              max={20}
              step={1}
              onValueChange={([v]) => setStrokeWidth(v)}
              className="w-20"
            />
            <span className="text-[10px] text-gray-400 w-4">{strokeWidth}</span>
          </div>
        </div>

        {/* 입력 허용 체크박스 + 진단 버튼 — 두 줄 */}
        <div className="flex flex-col justify-center gap-0.5 px-3 border-r border-gray-200 py-1">
          {/* 1행: 마우스, 펜 */}
          <div className="flex items-center gap-2">
            {([
              { label: '마우스', checked: allowMouse, onChange: setAllowMouse },
              { label: '펜', checked: allowPen, onChange: setAllowPen },
            ] as const).map(({ label, checked, onChange }) => (
              <label key={label} className="flex items-center gap-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => onChange(e.target.checked)}
                  className="w-3 h-3 accent-blue-600 cursor-pointer flex-shrink-0"
                />
                <span className={`text-[11px] whitespace-nowrap ${checked ? 'text-gray-700' : 'text-gray-400 line-through'}`}>
                  {label}
                </span>
              </label>
            ))}
          </div>
          {/* 2행: 손, 진단 */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allowTouch}
                onChange={(e) => setAllowTouch(e.target.checked)}
                className="w-3 h-3 accent-blue-600 cursor-pointer flex-shrink-0"
              />
              <span className={`text-[11px] whitespace-nowrap ${allowTouch ? 'text-gray-700' : 'text-gray-400 line-through'}`}>
                손
              </span>
            </label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onTogglePointerDiag}
                  className={`h-4 px-1.5 rounded text-[9px] font-medium border transition-colors ${isPointerDiagOpen
                      ? 'bg-yellow-100 border-yellow-400 text-yellow-700'
                      : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-400'
                    }`}
                >
                  진단
                </button>
              </TooltipTrigger>
              <TooltipContent>포인터 압력/기울기 실시간 진단 패널</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* 지우개 — 두 줄: 버튼+전체지우기 / 크기 */}
        <div className="flex flex-col justify-center gap-1 px-2 border-r border-gray-200 py-1">
          {/* 1행: 지우개 버튼 + 전체 지우기 */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={tool === 'eraser' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTool('eraser')}
                  className="h-6 px-2 text-xs"
                >
                  지우개 (E)
                </Button>
              </TooltipTrigger>
              <TooltipContent>지우개 — freehand 획만 지움</TooltipContent>
            </Tooltip>
            <div ref={clearBtnRef}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (!showClearMenu) {
                        const rect = clearBtnRef.current?.getBoundingClientRect()
                        if (rect) setClearMenuPos({ top: rect.bottom + 2, left: rect.left })
                      }
                      setShowClearMenu(v => !v)
                    }}
                    className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                  >
                    전체 지우기 ▾
                  </Button>
                </TooltipTrigger>
                <TooltipContent>현재 페이지 초기화 옵션</TooltipContent>
              </Tooltip>
              {showClearMenu && clearMenuPos && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowClearMenu(false)} />
                  <div
                    className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]"
                    style={{ top: clearMenuPos.top, left: clearMenuPos.left }}
                  >
                    <button onClick={handleClearAll} className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 font-medium">
                      모두 지우기
                    </button>
                    <button onClick={handleClearPathsOnly} className="w-full text-left px-4 py-2 text-xs text-orange-600 hover:bg-orange-50 font-medium">
                      필기만 지우기
                      <span className="block text-[10px] text-gray-400 font-normal">개체·수식 유지</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>{/* end 1행 */}
          {/* 2행: 지우개 크기 슬라이더 */}
          <div className={`flex items-center gap-1.5 transition-opacity ${tool === 'eraser' ? 'opacity-100' : 'opacity-40'}`}>
            <span className="text-[10px] text-gray-500 shrink-0">크기</span>
            <Slider
              value={[eraserWidth]}
              min={5}
              max={80}
              step={1}
              disabled={tool !== 'eraser'}
              onValueChange={([v]) => setEraserWidth(v)}
              className="w-20"
            />
            <span className="text-[10px] text-gray-400 w-5 text-right">{eraserWidth}</span>
          </div>
        </div>{/* end 지우개 2행 섹션 */}

        {/* 뒤로 / 앞으로 */}
        <div className="flex items-center gap-1 px-2 border-r border-gray-200">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onUndo} disabled={!canUndo} className="h-8 px-2 text-xs disabled:opacity-30">
                ↩ 뒤로
              </Button>
            </TooltipTrigger>
            <TooltipContent>뒤로 (Ctrl+Z)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onRedo} disabled={!canRedo} className="h-8 px-2 text-xs disabled:opacity-30">
                앞으로 ↪
              </Button>
            </TooltipTrigger>
            <TooltipContent>앞으로 (Ctrl+Y / Ctrl+Shift+Z)</TooltipContent>
          </Tooltip>
        </div>

        {/* 보험수리 도구 — 타임라인 + KaTeX, 두 줄 */}
        <div className="flex flex-col justify-center gap-0.5 px-2 border-r border-gray-200 py-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={toggleTimelineModal} className="h-6 px-2 text-xs font-medium text-[#1E2D5E] w-full">
                타임라인 (T)
              </Button>
            </TooltipTrigger>
            <TooltipContent>보험수리 타임라인 다이어그램 삽입</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={toggleKaTeXModal} className="h-6 px-2 text-xs font-medium text-[#1E2D5E] w-full">
                수식 KaTeX (K)
              </Button>
            </TooltipTrigger>
            <TooltipContent>LaTeX 수식 삽입</TooltipContent>
          </Tooltip>
        </div>

        {/* 자동 화살표·시간선 그리기 — 두 줄 레이아웃 */}
        <div className="flex flex-col justify-center gap-0.5 px-2 border-r border-gray-200 py-1">
          {/* 1행: 버튼 */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={tool === 'arrow-line' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTool(tool === 'arrow-line' ? 'pen' : 'arrow-line')}
                  className="h-6 px-2 text-xs font-medium"
                >
                  → 화살표
                </Button>
              </TooltipTrigger>
              <TooltipContent>드래그로 수평 화살표 길이 결정</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={tool === 'time-line' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTool(tool === 'time-line' ? 'pen' : 'time-line')}
                  className="h-6 px-2 text-xs font-medium"
                >
                  시간선
                </Button>
              </TooltipTrigger>
              <TooltipContent>클릭 위치에 시간 눈금 타임라인 배치</TooltipContent>
            </Tooltip>
          </div>
          {/* 2행: 시작/끝 입력 */}
          <div className={`flex items-center gap-1 transition-opacity ${tool === 'time-line' ? 'opacity-100' : 'opacity-40'}`}>
            <span className="text-xs text-gray-500">시작</span>
            <input
              value={numberLineStart}
              onChange={(e) => setNumberLineStart(e.target.value)}
              disabled={tool !== 'time-line'}
              className="w-9 h-5 border border-gray-300 rounded px-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
              placeholder="0"
            />
            <span className="text-xs text-gray-400">~</span>
            <input
              value={numberLineEnd}
              onChange={(e) => setNumberLineEnd(e.target.value)}
              disabled={tool !== 'time-line'}
              className="w-9 h-5 border border-gray-300 rounded px-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
              placeholder="10"
            />
          </div>
        </div>

        {/* 계산기 — 시간선 우측, 두 줄 */}
        <div className="flex flex-col justify-center gap-0.5 px-2 border-r border-gray-200 py-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={toggleCalculator} className="h-6 px-2 text-xs w-full">
                계산기 (C)
              </Button>
            </TooltipTrigger>
            <TooltipContent>공학용 계산기 팝업</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={toggleJS40B} className="h-6 px-2 text-xs w-full">
                JS-40B
              </Button>
            </TooltipTrigger>
            <TooltipContent>CASIO JS-40B 계산기 팝업</TooltipContent>
          </Tooltip>
        </div>

        {/* 필기 인식 */}
        <div className="flex flex-col justify-center gap-0.5 px-2 border-r border-gray-200 py-1 min-w-[120px]">
          {/* 0행: 기능 On/Off 토글 */}
          <div className="flex items-center justify-between mb-0.5 px-1">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecognitionEnabled}
                onChange={(e) => {
                  const enabled = e.target.checked
                  setIsRecognitionEnabled(enabled)
                  // 만약 기능을 끄는데 현재 툴이 recognize라면 펜으로 돌아가기
                  if (!enabled && tool === 'recognize') {
                    setTool('pen')
                  }
                }}
                className="w-3 h-3 accent-purple-600 cursor-pointer flex-shrink-0"
              />
              <span className="text-[10px] whitespace-nowrap text-purple-700 font-medium">필기 인식 옵션</span>
            </label>
          </div>

          {isRecognitionEnabled ? (
            <>
              {/* 1행: 인식 변환 버튼 */}
              <div className="flex items-center gap-1">
                {tool === 'recognize' ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTool('pen')}
                        className="h-6 px-2 text-xs text-red-600 border-red-300 hover:bg-red-50 w-full"
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
                        className="h-6 px-2 text-xs font-medium text-purple-700 hover:text-purple-800 w-full"
                      >
                        텍스트 변환
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>박스를 드래그하여 필기를 텍스트로 변환</TooltipContent>
                  </Tooltip>
                )}
              </div>
              {/* 2행: 수식 / 텍스트 모드 선택 */}
              <div className="flex items-center justify-center gap-0.5 w-full">
                <button
                  onClick={() => setRecognizeMode('formula')}
                  className={`flex-1 h-5 rounded text-[10px] border transition-colors ${recognizeMode === 'formula'
                      ? 'bg-purple-100 border-purple-400 text-purple-700 font-medium'
                      : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300'
                    }`}
                >
                  수식
                </button>
                <button
                  onClick={() => setRecognizeMode('text')}
                  className={`flex-1 h-5 rounded text-[10px] border transition-colors ${recognizeMode === 'text'
                      ? 'bg-purple-100 border-purple-400 text-purple-700 font-medium'
                      : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300'
                    }`}
                >
                  일반
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <span className="text-[10px] text-gray-400 italic">옵션 꺼짐</span>
            </div>
          )}
        </div>


        {/* 확대/축소 */}
        <div className="flex flex-col justify-center gap-1 px-2 border-r border-gray-200 py-1">
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="sm" onClick={() => setZoom(Math.max(0.2, Math.round((zoom - 0.1) * 10) / 10))} className="h-6 w-6 p-0 text-sm font-bold">−</Button>
            <button onClick={() => setZoom(1)} className="text-xs text-gray-600 min-w-[38px] text-center hover:text-blue-600 transition-colors tabular-nums">
              {Math.round(zoom * 100)}%
            </button>
            <Button variant="ghost" size="sm" onClick={() => setZoom(Math.min(3, Math.round((zoom + 0.1) * 10) / 10))} className="h-6 w-6 p-0 text-sm font-bold">+</Button>
          </div>
          <div className="flex justify-center">
            <span className="text-[10px] text-gray-400">확대/축소</span>
          </div>
        </div>

        {/* 보드 관리 — 두 줄: 새보드·불러오기 / 저장·PNG */}
        <div className="flex flex-col justify-center gap-1 px-2 border-r border-gray-200 py-1">
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={onNewBoard} className="h-6 px-2 text-xs">
                  새 보드
                </Button>
              </TooltipTrigger>
              <TooltipContent>새 빈 보드 생성 (Ctrl+N)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={onOpenBoards} className="h-6 px-2 text-xs font-medium text-[#1E2D5E]">
                  불러오기
                </Button>
              </TooltipTrigger>
              <TooltipContent>저장된 보드 열기</TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={onSave} className="h-6 px-2 text-xs font-medium text-[#1E2D5E]">
                  저장
                </Button>
              </TooltipTrigger>
              <TooltipContent>현재 보드를 로컬에 저장 (Ctrl+S)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleExportPNG} className="h-6 px-2 text-xs">
                  PNG 내보내기
                </Button>
              </TooltipTrigger>
              <TooltipContent>현재 페이지를 PNG로 다운로드</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* 보드 이름 / 저장 상태 */}
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-400 whitespace-nowrap pl-2">
          {boardName ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onRenameBoard}
                  className="font-medium text-gray-600 hover:text-blue-600 transition-colors cursor-pointer underline-offset-2 hover:underline"
                >
                  {boardName}
                </button>
              </TooltipTrigger>
              <TooltipContent>클릭하여 보드 이름 변경</TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-gray-400 italic">미저장</span>
          )}
          {saveTime && <span>저장됨 · {saveTime}</span>}
        </div>
      </div>{/* end scrollable */}


      {/* 오른쪽 스크롤 화살표 */}
      {canScrollRight && (
        <button
          onClick={() => scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
          className="flex-shrink-0 w-7 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 border-l border-gray-200 text-lg font-bold z-10"
        >›</button>
      )}
    </div>
  )
}
