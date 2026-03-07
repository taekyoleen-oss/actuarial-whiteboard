'use client'

import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react'
import { useWhiteboardStore } from '@/store/whiteboardStore'
import { recognizeHandwriting } from '@/lib/canvas/inkRecognition'
import { generateArrowLineSVG, generateNumberLineSVG } from '@/lib/canvas/actuarialShapes'
import { analyzePointer } from '@/lib/canvas/pointerDetect'

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
  const { tool, getHexColor, strokeWidth, eraserWidth, eraserMode, zoom, setZoom, setTool, numberLineStart, numberLineEnd, pendingSymbolLatex, setPendingSymbolLatex, allowMouse, allowPen, allowTouch, recognizeMode, clipboardJSON } = useWhiteboardStore()
  const isStylusing       = useRef(false)
  const primaryTouchIdRef = useRef<number | null>(null)   // first-touch-wins palm rejection
  const blockedTouchIds   = useRef<Set<number>>(new Set())
  const allowMouseRef = useRef(allowMouse)
  const allowPenRef   = useRef(allowPen)
  const allowTouchRef = useRef(allowTouch)
  const keyDownRef        = useRef<((e: KeyboardEvent) => void) | null>(null)
  const pointerBlockerRef = useRef<((e: PointerEvent) => void) | null>(null)
  const upperCanvasRef    = useRef<HTMLCanvasElement | null>(null)
  const lastDrawTypeRef    = useRef<'mouse' | 'pen' | 'touch' | null>(null)  // 최근 획 입력 타입
  const trackDrawTypeRef   = useRef<((e: PointerEvent) => void) | null>(null)
  const [isRecognizing, setIsRecognizing] = useState(false)
  // recognize mode state
  const recognizeStartRef = useRef<{ x: number; y: number } | null>(null)
  const recognizeRectRef = useRef<import('fabric').Rect | null>(null)

  // Sync allow-flags into refs (init-effect 클로저가 항상 최신값 참조)
  useEffect(() => { allowMouseRef.current = allowMouse }, [allowMouse])
  useEffect(() => { allowPenRef.current   = allowPen   }, [allowPen])
  useEffect(() => { allowTouchRef.current = allowTouch }, [allowTouch])

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

      // 입력 허용 게이트 — canvas.upperCanvasEl 캡처 단계 등록
      // Fabric 리스너보다 먼저 실행 → 차단된 입력은 Fabric에 전혀 도달하지 않음
      // analyzePointer: tilt ≥ 1° → pen(score 70+), tilt = 0° → touch(score ≤ 30)
      const upperCanvas = canvas.upperCanvasEl
      upperCanvasRef.current = upperCanvas

      // ── window capture: 포인터 타입을 가장 먼저 기록 ────────────────────────
      // Fabric.js가 ev.e를 MouseEvent로 변환하더라도 여기서 PointerEvent 원본을 잡음.
      // FilteredPencilBrush.onMouseDown에서 이 값을 읽어 차단 여부 결정.
      const trackDrawType = (e: PointerEvent) => {
        lastDrawTypeRef.current = analyzePointer(e).resolvedType
      }
      window.addEventListener('pointerdown', trackDrawType, { capture: true })
      trackDrawTypeRef.current = trackDrawType

      // ── 1차 방어: document capture에서 pointerdown 차단 ──────────────────
      // pointerdown이 차단되면 Fabric이 drawing session을 시작하지 않으므로
      // 후속 pointermove로 획이 그려지지 않음.
      const filterPointer = (e: PointerEvent) => {
        // target이 우리 canvas 영역 안인지 확인 (wrapperEl + upperCanvasEl 이중 체크)
        const target = e.target as Node
        const onUpper  = upperCanvas && target === upperCanvas
        const onWrapper = canvas?.wrapperEl?.contains(target)
        if (!onUpper && !onWrapper) return

        // ── TOUCH: first-touch-wins palm rejection ────────────────────────
        if (e.pointerType === 'touch') {
          if (e.type === 'pointerdown') {
            if (primaryTouchIdRef.current === null) {
              primaryTouchIdRef.current = e.pointerId
            } else {
              blockedTouchIds.current.add(e.pointerId)
              e.preventDefault(); e.stopImmediatePropagation(); return
            }
          } else {
            if (blockedTouchIds.current.has(e.pointerId)) {
              if (e.type !== 'pointermove') blockedTouchIds.current.delete(e.pointerId)
              e.preventDefault(); e.stopImmediatePropagation(); return
            }
            if ((e.type === 'pointerup' || e.type === 'pointercancel') &&
                e.pointerId === primaryTouchIdRef.current) {
              primaryTouchIdRef.current = null
            }
          }
        }

        // ── PEN (active digitizer): 펜 사용 중 touch 차단 ──────────────
        if (e.type === 'pointerdown') {
          if (e.pointerType === 'pen') isStylusing.current = true
          if (e.pointerType === 'touch' && isStylusing.current) {
            e.preventDefault(); e.stopImmediatePropagation(); return
          }
        }
        if ((e.type === 'pointerup' || e.type === 'pointercancel') && e.pointerType === 'pen') {
          setTimeout(() => { isStylusing.current = false }, 200)
        }

        // ── 입력 허용 플래그 ──────────────────────────────────────────────
        const { resolvedType } = analyzePointer(e)
        const blocked =
          (resolvedType === 'pen'   && !allowPenRef.current)   ||
          (resolvedType === 'mouse' && !allowMouseRef.current) ||
          (resolvedType === 'touch' && !allowTouchRef.current)
        if (blocked) { e.preventDefault(); e.stopImmediatePropagation() }
      }
      document.addEventListener('pointerdown',   filterPointer, { capture: true })
      document.addEventListener('pointermove',   filterPointer, { capture: true })
      document.addEventListener('pointerup',     filterPointer, { capture: true })
      document.addEventListener('pointercancel', filterPointer, { capture: true })
      pointerBlockerRef.current = filterPointer

      // ── path:created: 2차 방어 — 차단 입력으로 그린 획 즉시 제거 ──────────
      // 1차 방어(document capture)가 뚫렸을 때의 안전망.
      // onStrokeEndRef(undo push)를 호출하지 않으므로 undo 스택에도 남지 않음.
      canvas.on('path:created', (opt: Record<string, unknown>) => {
        const ptype = lastDrawTypeRef.current
        if (ptype) {
          const blocked =
            (ptype === 'pen'   && !allowPenRef.current)   ||
            (ptype === 'mouse' && !allowMouseRef.current) ||
            (ptype === 'touch' && !allowTouchRef.current)
          if (blocked) {
            canvas.remove(opt.path as import('fabric').Path)
            canvas.requestRenderAll()
            return  // undo 스택 push 안 함
          }
        }
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
      if (pointerBlockerRef.current) {
        document.removeEventListener('pointerdown',   pointerBlockerRef.current as EventListener, { capture: true })
        document.removeEventListener('pointermove',   pointerBlockerRef.current as EventListener, { capture: true })
        document.removeEventListener('pointerup',     pointerBlockerRef.current as EventListener, { capture: true })
        document.removeEventListener('pointercancel', pointerBlockerRef.current as EventListener, { capture: true })
        pointerBlockerRef.current = null
      }
      if (trackDrawTypeRef.current) {
        window.removeEventListener('pointerdown', trackDrawTypeRef.current as EventListener, { capture: true })
        trackDrawTypeRef.current = null
      }
      upperCanvasRef.current = null
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

      // ── FilteredPencilBrush: onMouseDown에서 입력 타입 직접 차단 ──────────
      // 이벤트 전파/캡처 방식과 달리, 브러시 레벨에서 차단하므로
      // pointer capture, 이벤트 우선순위 등 모든 환경에서 확실히 동작.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      class FilteredPencilBrush extends PencilBrush {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onMouseDown(pointer: any, ev: any) {
          // window capture에서 기록한 포인터 타입을 사용
          // (Fabric이 ev.e를 MouseEvent로 변환하는 경우에도 원본 타입 보존)
          const ptype = lastDrawTypeRef.current
          if (ptype) {
            const { allowMouse: am, allowPen: ap, allowTouch: at } = useWhiteboardStore.getState()
            if (
              (ptype === 'pen'   && !ap) ||
              (ptype === 'mouse' && !am) ||
              (ptype === 'touch' && !at)
            ) return  // 차단: super.onMouseDown 호출 안 함 → 획 시작 안 됨
          }
          super.onMouseDown(pointer, ev)
        }
      }

      if (tool === 'pen') {
        canvas!.isDrawingMode = true
        canvas!.selection = false
        const brush = new FilteredPencilBrush(canvas!)
        brush.color = getHexColor()
        brush.width = strokeWidth
        canvas!.freeDrawingBrush = brush
        // 펜 커서 — 기울어진 펜 모양 SVG, 핫스팟 = 펜 끝(좌하)
        const penSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 22 22'><path d='M2 20L3.5 13L15 1.5L20.5 7L9 18.5Z' fill='%23334155' stroke='white' stroke-width='1.2' stroke-linejoin='round'/><path d='M2 20L6 18L4 16Z' fill='%23f97316' stroke='white' stroke-width='0.6'/><line x1='7' y1='15' x2='17' y2='5' stroke='white' stroke-width='0.8' opacity='0.35'/></svg>`
        canvas!.freeDrawingCursor = `url("data:image/svg+xml,${encodeURIComponent(penSvg)}") 2 20, crosshair`
      } else if (tool === 'eraser') {
        canvas!.isDrawingMode = true
        canvas!.selection = false
        const brush = new FilteredPencilBrush(canvas!)
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
        canvas!.defaultCursor = 'pointer'
        canvas!.hoverCursor = 'grab'
        canvas!.moveCursor = 'grabbing'
      } else if (tool === 'recognize' || tool === 'arrow-line' || tool === 'time-line' || tool === 'place-symbol' || tool === 'paste') {
        canvas!.isDrawingMode = false
        canvas!.selection = false
        canvas!.defaultCursor = tool === 'paste' ? 'copy' : tool === 'place-symbol' ? 'crosshair' : tool === 'recognize' ? 'crosshair' : 'copy'
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
      onStrokeEndRef.current?.()
    }

    // 더블탭으로 개체 삭제 — 마우스·펜 모두 지원
    // pointerdown/move/up 직접 추적: 움직임이 적은 두 번의 탭을 더블탭으로 인식
    const DOUBLE_TAP_DELAY = 400   // ms
    const DOUBLE_TAP_DIST  = 30    // px (두 탭 사이 최대 거리)
    const TAP_MOVE_MAX     = 15    // px (탭 중 최대 이동량 — 초과 시 획으로 판단)
    const tapState = { lastTime: 0, lastX: 0, lastY: 0, pressX: 0, pressY: 0, moved: false }

    function onTapDown(e: PointerEvent) {
      tapState.pressX = e.clientX
      tapState.pressY = e.clientY
      tapState.moved  = false
    }

    function onTapMove(e: PointerEvent) {
      if (e.buttons === 0) return
      const dx = e.clientX - tapState.pressX
      const dy = e.clientY - tapState.pressY
      if (Math.sqrt(dx * dx + dy * dy) > TAP_MOVE_MAX) tapState.moved = true
    }

    function onTapUp(e: PointerEvent) {
      if (!canvas) return
      if (tapState.moved) { tapState.lastTime = 0; return }  // 획 → 초기화

      const now = Date.now()
      const dx  = e.clientX - tapState.lastX
      const dy  = e.clientY - tapState.lastY
      if (now - tapState.lastTime < DOUBLE_TAP_DELAY && Math.sqrt(dx * dx + dy * dy) < DOUBLE_TAP_DIST) {
        // 더블탭 확정 → 해당 위치의 개체 삭제
        const pointer = canvas.getPointer(e)
        const objects = canvas.getObjects()
        for (let i = objects.length - 1; i >= 0; i--) {
          if (objects[i].containsPoint(pointer)) {
            canvas.remove(objects[i])
            canvas.requestRenderAll()
            onStrokeEndRef.current?.()
            break
          }
        }
        tapState.lastTime = 0  // 연속 트리거 방지
      } else {
        tapState.lastTime = now
        tapState.lastX    = e.clientX
        tapState.lastY    = e.clientY
      }
    }

    canvas.on('path:created', handlePathCreated as (e: Record<string, unknown>) => void)
    canvas.upperCanvasEl.addEventListener('pointerdown', onTapDown)
    canvas.upperCanvasEl.addEventListener('pointermove', onTapMove)
    canvas.upperCanvasEl.addEventListener('pointerup',   onTapUp)
    return () => {
      canvas.off('path:created', handlePathCreated as (e: Record<string, unknown>) => void)
      canvas.upperCanvasEl?.removeEventListener('pointerdown', onTapDown)
      canvas.upperCanvasEl?.removeEventListener('pointermove', onTapMove)
      canvas.upperCanvasEl?.removeEventListener('pointerup',   onTapUp)
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

        const text = await recognizeHandwriting(dataURL, recognizeMode)
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
  }, [tool, setTool, recognizeMode])

  // Arrow-line: drag to determine length, then place SVG with period labels
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas || tool !== 'arrow-line') return

    const TICK = 150
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
        // html2canvas scale:4 로 캡처하므로 0.25배로 보정 → CSS 픽셀 기준 정상 크기
        img.set({ left: x, top: y, originX: 'center', originY: 'center', scaleX: 0.25, scaleY: 0.25 })
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

  // Paste mode: click to place copied objects at cursor position
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas || tool !== 'paste' || !clipboardJSON) return

    async function onMouseDown(e: { pointer: { x: number; y: number } }) {
      if (!canvas || !clipboardJSON) return
      const { x, y } = e.pointer

      const { util } = await import('fabric')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const objects: import('fabric').FabricObject[] = await (util as any).enlivenObjects(JSON.parse(clipboardJSON))
      if (objects.length === 0) return

      // Compute bounding box center of the copied objects
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const obj of objects) {
        const b = obj.getBoundingRect()
        minX = Math.min(minX, b.left)
        minY = Math.min(minY, b.top)
        maxX = Math.max(maxX, b.left + b.width)
        maxY = Math.max(maxY, b.top + b.height)
      }
      const dx = x - (minX + maxX) / 2
      const dy = y - (minY + maxY) / 2

      for (const obj of objects) {
        obj.set({ left: (obj.left ?? 0) + dx, top: (obj.top ?? 0) + dy })
        obj.setCoords()
        canvas.add(obj)
      }
      canvas.requestRenderAll()
      onStrokeEndRef.current?.()
      setTool('select')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas.on('mouse:down', onMouseDown as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return () => canvas.off('mouse:down', onMouseDown as any)
  }, [tool, clipboardJSON, setTool])

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
              : tool === 'select' ? 'pointer'
              : tool === 'recognize' ? 'crosshair'
              : tool === 'place-symbol' ? 'crosshair'
              : tool === 'paste' ? 'copy'
              : (tool === 'arrow-line' || tool === 'time-line') ? 'copy'
              : 'none',  // pen/eraser: Fabric.js freeDrawingCursor 사용
          }}
        />
      </div>
    </div>
  )
})

WhiteboardCanvas.displayName = 'WhiteboardCanvas'

export default WhiteboardCanvas
export { CANVAS_WIDTH, CANVAS_HEIGHT }
