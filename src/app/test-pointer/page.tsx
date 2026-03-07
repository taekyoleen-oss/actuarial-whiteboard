'use client'

import { useEffect, useRef, useState } from 'react'
import { analyzePointer, PointerSignals } from '@/lib/canvas/pointerDetect'

interface EventLog {
  id: number
  type: string
  sig: PointerSignals
  ts: number
}

let idCounter = 0

export default function PointerTestPage() {
  const [logs, setLogs] = useState<EventLog[]>([])
  const [latest, setLatest] = useState<PointerSignals | null>(null)
  const divRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = divRef.current
    if (!el) return

    const handler = (e: PointerEvent) => {
      e.preventDefault()
      const sig = analyzePointer(e)
      setLatest(sig)
      if (e.type === 'pointerdown' || e.type === 'pointerup') {
        setLogs(prev => [
          { id: idCounter++, type: e.type, sig, ts: Date.now() },
          ...prev.slice(0, 49),
        ])
      }
    }

    el.addEventListener('pointerdown', handler, { passive: false })
    el.addEventListener('pointermove', handler, { passive: false })
    el.addEventListener('pointerup', handler, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', handler)
      el.removeEventListener('pointermove', handler)
      el.removeEventListener('pointerup', handler)
    }
  }, [])

  const typeColor = (t: string) => {
    if (t === 'pen')   return 'text-blue-400'
    if (t === 'touch') return 'text-orange-400'
    return 'text-gray-400'
  }

  const resolvedBadge = (r: string) => {
    if (r === 'pen')   return 'bg-blue-600 text-white'
    if (r === 'touch') return 'bg-orange-500 text-white'
    return 'bg-gray-600 text-white'
  }

  return (
    <div className="min-h-screen bg-gray-950 text-sm font-mono text-gray-200 flex flex-col p-4 gap-4">
      <h1 className="text-lg font-bold text-white">Pointer 압력 테스트</h1>
      <p className="text-gray-400 text-xs">아래 터치 패드에 손가락 / 펜을 대보세요. 실시간 신호가 표시됩니다.</p>

      {/* Touch area */}
      <div
        ref={divRef}
        className="w-full h-48 rounded-xl border-2 border-dashed border-gray-600 bg-gray-900 flex items-center justify-center select-none touch-none cursor-crosshair"
        style={{ touchAction: 'none' }}
      >
        <span className="text-gray-600 pointer-events-none">여기에 터치 / 펜 입력</span>
      </div>

      {/* Live signals */}
      {latest && (
        <div className="rounded-xl bg-gray-900 border border-gray-700 p-4 grid grid-cols-2 gap-x-8 gap-y-1">
          <div className="col-span-2 text-xs text-gray-500 mb-1">실시간 신호 (pointermove)</div>
          <Row label="rawType"      value={latest.rawType}      cls={typeColor(latest.rawType)} />
          <Row label="resolvedType" value={latest.resolvedType} cls={`font-bold ${typeColor(latest.resolvedType)}`} />
          <Row label="penScore"     value={`${latest.penScore} / 100`} cls={latest.penScore >= 40 ? 'text-blue-300' : 'text-orange-300'} />
          <Row label="pressure"     value={latest.pressure.toFixed(4)} />
          <Row label="tiltX"        value={`${latest.tiltX}°`} cls={Math.abs(latest.tiltX) >= 1 ? 'text-yellow-300' : ''} />
          <Row label="tiltY"        value={`${latest.tiltY}°`} cls={Math.abs(latest.tiltY) >= 1 ? 'text-yellow-300' : ''} />
          <Row label="width"        value={`${latest.width.toFixed(1)} px`} />
          <Row label="height"       value={`${latest.height.toFixed(1)} px`} />
          <Row label="area"         value={`${(latest.width * latest.height).toFixed(1)} px²`}
               cls={(latest.width * latest.height) <= 25 ? 'text-blue-300' : 'text-orange-300'} />
          <div className="col-span-2 mt-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${resolvedBadge(latest.resolvedType)}`}>
              {latest.resolvedType === 'pen' ? '펜으로 판정' : latest.resolvedType === 'touch' ? '손가락(터치)으로 판정' : 'Mouse'}
            </span>
          </div>
        </div>
      )}

      {/* Event log */}
      <div className="rounded-xl bg-gray-900 border border-gray-700 p-4 overflow-auto max-h-72">
        <div className="text-xs text-gray-500 mb-2">이벤트 로그 (pointerdown / pointerup)</div>
        {logs.length === 0 && <div className="text-gray-600 text-xs">아직 입력 없음</div>}
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-gray-500">
              <th className="text-left pr-3">이벤트</th>
              <th className="text-left pr-3">rawType</th>
              <th className="text-left pr-3">resolved</th>
              <th className="text-left pr-3">score</th>
              <th className="text-left pr-3">pressure</th>
              <th className="text-left pr-3">tiltX</th>
              <th className="text-left pr-3">tiltY</th>
              <th className="text-left pr-3">area(px²)</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} className="border-t border-gray-800">
                <td className={`pr-3 ${log.type === 'pointerdown' ? 'text-green-400' : 'text-red-400'}`}>{log.type}</td>
                <td className={`pr-3 ${typeColor(log.sig.rawType)}`}>{log.sig.rawType}</td>
                <td className={`pr-3 font-bold ${typeColor(log.sig.resolvedType)}`}>{log.sig.resolvedType}</td>
                <td className={`pr-3 ${log.sig.penScore >= 40 ? 'text-blue-300' : 'text-orange-300'}`}>{log.sig.penScore}</td>
                <td className="pr-3">{log.sig.pressure.toFixed(4)}</td>
                <td className={`pr-3 ${Math.abs(log.sig.tiltX) >= 1 ? 'text-yellow-300' : ''}`}>{log.sig.tiltX}°</td>
                <td className={`pr-3 ${Math.abs(log.sig.tiltY) >= 1 ? 'text-yellow-300' : ''}`}>{log.sig.tiltY}°</td>
                <td className="pr-3">{(log.sig.width * log.sig.height).toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-600">
        판정 기준: tilt ≥ 1° → +70점 / pressure=0 → +15점 / area ≤ 25px² → +15점 / 합계 ≥ 40 = pen
      </div>
    </div>
  )
}

function Row({ label, value, cls = '' }: { label: string; value: string; cls?: string }) {
  return (
    <>
      <span className="text-gray-500">{label}</span>
      <span className={cls || 'text-gray-200'}>{value}</span>
    </>
  )
}
