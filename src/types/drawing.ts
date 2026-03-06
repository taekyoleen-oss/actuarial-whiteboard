export type PenColor = 'black' | 'red' | 'blue'
export type EraserMode = 'freehand-only' | 'clear-all'
export type DrawingTool = 'pen' | 'eraser' | 'select' | 'recognize' | 'arrow-line' | 'time-line' | 'place-symbol'

export interface DrawingState {
  tool: DrawingTool
  color: PenColor
  strokeWidth: number
  eraserMode: EraserMode
  zoom: number
}
