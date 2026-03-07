'use client'

import { useCallback, useRef, useState } from 'react'
import { useWhiteboardStore } from '@/store/whiteboardStore'

type JsKey =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '00' | '.'
  | '+' | '-' | '×' | '÷' | '='
  | 'AC' | 'C' | 'DEL' | '±' | '%' | '√'
  | 'MC' | 'MR' | 'M+' | 'M-' | 'GT' | 'TAX+' | 'TAX-'

const ROWS: JsKey[][] = [
  ['GT',   'MC',  'MR',  'M-',  'M+' ],
  ['TAX-', 'TAX+','%',   '√',   'C'  ],
  ['7',    '8',   '9',   'DEL', 'AC' ],
  ['4',    '5',   '6',   '×',   '÷'  ],
  ['1',    '2',   '3',   '+',   '-'  ],
  ['0',    '00',  '.',   '±',   '='  ],
]

const TAX_RATE = 10   // 10%

// 숫자를 최대 14자리, 3자리 콤마 포맷으로 변환
function fmtNum(n: number): string {
  if (!isFinite(n)) return 'E'
  const s = +n.toPrecision(14)
  const str = String(s)
  const [int, dec] = str.split('.')
  const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return dec !== undefined ? `${intFmt}.${dec}` : intFmt
}

function calc(a: number, op: string, b: number): number {
  switch (op) {
    case '+': return a + b
    case '-': return a - b
    case '×': return a * b
    case '÷': return b === 0 ? NaN : a / b
    default:  return b
  }
}

export default function JS40BCalculator() {
  const { isJS40BOpen } = useWhiteboardStore()

  // 현재 입력 중인 숫자 문자열 (콤마 없음)
  const [num, setNum]           = useState('0')
  // 연산자 누른 직후 다음 입력이 새 숫자를 시작하는지 여부
  const [reset, setReset]       = useState(false)
  // 대기 중인 왼쪽 피연산자와 연산자
  const [acc, setAcc]           = useState<number | null>(null)
  const [pendingOp, setPendingOp] = useState<string | null>(null)
  // = 반복 시 사용할 상수 연산
  const [constOp, setConstOp]   = useState<{ op: string; val: number } | null>(null)
  // 메모리
  const [memory, setMemory]     = useState(0)
  const [memOn, setMemOn]       = useState(false)
  // GT (Grand Total): = 결과의 누계
  const [gt, setGt]             = useState(0)
  // 오퍼레이터 표시용
  const [opLabel, setOpLabel]   = useState('')

  // 드래그
  const [isDragging, setIsDragging] = useState(false)
  const [pos, setPos]           = useState(() => ({
    x: typeof window !== 'undefined' ? window.innerWidth - 320 : 900,
    y: 80,
  }))
  const dragOffset              = useRef({ x: 0, y: 0 })

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true)
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
  }, [pos])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y })
  }, [isDragging])

  const handleMouseUp = useCallback(() => setIsDragging(false), [])

  function getCur(): number { return parseFloat(num) || 0 }

  function press(key: JsKey) {
    const cur = getCur()

    // 숫자 입력
    if ('0123456789'.includes(key as string)) {
      if (reset) {
        setNum(key as string)
        setReset(false)
      } else {
        const next = num === '0' ? (key as string) : num + key
        if (next.replace('.', '').replace('-', '').length <= 14) setNum(next)
      }
      return
    }

    switch (key) {
      case '00': {
        if (reset) { setNum('0'); setReset(false); return }
        if (num === '0') return
        const next = num + '00'
        if (next.replace('.', '').replace('-', '').length <= 14) setNum(next)
        break
      }
      case '.': {
        if (reset) { setNum('0.'); setReset(false); return }
        if (!num.includes('.')) setNum(num + '.')
        break
      }
      case 'DEL': {
        if (reset) break
        const next = num.slice(0, -1)
        setNum(next === '' || next === '-' ? '0' : next)
        break
      }
      case 'AC': {
        setNum('0'); setReset(false)
        setAcc(null); setPendingOp(null)
        setConstOp(null); setGt(0); setOpLabel('')
        break
      }
      case 'C': {
        setNum('0'); setReset(false)
        break
      }
      case '±': {
        if (num === '0') break
        setNum(num.startsWith('-') ? num.slice(1) : '-' + num)
        break
      }
      case '%': {
        const result = (acc !== null && pendingOp)
          ? acc * cur / 100
          : cur / 100
        setNum(fmtNum(result).replace(/,/g, ''))
        setReset(true)
        break
      }
      case '√': {
        const result = Math.sqrt(cur)
        setNum(fmtNum(result).replace(/,/g, ''))
        setReset(true); setConstOp(null)
        break
      }
      case '+': case '-': case '×': case '÷': {
        // 대기 중인 연산이 있으면 먼저 계산
        if (acc !== null && pendingOp && !reset) {
          const result = calc(acc, pendingOp, cur)
          const r = fmtNum(result).replace(/,/g, '')
          setNum(r); setAcc(result)
        } else {
          setAcc(cur)
        }
        setPendingOp(key); setReset(true); setConstOp(null)
        setOpLabel(key)
        break
      }
      case '=': {
        let result: number
        if (pendingOp && acc !== null) {
          // 일반 계산
          result = calc(acc, pendingOp, cur)
          setConstOp({ op: pendingOp, val: cur })
          setAcc(null); setPendingOp(null); setOpLabel('')
        } else if (constOp) {
          // = 반복: 상수 연산 (예: 5 × = = = …)
          result = calc(cur, constOp.op, constOp.val)
        } else {
          result = cur
        }
        const r = fmtNum(result).replace(/,/g, '')
        setNum(r); setReset(true)
        setGt(g => g + result)
        break
      }
      case 'GT': {
        setNum(fmtNum(gt).replace(/,/g, ''))
        setReset(true)
        break
      }
      case 'MC': {
        setMemory(0); setMemOn(false)
        break
      }
      case 'MR': {
        setNum(fmtNum(memory).replace(/,/g, ''))
        setReset(true)
        break
      }
      case 'M+': {
        const m = memory + cur; setMemory(m); setMemOn(m !== 0); setReset(true)
        break
      }
      case 'M-': {
        const m = memory - cur; setMemory(m); setMemOn(m !== 0); setReset(true)
        break
      }
      case 'TAX+': {
        setNum(fmtNum(cur * (1 + TAX_RATE / 100)).replace(/,/g, ''))
        setReset(true)
        break
      }
      case 'TAX-': {
        setNum(fmtNum(cur / (1 + TAX_RATE / 100)).replace(/,/g, ''))
        setReset(true)
        break
      }
    }
  }

  if (!isJS40BOpen) return null

  // 디스플레이용 포맷 (콤마 적용)
  const displayVal = (() => {
    const n = parseFloat(num)
    if (isNaN(n)) return num
    const [int, dec] = num.split('.')
    const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return dec !== undefined ? `${intFmt}.${dec}` : intFmt
  })()

  function btnClass(key: JsKey): string {
    if (key === '=')
      return 'bg-[#C8310A] text-white hover:bg-[#A82808] font-bold text-lg'
    if (['+', '-', '×', '÷'].includes(key))
      return 'bg-[#1A3A8A] text-white hover:bg-[#142E70]'
    if (key === 'AC')
      return 'bg-[#993311] text-white hover:bg-[#7A2808]'
    if (['C', 'DEL'].includes(key))
      return 'bg-[#7A5828] text-white hover:bg-[#624620]'
    if (['GT', 'MC', 'MR', 'M+', 'M-'].includes(key))
      return 'bg-[#2A5545] text-white hover:bg-[#1E4035] text-xs'
    if (['TAX+', 'TAX-'].includes(key))
      return 'bg-[#1A3A6A] text-white hover:bg-[#142E54] text-xs'
    if (['%', '√', '±'].includes(key))
      return 'bg-[#445566] text-white hover:bg-[#344455]'
    return 'bg-[#DEDED6] text-[#1A1A1A] hover:bg-[#CACAC2] border border-[#B0B0A8] text-lg font-semibold'
  }

  return (
    <div
      className="fixed z-50 select-none"
      style={{ left: pos.x, top: pos.y }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="w-[300px] rounded-xl shadow-2xl border-2 border-[#888877] bg-[#B8B8A8] overflow-hidden">
        {/* 타이틀 바 */}
        <div
          className="bg-[#2A3A4A] text-white text-sm px-3 py-2 cursor-move flex justify-between items-center"
          onMouseDown={handleMouseDown}
        >
          <span className="font-semibold tracking-wide">CASIO JS-40B</span>
          <span className="opacity-50 text-xs">⠿</span>
        </div>

        {/* 디스플레이 */}
        <div className="bg-[#BDD8A8] mx-2.5 mt-2.5 mb-2 rounded border border-[#8AAA78] px-3 py-2 shadow-inner">
          {/* 인디케이터 행 */}
          <div className="flex justify-between text-[11px] text-[#3A5A2A] mb-1 font-mono">
            <div className="flex gap-2">
              {memOn && <span className="font-bold">M</span>}
              {pendingOp && <span>{opLabel}</span>}
            </div>
            <span className="opacity-50">14</span>
          </div>
          {/* 숫자 */}
          <div className="text-right font-mono text-[28px] leading-tight text-[#0A1A0A] truncate">
            {displayVal}
          </div>
        </div>

        {/* 버튼 패드 */}
        <div className="px-2 pb-2 space-y-1.5">
          {ROWS.map((row, i) => (
            <div key={i} className="grid grid-cols-5 gap-1.5">
              {row.map(key => (
                <button
                  key={key}
                  onClick={() => press(key)}
                  className={`rounded py-2.5 text-sm font-medium transition-colors ${btnClass(key)}`}
                >
                  {key}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* TAX 표시 */}
        <div className="text-center text-[10px] text-[#555544] pb-1.5">
          TAX {TAX_RATE}%
        </div>
      </div>
    </div>
  )
}
