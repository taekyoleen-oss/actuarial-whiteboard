'use client'

import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react'
import { useWhiteboardStore } from '@/store/whiteboardStore'
import { recognizeHandwriting } from '@/lib/canvas/inkRecognition'
import { generateArrowLineSVG, generateNumberLineSVG } from '@/lib/canvas/actuarialShapes'

export interface WhiteboardCanvasHandle {
  getCanvas: () => import('fabric').Canvas | null
}

interface Props {
  initialJSON?: string
  onStrokeEnd?: () => void
}

const CANVAS_WIDTH = 1600
const CANVAS_HEIGHT = 900

const WhiteboardCanvas = forwardRef<WhiteboardCanvasHandle, Props>(({ initialJSON, onStrokeEnd }, ref) => {
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<import('fabric').Canvas | null>(null)
  const { tool, getHexColor, strokeWidth, eraserWidth, eraserMode, zoom, setZoom, setTool, numberLineStart, numberLineEnd, pendingSymbolLatex, setPendingSymbolLatex } = useWhiteboardStore()
  const isStylusing = useRef(false)
  const keyDownRef = useRef<((e: KeyboardEvent) => void) | null>(null)
  const [isRecognizing, setIsRecognizing] = useState(false)
  // recognize mode state
  const recognizeStartRef = useRef<{ x: number; y: number } | null>(null)
  const recognizeRectRef = useRef<import('fabric').Rect | null>(null)

  // Ref to always call the latest onStrokeEnd — prevents stale closure in init effect
  const onStrokeEndRef = useRef(onStrokeEnd)
  useEffect(() => { onStrokeEndRef.current = onStrokeEnd }, [onStrokeEnd])

  useImperativeHandle(ref, () => ({
    getCanvas: () => fabricRef.current,
  }))

  // Initialize Fabric.js
  useEffect(() => {
    // cancelled flag: StrictMode runs effects twice in dev; this prevents
    // the first (discarded) async init from racing with the second real init.
    let cancelled = false
    let canvas: import('fabric').Canvas | null = null

    async function init() {
      const { Canvas, PencilBrush } = await import('fabric')

      // Check cancelled after the async import (StrictMode cleanup may have run)
      if (cancelled || !canvasElRef.current) return

      // If fabricRef already holds a canvas (e.g. from a previous StrictMode run
      // that completed before cleanup could dispose it), dispose it first.
      if (fabricRef.current) {
        fabricRef.current.dispose()
        fabricRef.current = null
      }

      canvas = new Canvas(canvasElRef.current, {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: '#ffffff',
        isDrawingMode: true,
        selection: false,
      })

      // Check again after synchronous Canvas construction
      if (cancelled) {
        canvas.dispose()
        canvas = null
        return
      }

      canvas.freeDrawingBrush = new PencilBrush(canvas)
      canvas.freeDrawingBrush.color = '#1A1A1A'
      canvas.freeDrawingBrush.width = 3

      if (initialJSON) {
        await canvas.loadFromJSON(JSON.parse(initialJSON))
        if (cancelled) { canvas.dispose(); canvas = null; return }
        canvas.requestRenderAll()
      }

      // Palm rejection
      canvas.on('mouse:down', (e) => {
        const ne = e.e as PointerEvent
        if (ne.pointerType === 'pen') isStylusing.current = true
        if (ne.pointerType === 'touch' && isStylusing.current) {
          e.e.preventDefault()
          e.e.stopPropagation()
        }
      })

      canvas.on('mouse:up', (e) => {
        const ne = e.e as PointerEvent
        if (ne.pointerType === 'pen') {
          setTimeout(() => { isStylusing.current = false }, 200)
        }
      })

      canvas.on('path:created', () => {
        onStrokeEndRef.current?.()
      })

      // Delete selected objects with Delete/Backspace
      function onKeyDown(e: KeyboardEvent) {
        if (e.key !== 'Delete' && e.key !== 'Backspace') return
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        const c = fabricRef.current
        if (!c) return
        const active = c.getActiveObjects()
        if (active.length === 0) return
        c.remove(...active)
        c.discardActiveObject()
        c.requestRenderAll()
        onStrokeEndRef.current?.()
      }
      window.addEventListener('keydown', onKeyDown)
      keyDownRef.current = onKeyDown

      fabricRef.current = canvas
    }

    init()

    return () => {
      cancelled = true
      if (keyDownRef.current) {
        window.removeEventListener('keydown', keyDownRef.current)
        keyDownRef.current = null
      }
      // Dispose whichever canvas instance exists
      const toDispose = canvas ?? fabricRef.current
      if (toDispose) toDispose.dispose()
      canvas = null
      fabricRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync tool/color/strokeWidth
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    async function updateBrush() {
      const { PencilBrush } = await import('fabric')

      if (tool === 'pen') {
        canvas!.isDrawingMode = true
        canvas!.selection = false
        const brush = new PencilBrush(canvas!)
        brush.color = getHexColor()
        brush.width = strokeWidth
        canvas!.freeDrawingBrush = brush
      } else if (tool === 'eraser') {
        canvas!.isDrawingMode = true
        canvas!.selection = false
        const brush = new PencilBrush(canvas!)
        brush.color = 'rgba(255,255,255,0.01)'
        brush.width = eraserWidth
        canvas!.freeDrawingBrush = brush
        // Circular eraser cursor matching brush size
        const r = Math.max(4, (eraserWidth * zoom) / 2)
        const sz = Math.ceil(r * 2 + 4)
        const cx = r + 2
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${sz}' height='${sz}'><circle cx='${cx}' cy='${cx}' r='${r}' fill='rgba(255,255,255,0.4)' stroke='#555' stroke-width='1.5' stroke-dasharray='3,2'/></svg>`
        canvas!.freeDrawingCursor = `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${cx} ${cx}, crosshair`
      } else if (tool === 'select') {
        canvas!.isDrawingMode = false
        canvas!.selection = true
      } else if (tool === 'recognize' || tool === 'arrow-line' || tool === 'time-line' || tool === 'place-symbol') {
        canvas!.isDrawingMode = false
        canvas!.selection = false
      }
    }

    updateBrush()
  }, [tool, getHexColor, strokeWidth, eraserWidth, zoom])

  // Eraser: handle freehand-only vs clear-all
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas || tool !== 'eraser') return

    function handlePathCreated(e: { path?: import('fabric').Path }) {
      if (!canvas || !e.path) return

      // freehand-only: remove the eraser path and erase intersecting freehand paths
      const eraserPath = e.path
      const objects = canvas.getObjects()
      const toRemove: import('fabric').FabricObject[] = []

      for (const obj of objects) {
        if (obj === eraserPath) continue
        if (obj.type !== 'path') continue
        const eraserBounds = eraserPath.getBoundingRect()
        const objBounds = obj.getBoundingRect()
        const overlaps =
          eraserBounds.left < objBounds.left + objBounds.width &&
          eraserBounds.left + eraserBounds.width > objBounds.left &&
          eraserBounds.top < objBounds.top + objBounds.height &&
          eraserBounds.top + eraserBounds.height > objBounds.top
        if (overlaps) toRemove.push(obj)
      }

      canvas.remove(eraserPath, ...toRemove)
      canvas.requestRenderAll()
    }

    // Double-click any object to delete it with eraser
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handleDblClick(e: any) {
      if (!canvas || !e.target) return
      canvas.remove(e.target)
      canvas.discardActiveObject()
      canvas.requestRenderAll()
      onStrokeEndRef.current?.()
    }

    canvas.on('path:created', handlePathCreated as (e: Record<string, unknown>) => void)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas.on('mouse:dblclick', handleDblClick as any)
    return () => {
      canvas.off('path:created', handlePathCreated as (e: Record<string, unknown>) => void)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.off('mouse:dblclick', handleDblClick as any)
    }
  }, [tool, eraserMode])

  // Recognize mode: drag to select area → call Vision API
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas || tool !== 'recognize') return

    async function onMouseDown(e: { pointer: { x: number; y: number } }) {
      if (!canvas) return
      const { x, y } = e.pointer
      recognizeStartRef.current = { x, y }

      const { Rect } = await import('fabric')
      const rect = new Rect({
        left: x, top: y, width: 0, height: 0,
        fill: 'rgba(59,130,246,0.05)',
        stroke: '#3B82F6',
        strokeWidth: 1.5,
        strokeDashArray: [5, 3],
        selectable: false,
        evented: false,
      })
      recognizeRectRef.current = rect
      canvas.add(rect)
      canvas.requestRenderAll()
    }

    function onMouseMove(e: { pointer: { x: number; y: number } }) {
      const start = recognizeStartRef.current
      const rect = recognizeRectRef.current
      if (!start || !rect || !canvas) return
      const { x, y } = e.pointer
      rect.set({
        left: Math.min(start.x, x),
        top: Math.min(start.y, y),
        width: Math.abs(x - start.x),
        height: Math.abs(y - start.y),
      })
      canvas.requestRenderAll()
    }

    async function onMouseUp(e: { pointer: { x: number; y: number } }) {
      const start = recognizeStartRef.current
      const rect = recognizeRectRef.current
      if (!start || !rect || !canvas) return

      const { x, y } = e.pointer
      const left = Math.min(start.x, x)
      const top = Math.min(start.y, y)
      const width = Math.abs(x - start.x)
      const height = Math.abs(y - start.y)

      canvas.remove(rect)
      recognizeRectRef.current = null
      recognizeStartRef.current = null
      canvas.requestRenderAll()

      if (width < 10 || height < 10) return

      setIsRecognizing(true)
      try {
        const zoom = canvas.getZoom()
        const dataURL = canvas.toDataURL({
          format: 'png',
          multiplier: 1 / zoom,
          left: left * zoom,
          top: top * zoom,
          width: width * zoom,
          height: height * zoom,
        })

        const text = await recognizeHandwriting(dataURL)
        if (text.trim()) {
          const { Textbox } = await import('fabric')
          const tb = new Textbox(text, {
            left,
            top: top + height + 8,
            width: Math.max(width, 200),
            fontSize: 16,
            fontFamily: 'Pretendard, sans-serif',
            fill: '#111827',
          })
          canvas.add(tb)
          canvas.setActiveObject(tb)
          canvas.requestRenderAll()
        }
      } catch (err) {
        console.error('Recognition failed:', err)
      } finally {
        setIsRecognizing(false)
        setTool('pen')
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas.on('mouse:down', onMouseDown as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas.on('mouse:move', onMouseMove as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas.on('mouse:up', onMouseUp as any)

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.off('mouse:down', onMouseDown as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.off('mouse:move', onMouseMove as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.off('mouse:up', onMouseUp as any)
      // Clean up any leftover rect
      if (recognizeRectRef.current) {
        canvas.remove(recognizeRectRef.current)
        recognizeRectRef.current = null
      }
      recognizeStartRef.current = null
    }
  }, [tool, setTool])

  // Arrow-line: drag to determine length, then place SVG with period labels
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas || tool !== 'arrow-line') return

    const TICK = 94
    const arrowStartRef = { current: null as { x: number; y: number } | null }
    let previewLine: import('fabric').Line | null = null

    async function onMouseDown(e: { pointer: { x: number; y: number } }) {
      if (!canvas) return
      const { x, y } = e.pointer
      arrowStartRef.current = { x, y }

      const { Line } = await import('fabric')
      previewLine = new Line([x, y, x, y], {
        stroke: '#1A1A1A',
        strokeWidth: 2,
        strokeDashArray: [5, 3],
        selectable: false,
        evented: false,
      })
      canvas.add(previewLine)
      canvas.requestRenderAll()
    }

    function onMouseMove(e: { pointer: { x: number; y: number } }) {
      const start = arrowStartRef.current
      if (!start || !previewLine || !canvas) return
      previewLine.set({ x2: e.pointer.x, y2: start.y })
      canvas.requestRenderAll()
    }

    async function onMouseUp(e: { pointer: { x: number; y: number } }) {
      const start = arrowStartRef.current
      if (!start || !canvas) return

      if (previewLine) { canvas.remove(previewLine); previewLine = null }
      arrowStartRef.current = null

      const pixelWidth = Math.abs(e.pointer.x - start.x)
      if (pixelWidth < 20) { canvas.requestRenderAll(); return }

      const range = Math.round((pixelWidth - 20) / TICK)
      const svgString = generateArrowLineSVG(pixelWidth, range)

      const { loadSVGFromString, util } = await import('fabric')
      const { objects, options } = await loadSVGFromString(svgString)
      const nonNull = objects.filter((o): o is NonNullable<typeof o> => o !== null)
      const group = util.groupSVGElements(nonNull, options)

      const leftX = Math.min(start.x, e.pointer.x)
      const svgH = group.height ?? 40
      group.set({ left: leftX, top: start.y - svgH / 2 })

      canvas.add(group)
      canvas.setActiveObject(group)
      canvas.requestRenderAll()
      onStrokeEndRef.current?.()
      setTool('select')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas.on('mouse:down', onMouseDown as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas.on('mouse:move', onMouseMove as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas.on('mouse:up', onMouseUp as any)

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.off('mouse:down', onMouseDown as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.off('mouse:move', onMouseMove as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.off('mouse:up', onMouseUp as any)
      if (previewLine) { canvas.remove(previewLine); previewLine = null }
    }
  }, [tool, setTool])

  // Number-line: click to place SVG, then switch to select
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas || tool !== 'time-line') return

    async function onMouseDown(e: { pointer: { x: number; y: number } }) {
      if (!canvas) return
      const { x, y } = e.pointer

      const svgString = generateNumberLineSVG(numberLineStart, numberLineEnd)
      const { loadSVGFromString, util } = await import('fabric')
      const { objects, options } = await loadSVGFromString(svgString)
      const nonNull = objects.filter((o): o is NonNullable<typeof o> => o !== null)
      const group = util.groupSVGElements(nonNull, options)

      const svgH = group.height ?? 40
      group.set({ left: x, top: y - svgH / 2 })

      canvas.add(group)
      canvas.setActiveObject(group)
      canvas.requestRenderAll()
      onStrokeEndRef.current?.()
      setTool('select')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas.on('mouse:down', onMouseDown as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return () => canvas.off('mouse:down', onMouseDown as any)
  }, [tool, setTool, numberLineStart, numberLineEnd])

  // Select mode: clicking empty canvas area → return to pen
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas || tool !== 'select') return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function onMouseDown(e: any) {
      if (!e.target) {
        setTool('pen')
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas.on('mouse:down', onMouseDown as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return () => canvas.off('mouse:down', onMouseDown as any)
  }, [tool, setTool])

  // Place-symbol mode: click on canvas to load & place the symbol image, then switch to select
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas || tool !== 'place-symbol' || !pendingSymbolLatex) return

    let isPlacing = false

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function onMouseDown(e: any) {
      if (!canvas || !pendingSymbolLatex || isPlacing) return
      isPlacing = true

      const { x, y } = e.pointer as { x: number; y: number }

      try {
        const { latexToSVGDataURL } = await import('@/lib/canvas/katexHelpers')
        const url = await latexToSVGDataURL(pendingSymbolLatex)
        const { FabricImage } = await import('fabric')
        const img = await FabricImage.fromURL(url)
        img.set({ left: x, top: y, originX: 'center', originY: 'center' })
        canvas.add(img)
        canvas.setActiveObject(img)
        canvas.requestRenderAll()
        onStrokeEndRef.current?.()
      } catch (err) {
        console.error('Symbol place failed:', err)
      }

      setPendingSymbolLatex(null)
      setTool('select')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas.on('mouse:down', onMouseDown as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return () => canvas.off('mouse:down', onMouseDown as any)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, pendingSymbolLatex, setTool, setPendingSymbolLatex])

  // Zoom
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    canvas.setZoom(zoom)
    canvas.setDimensions({
      width: CANVAS_WIDTH * zoom,
      height: CANVAS_HEIGHT * zoom,
    })
    canvas.requestRenderAll()
  }, [zoom])

  return (
    <div className="flex-1 overflow-auto bg-gray-100 flex items-start justify-start">
      <div style={{ transformOrigin: 'top left' }}>
        <canvas
          ref={canvasElRef}
          style={{
            display: 'block',
            cursor: isRecognizing ? 'wait'
              : tool === 'select' ? 'default'
              : tool === 'recognize' ? 'crosshair'
              : tool === 'place-symbol' ? 'none'
              : (tool === 'arrow-line' || tool === 'time-line') ? 'copy'
              : 'crosshair',
          }}
        />
      </div>
    </div>
  )
})

WhiteboardCanvas.displayName = 'WhiteboardCanvas'

export default WhiteboardCanvas
export { CANVAS_WIDTH, CANVAS_HEIGHT }
