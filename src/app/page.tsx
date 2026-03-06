'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useWhiteboardStore } from '@/store/whiteboardStore'
import { usePages } from '@/hooks/usePages'
import { useLocalBoards } from '@/hooks/useLocalBoards'
import { LocalBoard } from '@/types/board'
import { saveBoard, getAllBoards, createNewBoard, createEmptyPage } from '@/lib/storage/localBoards'
import { generateThumbnail } from '@/lib/canvas/exportUtils'
import type { WhiteboardCanvasHandle } from '@/components/whiteboard/WhiteboardCanvas'
import type { Canvas as FabricCanvas } from 'fabric'
import PageNavigator from '@/components/whiteboard/PageNavigator'
import ZoomControl from '@/components/whiteboard/ZoomControl'
import TopToolbar from '@/components/whiteboard/TopToolbar'
import LeftSidebar from '@/components/whiteboard/LeftSidebar'
import BoardNameDialog from '@/components/whiteboard/BoardNameDialog'
import CalculatorPopup from '@/components/whiteboard/CalculatorPopup'
import InterestSymbolPanel from '@/components/whiteboard/InterestSymbolPanel'

// Dynamic import for canvas (no SSR)
const WhiteboardCanvas = dynamic(() => import('@/components/whiteboard/WhiteboardCanvas'), { ssr: false })
const TimelineDiagramModal = dynamic(() => import('@/components/whiteboard/TimelineDiagramModal'), { ssr: false })
const KaTeXInputModal = dynamic(() => import('@/components/whiteboard/KaTeXInputModal'), { ssr: false })

// Undo history per page
const undoStacks = new Map<string, string[]>()
const MAX_UNDO = 50

export default function Home() {
  const canvasHandleRef = useRef<WhiteboardCanvasHandle>(null)
  const {
    setTool, setColor, setZoom, zoom,
    setCurrentPageIndex, setTotalPages, setBoardName,
    setSavedAt, toggleSidebar, toggleBoardNameDialog,
    boardName,
    toggleTimelineModal, toggleKaTeXModal, toggleCalculator,
  } = useWhiteboardStore()

  const [currentBoard, setCurrentBoard] = useState<LocalBoard | null>(null)
  const [isSymbolPanelOpen, setIsSymbolPanelOpen] = useState(false)
  const { boards, refresh: refreshBoards, remove: removeBoard } = useLocalBoards()

  // Initialize with a default board
  const [initialPages] = useState(() => [createEmptyPage(0)])
  const {
    pages, setPages, currentIndex, canvasRef: pagesCanvasRef,
    switchToPage, addPage, deletePage, duplicatePage,
  } = usePages(initialPages)

  function getCanvas(): FabricCanvas | null {
    return canvasHandleRef.current?.getCanvas() ?? null
  }

  // After canvas mounts, connect pagesCanvasRef
  useEffect(() => {
    const interval = setInterval(() => {
      const c = getCanvas()
      if (c) {
        pagesCanvasRef.current = c
        clearInterval(interval)
      }
    }, 100)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync store
  useEffect(() => {
    setCurrentPageIndex(currentIndex)
    setTotalPages(pages.length)
  }, [currentIndex, pages.length, setCurrentPageIndex, setTotalPages])

  // Load last board on mount
  useEffect(() => {
    async function loadLast() {
      const all = await getAllBoards()
      if (all.length > 0) {
        await loadBoardIntoCanvas(all[0])
      }
    }
    const t = setTimeout(loadLast, 600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadBoardIntoCanvas(board: LocalBoard) {
    const canvas = getCanvas()
    if (!canvas) return
    undoStacks.clear()
    setCurrentBoard(board)
    setBoardName(board.name)
    setPages(board.pages)

    const pageIdx = Math.min(board.currentPageIndex, board.pages.length - 1)
    const page = board.pages[pageIdx] ?? board.pages[0]
    if (page) {
      await canvas.loadFromJSON(JSON.parse(page.canvasJSON))
      canvas.requestRenderAll()
      const pageId = page.id
      if (!undoStacks.has(pageId)) undoStacks.set(pageId, [])
      undoStacks.get(pageId)!.push(JSON.stringify(canvas.toJSON()))
    }
    useWhiteboardStore.getState().setCurrentPageIndex(pageIdx)
  }

  async function handleNewBoard() {
    const canvas = getCanvas()
    if (!canvas) return
    undoStacks.clear()
    canvas.clear()
    canvas.backgroundColor = '#ffffff'
    canvas.requestRenderAll()
    const newPage = createEmptyPage(0)
    setPages([newPage])
    setCurrentBoard(null)
    setBoardName(null)
    setSavedAt(null)
    useWhiteboardStore.getState().setCurrentPageIndex(0)
  }

  // Undo — stack stores states after each action; pop current then restore previous
  function handleUndo() {
    const canvas = getCanvas()
    if (!canvas) return
    const pageId = pages[currentIndex]?.id
    if (!pageId) return
    const stack = undoStacks.get(pageId)
    if (!stack || stack.length === 0) return
    stack.pop()  // discard latest (current) state
    if (stack.length > 0) {
      const prev = stack[stack.length - 1]
      canvas.loadFromJSON(JSON.parse(prev)).then(() => canvas.requestRenderAll())
    } else {
      canvas.clear()
      canvas.backgroundColor = '#ffffff'
      canvas.requestRenderAll()
    }
  }

  function handleStrokeEnd() {
    const canvas = getCanvas()
    if (!canvas) return
    const pageId = pages[currentIndex]?.id
    if (!pageId) return
    if (!undoStacks.has(pageId)) undoStacks.set(pageId, [])
    const stack = undoStacks.get(pageId)!
    if (stack.length >= MAX_UNDO) stack.shift()
    stack.push(JSON.stringify(canvas.toJSON()))
    scheduleAutoSave()
  }

  // Auto-save (debounced)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function scheduleAutoSave() {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => doSave(), 2000)
  }

  function generateDefaultName(): string {
    const d = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `보드 ${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
  }

  async function doSave() {
    const canvas = getCanvas()
    if (!canvas) return

    let name = useWhiteboardStore.getState().boardName
    if (!name) {
      name = generateDefaultName()
      setBoardName(name)
    }

    const thumbnail = generateThumbnail(canvas)
    const canvasJSON = JSON.stringify(canvas.toJSON())

    const updatedPages = pages.map((p, i) =>
      i === currentIndex ? { ...p, canvasJSON, thumbnail } : p
    )

    const board: LocalBoard = currentBoard
      ? { ...currentBoard, name, pages: updatedPages, currentPageIndex: currentIndex, updatedAt: Date.now() }
      : { ...createNewBoard(name), pages: updatedPages, currentPageIndex: currentIndex }

    await saveBoard(board)
    setCurrentBoard(board)
    setBoardName(name)
    setSavedAt(Date.now())
    await refreshBoards()
  }

  // 이름 변경 후 저장
  function handleSaveWithName(name: string) {
    setBoardName(name)
    setTimeout(() => doSave(), 50)
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === 'Escape') {
        e.preventDefault()
        useWhiteboardStore.getState().setPendingSymbolLatex(null)
        setTool('pen')
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); handleUndo(); return }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); doSave(); return }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') { e.preventDefault(); handleNewBoard(); return }
      if ((e.metaKey || e.ctrlKey) && e.key === 'm') { e.preventDefault(); addPage(); return }
      if (e.key === 'ArrowLeft' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        if (currentIndex > 0) switchToPage(currentIndex - 1)
        return
      }
      if (e.key === 'ArrowRight' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        if (currentIndex < pages.length - 1) switchToPage(currentIndex + 1)
        return
      }
      if (e.key === '=' || e.key === '+') { setZoom(zoom + 0.1); return }
      if (e.key === '-') { setZoom(zoom - 0.1); return }
      if (e.key === '0') { setZoom(1); return }

      switch (e.key.toLowerCase()) {
        case 'b': setColor('black'); setTool('pen'); break
        case 'r': setColor('red'); setTool('pen'); break
        case 'u': setColor('blue'); setTool('pen'); break
        case 's': setTool(useWhiteboardStore.getState().tool === 'select' ? 'pen' : 'select'); break
        case 'e': setTool('eraser'); break
        case 'c': toggleCalculator(); break
        case 't': toggleTimelineModal(); break
        case 'k': toggleKaTeXModal(); break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, pages.length, zoom])

  // visibilitychange: save immediately
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'hidden') {
        doSave()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, pages, currentBoard])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      {/* Top toolbar */}
      <TopToolbar
        onUndo={handleUndo}
        onSave={doSave}
        onStrokeEnd={handleStrokeEnd}
        getCanvas={getCanvas}
        isSymbolPanelOpen={isSymbolPanelOpen}
        onToggleSymbolPanel={() => setIsSymbolPanelOpen(v => !v)}
        onNewBoard={handleNewBoard}
        onOpenBoards={toggleSidebar}
        onRenameBoard={toggleBoardNameDialog}
      />

      {/* Sidebar toggle button */}
      <button
        onClick={toggleSidebar}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-20 bg-white border border-l-0 border-gray-200 rounded-r-md px-1.5 py-4 text-gray-400 hover:text-[#1E2D5E] hover:bg-gray-50 shadow-sm transition-colors text-lg"
        title="보드 & 페이지 목록"
      >
        ≡
      </button>

      {/* Canvas area + symbol panel */}
      <div className="flex-1 overflow-hidden flex flex-row">
        {isSymbolPanelOpen && (
          <InterestSymbolPanel />
        )}
        <WhiteboardCanvas
          ref={canvasHandleRef}
          initialJSON={pages[0]?.canvasJSON}
          onStrokeEnd={handleStrokeEnd}
        />
      </div>

      {/* Bottom bar */}
      <div className="h-8 flex items-center justify-between px-4 border-t border-gray-200 bg-white/95 flex-shrink-0">
        <PageNavigator
          onPrevPage={() => switchToPage(currentIndex - 1)}
          onNextPage={() => switchToPage(currentIndex + 1)}
          onAddPage={() => addPage()}
        />
        <ZoomControl />
      </div>

      {/* Modals & Overlays */}
      <LeftSidebar
        boards={boards}
        currentBoard={currentBoard}
        currentPageIndex={currentIndex}
        pages={pages}
        onLoadBoard={loadBoardIntoCanvas}
        onDeleteBoard={async (id) => { await removeBoard(id); if (currentBoard?.id === id) { setCurrentBoard(null); setBoardName(null); setSavedAt(null) } }}
        onNewBoard={handleNewBoard}
        onSwitchPage={switchToPage}
        onDeletePage={deletePage}
        onDuplicatePage={duplicatePage}
      />

      <BoardNameDialog onConfirm={handleSaveWithName} />
      <CalculatorPopup />
      <TimelineDiagramModal getCanvas={getCanvas} />
      <KaTeXInputModal getCanvas={getCanvas} />
    </div>
  )
}
