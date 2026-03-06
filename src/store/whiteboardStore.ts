'use client'

import { create } from 'zustand'
import { DrawingTool, PenColor, EraserMode } from '@/types/drawing'

const PEN_COLORS: Record<PenColor, string> = {
  black: '#1A1A1A',
  red: '#DC2626',
  blue: '#2563EB',
}

interface WhiteboardStore {
  tool: DrawingTool
  color: PenColor
  strokeWidth: number
  eraserWidth: number
  eraserMode: EraserMode
  zoom: number
  currentPageIndex: number
  totalPages: number
  boardName: string | null
  savedAt: number | null
  isCalculatorOpen: boolean
  isTimelineModalOpen: boolean
  isKaTeXModalOpen: boolean
  isBoardNameDialogOpen: boolean
  isSidebarOpen: boolean
  numberLineStart: string
  numberLineEnd: string
  pendingSymbolLatex: string | null

  setTool: (tool: DrawingTool) => void
  setColor: (color: PenColor) => void
  setStrokeWidth: (width: number) => void
  setEraserWidth: (width: number) => void
  setEraserMode: (mode: EraserMode) => void
  setZoom: (zoom: number) => void
  setCurrentPageIndex: (index: number) => void
  setTotalPages: (total: number) => void
  setBoardName: (name: string | null) => void
  setSavedAt: (ts: number | null) => void
  toggleCalculator: () => void
  toggleTimelineModal: () => void
  toggleKaTeXModal: () => void
  toggleBoardNameDialog: () => void
  toggleSidebar: () => void
  setNumberLineStart: (s: string) => void
  setNumberLineEnd: (s: string) => void
  setPendingSymbolLatex: (latex: string | null) => void

  getHexColor: () => string
}

export const useWhiteboardStore = create<WhiteboardStore>((set, get) => ({
  tool: 'pen',
  color: 'black',
  strokeWidth: 3,
  eraserWidth: 20,
  eraserMode: 'freehand-only',
  zoom: 1,
  currentPageIndex: 0,
  totalPages: 1,
  boardName: null,
  savedAt: null,
  isCalculatorOpen: false,
  isTimelineModalOpen: false,
  isKaTeXModalOpen: false,
  isBoardNameDialogOpen: false,
  isSidebarOpen: false,
  numberLineStart: '0',
  numberLineEnd: '10',
  pendingSymbolLatex: null,

  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setEraserWidth: (eraserWidth) => set({ eraserWidth }),
  setEraserMode: (eraserMode) => set({ eraserMode }),
  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(4, zoom)) }),
  setCurrentPageIndex: (currentPageIndex) => set({ currentPageIndex }),
  setTotalPages: (totalPages) => set({ totalPages }),
  setBoardName: (boardName) => set({ boardName }),
  setSavedAt: (savedAt) => set({ savedAt }),
  toggleCalculator: () => set((s) => ({ isCalculatorOpen: !s.isCalculatorOpen })),
  toggleTimelineModal: () => set((s) => ({ isTimelineModalOpen: !s.isTimelineModalOpen })),
  toggleKaTeXModal: () => set((s) => ({ isKaTeXModalOpen: !s.isKaTeXModalOpen })),
  toggleBoardNameDialog: () => set((s) => ({ isBoardNameDialogOpen: !s.isBoardNameDialogOpen })),
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  setNumberLineStart: (numberLineStart) => set({ numberLineStart }),
  setNumberLineEnd: (numberLineEnd) => set({ numberLineEnd }),
  setPendingSymbolLatex: (pendingSymbolLatex) => set({ pendingSymbolLatex }),

  getHexColor: () => PEN_COLORS[get().color],
}))
