import type { Canvas as FabricCanvas } from 'fabric'

/** Fabric 캔버스가 toDataURL 등 내보내기 가능한 상태인지 확인 (ctx undefined 오류 방지) */
export function isCanvasExportReady(canvas: FabricCanvas): boolean {
  const c = canvas as unknown as { lowerCanvasEl?: HTMLCanvasElement; contextContainer?: CanvasRenderingContext2D }
  if (c.contextContainer) return true
  const el = c?.lowerCanvasEl
  if (!el || typeof el.getContext !== 'function') return false
  const ctx = el.getContext('2d')
  return Boolean(ctx)
}

export function exportCurrentPageAsPNG(canvas: FabricCanvas, boardName: string, pageIndex: number): void {
  if (!isCanvasExportReady(canvas)) return

  try {
    const dataURL = canvas.toDataURL({
      format: 'png',
      multiplier: 2,
      quality: 1,
    })

    const safeName = boardName.replace(/[^a-zA-Z0-9가-힣\s-_]/g, '').trim() || '화이트보드'
    const filename = `${safeName}-p${pageIndex + 1}.png`

    const a = document.createElement('a')
    a.href = dataURL
    a.download = filename
    a.click()
  } catch {
    // Fabric 내부 ctx 등 undefined 시 무시
  }
}

/** 선택된 개체를 이미지로 클립보드에 복사. 선택이 없거나 실패 시 false */
export async function copySelectionAsImageToClipboard(canvas: FabricCanvas): Promise<boolean> {
  if (!isCanvasExportReady(canvas)) return false
  const active = canvas.getActiveObject()
  if (!active) return false
  try {
    const rect = active.getBoundingRect(true)
    const pad = 2
    const left = Math.max(0, Math.floor(rect.left - pad))
    const top = Math.max(0, Math.floor(rect.top - pad))
    const width = Math.ceil(rect.width + pad * 2)
    const height = Math.ceil(rect.height + pad * 2)
    if (width <= 0 || height <= 0) return false
    const dataURL = canvas.toDataURL({
      format: 'png',
      multiplier: 2,
      quality: 1,
      left,
      top,
      width,
      height,
    })
    const res = await fetch(dataURL)
    const blob = await res.blob()
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    return true
  } catch {
    return false
  }
}

/** 현재 캔버스 내용을 썸네일용 data URL로 반환. 실패 시 빈 이미지 data URL 반환 */
export function generateThumbnail(canvas: FabricCanvas): string {
  if (!isCanvasExportReady(canvas)) return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

  try {
    canvas.requestRenderAll()
    return canvas.toDataURL({
      format: 'png',
      multiplier: 0.2,
      quality: 0.7,
    })
  } catch {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  }
}
