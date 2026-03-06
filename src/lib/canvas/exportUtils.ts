import type { Canvas as FabricCanvas } from 'fabric'

export function exportCurrentPageAsPNG(canvas: FabricCanvas, boardName: string, pageIndex: number): void {
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
}

export function generateThumbnail(canvas: FabricCanvas): string {
  return canvas.toDataURL({
    format: 'png',
    multiplier: 0.2,
    quality: 0.7,
  })
}
