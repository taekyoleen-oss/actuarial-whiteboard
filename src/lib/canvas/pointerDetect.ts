/**
 * 포인터 타입 해상도 — PointerEvent 신호를 종합하여 'mouse' | 'pen' | 'touch' 판별
 *
 * 배경:
 *  - Active digitizer 펜 (Surface Pen, S Pen): pointerType === 'pen' → 바로 반환
 *  - 일반 정전식(capacitive) 스타일러스: pointerType === 'touch' 로 보고됨
 *    → pressure / tilt / 접촉 면적 신호로 펜 vs 손가락 추정
 *
 * 신호 우선순위:
 *  1. pressure: 대부분 브라우저에서 손가락은 0 또는 0.5(정규화), 정전식 스타일러스도 동일 → 약한 신호
 *  2. tiltX / tiltY: 스타일러스는 종종 소량의 기울기를 보고 (>= 1°)
 *  3. width × height: 손가락 접촉은 넓고 (보통 > 100 px²), 펜 끝은 좁음
 *
 * 주의: 정전식 스타일러스와 손가락을 100% 구별하는 것은 OS/하드웨어 레벨 지원이 없으면
 *        소프트웨어로 완전히 불가능합니다. 이 함수는 최선의 추정치를 제공합니다.
 */

export interface PointerSignals {
  rawType: string     // pointerType 원본 ('pen' | 'mouse' | 'touch')
  pressure: number
  tiltX: number
  tiltY: number
  width: number
  height: number
  resolvedType: 'mouse' | 'pen' | 'touch'
  penScore: number    // 0~100, 클수록 펜일 가능성 높음
}

export function analyzePointer(e: PointerEvent): PointerSignals {
  const rawType = e.pointerType

  if (rawType === 'pen')   return { rawType, pressure: e.pressure, tiltX: e.tiltX, tiltY: e.tiltY, width: e.width, height: e.height, resolvedType: 'pen', penScore: 100 }
  if (rawType === 'mouse') return { rawType, pressure: e.pressure, tiltX: e.tiltX, tiltY: e.tiltY, width: e.width, height: e.height, resolvedType: 'mouse', penScore: 0 }

  // pointerType === 'touch' — 복합 신호로 펜 점수 계산
  const pressure = e.pressure ?? 0
  const tiltX    = Math.abs(e.tiltX ?? 0)
  const tiltY    = Math.abs(e.tiltY ?? 0)
  const w        = e.width  ?? 20
  const h        = e.height ?? 20
  const area     = w * h

  let score = 0

  // ★ 기울기 신호 (1차 기준) — 펜은 기울기가 존재하고 손/마우스는 0
  // 기울기가 1° 이상이면 펜으로 확정 (score 70+)
  if (tiltX >= 1 || tiltY >= 1) score += 70

  // 압력 신호 (2차 보조)
  if (pressure === 0) score += 15
  else if (pressure > 0 && pressure < 0.4) score += 5

  // 접촉 면적 신호 (3차 보조)
  if (area <= 25)       score += 15
  else if (area <= 100) score += 8

  const resolvedType = score >= 40 ? 'pen' : 'touch'

  return { rawType, pressure, tiltX: e.tiltX ?? 0, tiltY: e.tiltY ?? 0, width: w, height: h, resolvedType, penScore: score }
}

/** 간단한 타입만 필요할 때 사용 */
export function resolvePointerType(e: PointerEvent): 'mouse' | 'pen' | 'touch' {
  return analyzePointer(e).resolvedType
}
