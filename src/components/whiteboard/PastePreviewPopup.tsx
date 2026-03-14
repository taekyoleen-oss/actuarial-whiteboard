'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

const PREVIEW_W = 700
const PREVIEW_H = 500
const MIN_SIZE = 60
const INITIAL_XY = 40

interface PastePreviewPopupProps {
  imageDataUrl: string
  onConfirm: (dataUrl: string, left: number, top: number, width: number, height: number) => void
  onCancel: () => void
}

export default function PastePreviewPopup({ imageDataUrl, onConfirm, onCancel }: PastePreviewPopupProps) {
  const [pos, setPos] = useState({ x: INITIAL_XY, y: INITIAL_XY })
  const [size, setSize] = useState({ w: 300, h: 200 })
  const [ready, setReady] = useState(false)
  const dragStart = useRef<{ x: number; y: number; startLeft: number; startTop: number } | null>(null)
  const resizeStart = useRef<{ x: number; y: number; startW: number; startH: number } | null>(null)

  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const img = imgRef.current
    if (!img) return
    img.onload = () => {
      const nw = img.naturalWidth
      const nh = img.naturalHeight
      const maxW = PREVIEW_W - INITIAL_XY * 2
      const maxH = PREVIEW_H - INITIAL_XY * 2
      let w = nw
      let h = nh
      if (w > maxW || h > maxH) {
        const r = Math.min(maxW / w, maxH / h)
        w = Math.round(w * r)
        h = Math.round(h * r)
      }
      setSize({ w: Math.max(MIN_SIZE, w), h: Math.max(MIN_SIZE, h) })
      setReady(true)
    }
  }, [imageDataUrl])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (dragStart.current) {
        const dx = e.clientX - dragStart.current.x
        const dy = e.clientY - dragStart.current.y
        setPos({
          x: Math.max(0, Math.min(PREVIEW_W - size.w, dragStart.current.startLeft + dx)),
          y: Math.max(0, Math.min(PREVIEW_H - size.h, dragStart.current.startTop + dy)),
        })
      } else if (resizeStart.current) {
        const dx = e.clientX - resizeStart.current.x
        const dy = e.clientY - resizeStart.current.y
        setSize((s) => ({
          w: Math.max(MIN_SIZE, Math.min(PREVIEW_W - pos.x, resizeStart.current!.startW + dx)),
          h: Math.max(MIN_SIZE, Math.min(PREVIEW_H - pos.y, resizeStart.current!.startH + dy)),
        }))
      }
    },
    [size.w, size.h, pos.x, pos.y]
  )

  const handleMouseUp = useCallback(() => {
    dragStart.current = null
    resizeStart.current = null
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove])

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove])

  const onImageMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-resize-handle]')) return
    e.preventDefault()
    dragStart.current = { x: e.clientX, y: e.clientY, startLeft: pos.x, startTop: pos.y }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const onResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    resizeStart.current = { x: e.clientX, y: e.clientY, startW: size.w, startH: size.h }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleConfirm = () => {
    onConfirm(imageDataUrl, pos.x, pos.y, size.w, size.h)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-[90vw] w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">붙여넣기 미리보기 — 위치와 크기를 조절한 뒤 보드에 넣으세요</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              취소
            </Button>
            <Button size="sm" onClick={handleConfirm}>
              보드에 넣기
            </Button>
          </div>
        </div>
        <div
          className="flex-1 overflow-hidden flex items-center justify-center p-4"
          style={{ minHeight: PREVIEW_H }}
        >
          <div
            className="relative bg-gray-100 rounded-lg border-2 border-dashed border-gray-300"
            style={{ width: PREVIEW_W, height: PREVIEW_H }}
          >
            <img
              ref={imgRef}
              src={imageDataUrl}
              alt="붙여넣기 미리보기"
              className="absolute select-none"
              style={
                ready
                  ? {
                      left: pos.x,
                      top: pos.y,
                      width: size.w,
                      height: size.h,
                      cursor: 'move',
                    }
                  : { width: 1, height: 1, opacity: 0, position: 'absolute', overflow: 'hidden' }
              }
              onMouseDown={ready ? onImageMouseDown : undefined}
              draggable={false}
            />
            {ready && (
              <div
                data-resize-handle
                className="absolute w-4 h-4 bg-[#1E2D5E] rounded cursor-se-resize border-2 border-white shadow"
                style={{
                  left: pos.x + size.w - 8,
                  top: pos.y + size.h - 8,
                }}
                onMouseDown={onResizeMouseDown}
                aria-label="크기 조절"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
