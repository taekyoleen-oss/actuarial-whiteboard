import { TimelineConfig, TimelineType } from '@/types/actuarial'

const W = 480
const H = 120
const ARROW_Y = 60
const TICK_H = 14
const FONT = '14px "Pretendard", sans-serif'
const FONT_BOLD = 'bold 14px "Pretendard", sans-serif'

function arrowLine(x1: number, y: number, x2: number): string {
  const ah = 8
  const aw = 5
  return `
    <line x1="${x1}" y1="${y}" x2="${x2 - ah}" y2="${y}" stroke="#1A1A1A" stroke-width="2"/>
    <polygon points="${x2},${y} ${x2 - ah},${y - aw} ${x2 - ah},${y + aw}" fill="#1A1A1A"/>
  `
}

function tick(x: number, y: number): string {
  return `<line x1="${x}" y1="${y - TICK_H / 2}" x2="${x}" y2="${y + TICK_H / 2}" stroke="#1A1A1A" stroke-width="2"/>`
}

function label(x: number, y: number, text: string, anchor: string = 'middle', dy: number = 0): string {
  return `<text x="${x}" y="${y + dy}" text-anchor="${anchor}" font-family="Pretendard, sans-serif" font-size="13" fill="#1A1A1A">${text}</text>`
}

function annotation(x: number, y: number, text: string, anchor: string = 'middle'): string {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Pretendard, sans-serif" font-size="12" fill="#555">${text}</text>`
}

export function generateTimelineSVG(config: TimelineConfig): string {
  const { type, startLabel, endLabel, midLabel, annotations = [], scale } = config

  let body = ''
  const x0 = 40
  const x1 = W - 40

  switch (type) {
    case 'insurance-period': {
      body = `
        ${arrowLine(x0, ARROW_Y, x1)}
        ${tick(x0, ARROW_Y)}
        ${label(x0, ARROW_Y + 24, startLabel)}
        ${label(x1, ARROW_Y + 24, endLabel)}
        ${annotation((x0 + x1) / 2, ARROW_Y - 18, annotations[0] ?? '보험기간')}
      `
      break
    }
    case 'payment-period': {
      const xMid = x0 + (x1 - x0) * 0.5
      body = `
        ${arrowLine(x0, ARROW_Y, x1)}
        ${tick(x0, ARROW_Y)}
        ${tick(xMid, ARROW_Y)}
        ${label(x0, ARROW_Y + 24, startLabel)}
        ${label(xMid, ARROW_Y + 24, midLabel ?? 'x+m')}
        ${label(x1, ARROW_Y + 24, endLabel)}
        ${annotation((x0 + xMid) / 2, ARROW_Y - 18, annotations[0] ?? '납입기간')}
        ${annotation((xMid + x1) / 2, ARROW_Y - 18, annotations[1] ?? '보험기간')}
      `
      break
    }
    case 'survival-death': {
      const xMid = x0 + (x1 - x0) * 0.45
      const yUp = ARROW_Y - 28
      const yDown = ARROW_Y + 28
      body = `
        <line x1="${x0}" y1="${ARROW_Y}" x2="${xMid}" y2="${ARROW_Y}" stroke="#1A1A1A" stroke-width="2"/>
        ${tick(x0, ARROW_Y)}
        ${label(x0, ARROW_Y + 24, startLabel)}
        <line x1="${xMid}" y1="${ARROW_Y}" x2="${xMid}" y2="${yUp}" stroke="#1A1A1A" stroke-width="1.5" stroke-dasharray="4,3"/>
        <line x1="${xMid}" y1="${ARROW_Y}" x2="${xMid}" y2="${yDown}" stroke="#1A1A1A" stroke-width="1.5" stroke-dasharray="4,3"/>
        ${arrowLine(xMid, yUp, x1)}
        ${arrowLine(xMid, yDown, x1)}
        ${label(x1 + 4, yUp + 5, annotations[0] ?? '사망', 'start')}
        ${label(x1 + 4, yDown + 5, annotations[1] ?? '생존', 'start')}
        ${label(x1 - 4, yUp + 5, endLabel, 'end')}
      `
      break
    }
    case 'deferred-annuity': {
      const xMid = x0 + (x1 - x0) * 0.45
      body = `
        ${arrowLine(x0, ARROW_Y, x1)}
        ${tick(x0, ARROW_Y)}
        ${tick(xMid, ARROW_Y)}
        ${label(x0, ARROW_Y + 24, startLabel)}
        ${label(xMid, ARROW_Y + 24, midLabel ?? 'x+m')}
        ${label(x1, ARROW_Y + 24, endLabel)}
        ${annotation((x0 + xMid) / 2, ARROW_Y - 18, annotations[0] ?? '거치기간')}
        ${annotation((xMid + x1) / 2, ARROW_Y - 18, annotations[1] ?? '연금지급')}
      `
      break
    }
    case 'whole-life': {
      body = `
        ${arrowLine(x0, ARROW_Y, x1)}
        ${tick(x0, ARROW_Y)}
        ${label(x0, ARROW_Y + 24, startLabel)}
        ${label(x1 - 4, ARROW_Y + 24, '∞', 'end')}
        ${annotation((x0 + x1) / 2, ARROW_Y - 18, annotations[0] ?? '종신보험기간')}
      `
      break
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`
}

// ─────────────────────────────────────────────
// 자동 배치용 SVG 생성 함수
// ─────────────────────────────────────────────

/**
 * 화살표 — 드래그 폭 기반, 기간 레이블 포함
 * pixelWidth: 드래그 거리(px)
 * range: Math.round((pixelWidth - 20) / TICK), 0이면 레이블 없음
 */
export function generateArrowLineSVG(pixelWidth: number, range: number): string {
  const TICK = 94   // 숫자선과 동일 간격
  const hasTicks = range >= 1
  const h = hasTicks ? 68 : 40
  const ay = 20
  const x0 = 10
  const x1 = pixelWidth - 10
  const ah = 10
  const aw = 6
  const TH = 12
  const FONT = 'Pretendard,sans-serif'

  function tickSVG(x: number, lbl: string): string {
    return `<line x1="${x}" y1="${ay - TH}" x2="${x}" y2="${ay + TH}" stroke="#1A1A1A" stroke-width="2"/>` +
      `<text x="${x}" y="${ay + TH + 16}" text-anchor="middle" font-family="${FONT}" font-size="13" fill="#1A1A1A">${lbl}</text>`
  }

  const lineEnd = x1 - ah

  if (!hasTicks) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${pixelWidth}" height="${h}" viewBox="0 0 ${pixelWidth} ${h}">
      <line x1="${x0}" y1="${ay}" x2="${lineEnd}" y2="${ay}" stroke="#1A1A1A" stroke-width="2.5"/>
      <polygon points="${x1},${ay} ${lineEnd},${ay - aw} ${lineEnd},${ay + aw}" fill="#1A1A1A"/>
    </svg>`
  }

  if (range <= 4) {
    let ticksSVG = ''
    for (let i = 0; i <= range; i++) {
      ticksSVG += tickSVG(x0 + i * TICK, String(i))
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${pixelWidth}" height="${h}" viewBox="0 0 ${pixelWidth} ${h}">
      <line x1="${x0}" y1="${ay}" x2="${lineEnd}" y2="${ay}" stroke="#1A1A1A" stroke-width="2.5"/>
      <polygon points="${x1},${ay} ${lineEnd},${ay - aw} ${lineEnd},${ay + aw}" fill="#1A1A1A"/>
      ${ticksSVG}
    </svg>`
  }

  // range >= 5: 앞 3 + ··· + 뒤 3
  const l0 = x0, l1 = x0 + TICK, l2 = x0 + 2 * TICK
  const r0 = lineEnd, r1 = lineEnd - TICK, r2 = lineEnd - 2 * TICK
  const dotsX0 = l2 + 16
  const dotsX1 = r2 - 16

  const ticksSVG = [
    tickSVG(l0, '0'), tickSVG(l1, '1'), tickSVG(l2, '2'),
    tickSVG(r2, String(range - 2)), tickSVG(r1, String(range - 1)), tickSVG(r0, String(range)),
  ].join('')

  const dotsSVG = `<line x1="${dotsX0}" y1="${ay}" x2="${dotsX1}" y2="${ay}" stroke="#aaa" stroke-width="2" stroke-dasharray="5,6"/>
    <text x="${(dotsX0 + dotsX1) / 2}" y="${ay + 5}" text-anchor="middle" font-family="${FONT}" font-size="18" fill="#888">···</text>`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pixelWidth}" height="${h}" viewBox="0 0 ${pixelWidth} ${h}">
    <line x1="${x0}" y1="${ay}" x2="${dotsX0}" y2="${ay}" stroke="#1A1A1A" stroke-width="2.5"/>
    ${dotsSVG}
    <line x1="${dotsX1}" y1="${ay}" x2="${lineEnd}" y2="${ay}" stroke="#1A1A1A" stroke-width="2.5"/>
    <polygon points="${x1},${ay} ${lineEnd},${ay - aw} ${lineEnd},${ay + aw}" fill="#1A1A1A"/>
    ${ticksSVG}
  </svg>`
}

/**
 * 숫자 눈금 타임라인 — 스마트 레이블
 *
 * startStr / endStr 규칙:
 *   숫자 문자열 → 정수로 파싱
 *   "-"         → 무한대 (왼쪽 -∞ / 오른쪽 ∞)
 *   "n"         → 기호 n (오른쪽 레이블: n-2, n-1, n)
 *
 * 레이블 표시 전략:
 *   범위 ≤ 4   → 전체 레이블 표시 (start, ..., end)
 *   범위 ≥ 5   → 앞 3개 + ··· + 뒤 3개
 *   end="n"    → 앞 3개 (start, start+1, start+2) + ··· + (n-2, n-1, n)
 *   start="-"  → -∞ 화살표 + 뒤 3개
 *   end="-"    → 앞 3개 + ∞ 화살표
 */
export function generateNumberLineSVG(startStr: string, endStr: string): string {
  const TICK = 94    // tick spacing (px) — 1.3×
  const AY = 34     // arrowY
  const TH = 16     // tick half-height
  const AH = 13     // arrowhead length
  const AW = 8      // arrowhead half-width
  const H = 88      // SVG height
  const FONT = 'Pretendard,sans-serif'

  const isStartInf = startStr.trim() === '-'
  const isEndInf = endStr.trim() === '-'
  const isEndN = endStr.trim().toLowerCase() === 'n'

  const startNum = isStartInf ? 0 : (parseInt(startStr) || 0)
  const endNum = (isEndInf || isEndN) ? startNum + 10 : (parseInt(endStr) || 10)

  // Determine label arrays
  let leftLabels: string[] = []
  let rightLabels: string[] = []
  let hasDots = false

  if (isStartInf && isEndInf) {
    leftLabels = []
    rightLabels = []
    hasDots = true
  } else if (isStartInf) {
    // left is -∞; show right 3 ticks
    const e = isEndN ? null : endNum
    rightLabels = isEndN
      ? ['n-2', 'n-1', 'n']
      : [String(e! - 2), String(e! - 1), String(e!)]
    hasDots = true
  } else if (isEndInf) {
    // right is ∞; show left 3 ticks
    leftLabels = [String(startNum), String(startNum + 1), String(startNum + 2)]
    hasDots = true
  } else if (isEndN) {
    leftLabels = [String(startNum), String(startNum + 1), String(startNum + 2)]
    rightLabels = ['n-2', 'n-1', 'n']
    hasDots = true
  } else {
    const range = endNum - startNum
    if (range <= 4) {
      // Show all
      leftLabels = Array.from({ length: range + 1 }, (_, i) => String(startNum + i))
      hasDots = false
    } else {
      leftLabels = [String(startNum), String(startNum + 1), String(startNum + 2)]
      rightLabels = [String(endNum - 2), String(endNum - 1), String(endNum)]
      hasDots = true
    }
  }

  function tickSVG(x: number, label: string): string {
    return `<line x1="${x}" y1="${AY - TH}" x2="${x}" y2="${AY + TH}" stroke="#1A1A1A" stroke-width="2"/>` +
      `<text x="${x}" y="${AY + TH + 18}" text-anchor="middle" font-family="${FONT}" font-size="13" fill="#1A1A1A">${label}</text>`
  }

  if (!hasDots) {
    // Simple: all labels evenly spaced
    const periods = leftLabels.length - 1
    const x0 = 36
    const x1 = x0 + TICK * periods + 24
    const W = x1 + 20
    const ticksSVG = leftLabels.map((l, i) => tickSVG(x0 + i * TICK, l)).join('')
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <line x1="${x0}" y1="${AY}" x2="${x1 - AH}" y2="${AY}" stroke="#1A1A1A" stroke-width="2.5"/>
      <polygon points="${x1},${AY} ${x1 - AH},${AY - AW} ${x1 - AH},${AY + AW}" fill="#1A1A1A"/>
      ${ticksSVG}
    </svg>`
  }

  // Complex: left section + dots + right section
  const lCount = leftLabels.length
  const rCount = rightLabels.length
  const DOTS_W = 94  // width of the dots section — 1.3×
  const MARGIN = 47

  // X positions for left ticks
  const lX0 = isStartInf ? MARGIN + 14 : MARGIN
  const lXEnd = lCount > 0 ? lX0 + (lCount - 1) * TICK : lX0

  // Dots section
  const dotsX0 = lXEnd + (lCount > 0 ? 18 : 0)
  const dotsX1 = dotsX0 + DOTS_W

  // Right ticks
  const rX0 = dotsX1 + (rCount > 0 ? 18 : 0)
  const rXEnd = rCount > 0 ? rX0 + (rCount - 1) * TICK : rX0

  const arrowEndX = rXEnd + 24
  const W = arrowEndX + (isEndInf ? 28 : 16)

  // Ticks SVG
  const leftTicksSVG = leftLabels.map((l, i) => tickSVG(lX0 + i * TICK, l)).join('')
  const rightTicksSVG = rightLabels.map((l, i) => tickSVG(rX0 + i * TICK, l)).join('')

  // Left infinity arrow
  const infLeftSVG = isStartInf
    ? `<polygon points="${MARGIN},${AY} ${MARGIN + AH},${AY - AW} ${MARGIN + AH},${AY + AW}" fill="#1A1A1A"/>
       <text x="${MARGIN - 4}" y="${AY + 5}" text-anchor="end" font-family="${FONT}" font-size="14" fill="#1A1A1A">-∞</text>`
    : ''

  // Right end: arrow head + optional ∞ label
  const infRightSVG = isEndInf
    ? `<text x="${arrowEndX + 4}" y="${AY + 5}" text-anchor="start" font-family="${FONT}" font-size="14" fill="#1A1A1A">∞</text>`
    : ''

  // Main lines (split around dots)
  const lineStart = isStartInf ? MARGIN + AH : lX0
  const lineLeftEnd = lCount > 0 ? lXEnd + 12 : dotsX0
  const lineRightStart = rCount > 0 ? rX0 - 12 : dotsX1

  const dotsSVG = `<line x1="${dotsX0}" y1="${AY}" x2="${dotsX1}" y2="${AY}" stroke="#aaa" stroke-width="2" stroke-dasharray="5,6"/>
    <text x="${(dotsX0 + dotsX1) / 2}" y="${AY + 5}" text-anchor="middle" font-family="${FONT}" font-size="18" fill="#888">···</text>`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${lCount > 0 ? `<line x1="${lineStart}" y1="${AY}" x2="${lineLeftEnd}" y2="${AY}" stroke="#1A1A1A" stroke-width="2.5"/>` : ''}
    ${dotsSVG}
    ${rCount > 0 ? `<line x1="${lineRightStart}" y1="${AY}" x2="${arrowEndX - AH}" y2="${AY}" stroke="#1A1A1A" stroke-width="2.5"/>` : ''}
    <polygon points="${arrowEndX},${AY} ${arrowEndX - AH},${AY - AW} ${arrowEndX - AH},${AY + AW}" fill="#1A1A1A"/>
    ${infLeftSVG}
    ${infRightSVG}
    ${leftTicksSVG}
    ${rightTicksSVG}
  </svg>`
}

export const TIMELINE_DEFAULTS: Record<TimelineType, Partial<TimelineConfig>> = {
  'insurance-period': { startLabel: 'x', endLabel: 'x+n', annotations: ['보험기간'] },
  'payment-period': { startLabel: 'x', midLabel: 'x+m', endLabel: 'x+n', annotations: ['납입기간', '보험기간'] },
  'survival-death': { startLabel: 'x', endLabel: 'K+1', annotations: ['사망', '생존'] },
  'deferred-annuity': { startLabel: 'x', midLabel: 'x+m', endLabel: 'x+n', annotations: ['거치기간', '연금지급'] },
  'whole-life': { startLabel: 'x', endLabel: '∞', annotations: ['종신보험기간'] },
}
