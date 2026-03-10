'use client'

/**
 * 눈금선: 평소에도 아주 조그맣게 표시.
 * 눈금 간격 = 화살표 기간 간격(TICK 150)과 동일. 확대/축소 시에만 비율 맞춤.
 * 목적: 화살표로 2기간/3기간 등을 정할 때 참고용. 동적 구성 없이 기본값만 사용.
 */
import { useWhiteboardStore } from '@/store/whiteboardStore'

/** 화살표(arrow-line)와 동일한 기간당 픽셀 — actuarialShapes.ts TICK */
const TICK_PX = 150
/** 기본 기간 개수 (0~10 → 10기간, 눈금 11개) */
const DEFAULT_PERIODS = 10
const RULER_HEIGHT = 18
const TICK_H = 4
const MARGIN = 8
const FONT = 'Pretendard, sans-serif'

export default function PeriodRuler({ className = '' }: { className?: string }) {
  const zoom = useWhiteboardStore((s) => s.zoom)
  const periods = DEFAULT_PERIODS
  const ticks = periods + 1
  const widthPx = ticks * TICK_PX * zoom
  const y = RULER_HEIGHT - 5
  const tickX = (i: number) => MARGIN + i * TICK_PX * zoom

  return (
    <div
      className={`flex-shrink-0 bg-gray-50/90 border-b border-gray-200 ${className}`}
      style={{ width: widthPx, height: RULER_HEIGHT, minHeight: RULER_HEIGHT }}
      aria-label="기간 눈금선 (화살표 간격 참고)"
    >
      <svg
        width={widthPx}
        height={RULER_HEIGHT}
        className="block"
      >
        <line
          x1={MARGIN}
          y1={y}
          x2={widthPx - MARGIN}
          y2={y}
          stroke="#9CA3AF"
          strokeWidth="1"
        />
        {Array.from({ length: ticks }, (_, i) => (
          <line
            key={i}
            x1={tickX(i)}
            y1={y - TICK_H}
            x2={tickX(i)}
            y2={y + TICK_H}
            stroke="#9CA3AF"
            strokeWidth="1"
          />
        ))}
        <text x={tickX(0)} y={y - TICK_H - 1} textAnchor="middle" fontFamily={FONT} fontSize="8" fill="#6B7280">0</text>
        <text x={tickX(periods)} y={y - TICK_H - 1} textAnchor="middle" fontFamily={FONT} fontSize="8" fill="#6B7280">{periods}</text>
      </svg>
    </div>
  )
}
