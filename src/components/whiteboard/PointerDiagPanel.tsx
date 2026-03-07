'use client'

import { useEffect, useState } from 'react'
import { analyzePointer, PointerSignals } from '@/lib/canvas/pointerDetect'

interface Props {
  onClose: () => void
}

const TYPE_STYLE: Record<string, string> = {
  mouse: 'bg-gray-100 text-gray-700',
  pen:   'bg-blue-100 text-blue-700',
  touch: 'bg-orange-100 text-orange-700',
}
const TYPE_LABEL: Record<string, string> = {
  mouse: '마우스',
  pen:   '펜',
  touch: '손(터치)',
}

export default function PointerDiagPanel({ onClose }: Props) {
  const [cur, setCur] = useState<PointerSignals | null>(null)
  const [history, setHistory] = useState<PointerSignals[]>([])

  useEffect(() => {
    const handle = (e: PointerEvent) => {
      const s = analyzePointer(e)
      setCur(s)
      setHistory(prev => [s, ...prev].slice(0, 6))
    }
    window.addEventListener('pointerdown', handle, true)
    window.addEventListener('pointermove', handle, true)
    return () => {
      window.removeEventListener('pointerdown', handle, true)
      window.removeEventListener('pointermove', handle, true)
    }
  }, [])

  return (
    <div className="fixed bottom-12 right-4 z-50 w-72 bg-white border border-gray-200 rounded-xl shadow-2xl text-xs font-mono select-none">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50 rounded-t-xl">
        <span className="font-semibold text-[11px] text-gray-700">포인터 진단</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-base leading-none px-1">✕</button>
      </div>

      {cur ? (
        <div className="p-3 space-y-2.5">
          {/* 판별 결과 */}
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${TYPE_STYLE[cur.resolvedType]}`}>
              {TYPE_LABEL[cur.resolvedType]}
            </span>
            <span className="text-gray-400 text-[10px]">rawType: {cur.rawType}</span>
          </div>

          {/* 신호 테이블 */}
          <table className="w-full">
            <tbody>
              {([
                ['pressure',  cur.pressure.toFixed(4)],
                ['tiltX',     cur.tiltX + '°'],
                ['tiltY',     cur.tiltY + '°'],
                ['width',     cur.width.toFixed(1) + ' px'],
                ['height',    cur.height.toFixed(1) + ' px'],
                ['penScore',  String(cur.penScore) + ' / 100'],
              ] as [string, string][]).map(([k, v]) => (
                <tr key={k} className="border-b border-gray-50">
                  <td className="py-0.5 pr-3 text-gray-400 w-20">{k}</td>
                  <td className={`py-0.5 font-semibold ${
                    k === 'penScore'
                      ? cur.penScore >= 70 ? 'text-blue-600'
                      : cur.penScore >= 40 ? 'text-blue-400'
                      : 'text-orange-500'
                      : 'text-gray-700'
                  }`}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* penScore 게이지 */}
          <div>
            <div className="flex justify-between text-[9px] text-gray-400 mb-0.5">
              <span>터치 (0)</span>
              <span>임계 (40)</span>
              <span>펜 (100)</span>
            </div>
            <div className="relative h-2.5 rounded-full bg-gray-100 overflow-hidden">
              {/* 임계선 */}
              <div className="absolute top-0 bottom-0 w-px bg-gray-400 opacity-50" style={{ left: '40%' }} />
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  cur.penScore >= 40 ? 'bg-blue-500' : 'bg-orange-400'
                }`}
                style={{ width: `${Math.min(cur.penScore, 100)}%` }}
              />
            </div>
          </div>

          {/* 이벤트 히스토리 */}
          <div className="border-t border-gray-100 pt-2">
            <div className="text-[9px] text-gray-400 mb-1">최근 이벤트 (최대 6)</div>
            <div className="space-y-0.5">
              {history.map((s, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-1 px-1 py-0.5 rounded text-[9px] ${i === 0 ? 'bg-gray-50' : ''}`}
                >
                  <span className={`w-10 text-center rounded-full font-bold ${TYPE_STYLE[s.resolvedType]}`}>
                    {s.resolvedType}
                  </span>
                  <span className="text-gray-400">raw:{s.rawType}</span>
                  <span className="text-gray-400">p:{s.pressure.toFixed(2)}</span>
                  <span className="text-gray-400">tX:{s.tiltX}°</span>
                  <span className={s.penScore >= 40 ? 'text-blue-500 font-semibold' : 'text-orange-400 font-semibold'}>
                    {s.penScore}pt
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5 text-center text-gray-400 text-[11px]">
          캔버스에서 마우스 / 펜 / 손으로<br />입력해 보세요
        </div>
      )}
    </div>
  )
}
