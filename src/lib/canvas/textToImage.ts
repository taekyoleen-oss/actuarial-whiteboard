/**
 * 클립보드 텍스트를 이미지 data URL로 변환 (붙여넣기 미리보기/보드용)
 */
const PADDING = 24
const LINE_HEIGHT = 1.4
const MAX_WIDTH = 600
const FONT = '16px Pretendard, "Malgun Gothic", sans-serif'
const FILL = '#1a1a1a'
const BG = '#ffffff'

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  const paragraphs = text.split(/\r?\n/)
  for (const para of paragraphs) {
    if (para === '') {
      lines.push('')
      continue
    }
    const words = para.split(/(\s+)/)
    let current = ''
    for (let i = 0; i < words.length; i++) {
      const test = current + words[i]
      const m = ctx.measureText(test)
      if (m.width <= maxWidth) {
        current = test
      } else {
        if (current) lines.push(current.trimEnd())
        current = words[i]
      }
    }
    if (current) lines.push(current.trimEnd())
  }
  return lines
}

export function textToImageDataUrl(text: string): string {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  ctx.font = FONT
  const maxW = MAX_WIDTH - PADDING * 2
  const lines = wrapLines(ctx, text.trim(), maxW)
  const lineHeightPx = 16 * LINE_HEIGHT
  const height = PADDING * 2 + lines.length * lineHeightPx
  const width = MAX_WIDTH

  canvas.width = width
  canvas.height = height

  ctx.fillStyle = BG
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = FILL
  ctx.font = FONT
  ctx.textBaseline = 'top'
  lines.forEach((line, i) => {
    ctx.fillText(line, PADDING, PADDING + i * lineHeightPx, maxW)
  })

  return canvas.toDataURL('image/png')
}
