'use client'

import { useCallback, useRef, useState } from 'react'
import { useWhiteboardStore } from '@/store/whiteboardStore'

type CalcKey =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | '.' | '+' | '-' | '*' | '/' | '(' | ')' | '%'
  | 'AC' | '⌫' | '=' | '±' | 'sin' | 'cos' | 'tan' | 'ln' | 'log'
  | 'x²' | '√' | 'π' | 'e' | '^'

const BUTTONS: CalcKey[][] = [
  ['sin', 'cos', 'tan', 'ln', 'log'],
  ['x²', '√', '^', 'π', 'e'],
  ['AC', '⌫', '%', '/'],
  ['7', '8', '9', '*'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['±', '0', '.', '='],
]

export default function CalculatorPopup() {
  const { isCalculatorOpen } = useWhiteboardStore()
  const [display, setDisplay] = useState('0')
  const [expr, setExpr] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [pos, setPos] = useState({ x: 20, y: 80 })
  const dragOffset = useRef({ x: 0, y: 0 })

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true)
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
  }, [pos])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y })
  }, [isDragging])

  const handleMouseUp = useCallback(() => setIsDragging(false), [])

  function pressKey(key: CalcKey) {
    switch (key) {
      case 'AC':
        setExpr('')
        setDisplay('0')
        break
      case '⌫':
        setExpr((e) => {
          const next = e.slice(0, -1)
          setDisplay(next || '0')
          return next
        })
        break
      case '=': {
        try {
          const safeExpr = expr
            .replace(/π/g, String(Math.PI))
            .replace(/\be\b/g, String(Math.E))
            .replace(/sin\(/g, 'Math.sin(')
            .replace(/cos\(/g, 'Math.cos(')
            .replace(/tan\(/g, 'Math.tan(')
            .replace(/ln\(/g, 'Math.log(')
            .replace(/log\(/g, '(Math.log10 ? Math.log10 : (x)=>Math.log(x)/Math.log(10))(')
            .replace(/√\(/g, 'Math.sqrt(')
            .replace(/\^/g, '**')
          // eslint-disable-next-line no-new-func
          const result = Function(`"use strict"; return (${safeExpr})`)()
          const formatted = Number.isFinite(result) ? String(+result.toPrecision(12)) : 'Error'
          setDisplay(formatted)
          setExpr(formatted)
        } catch {
          setDisplay('Error')
          setExpr('')
        }
        break
      }
      case '±':
        setExpr((e) => {
          const next = e.startsWith('-') ? e.slice(1) : `-${e}`
          setDisplay(next || '0')
          return next
        })
        break
      case 'x²':
        setExpr((e) => { const n = `(${e})**2`; setDisplay(n); return n })
        break
      case 'sin':
      case 'cos':
      case 'tan':
      case 'ln':
      case 'log':
      case '√':
        setExpr((e) => { const n = `${key}(`; setDisplay(e + n); return e + n })
        break
      case 'π':
      case 'e':
        setExpr((e) => { const n = e + key; setDisplay(n); return n })
        break
      default:
        setExpr((e) => {
          const next = (e === '0' && !isNaN(Number(key))) ? key : e + key
          setDisplay(next)
          return next
        })
    }
  }

  if (!isCalculatorOpen) return null

  const buttonClass = (key: CalcKey) => {
    if (key === '=') return 'bg-[#1E2D5E] text-white hover:bg-[#162248]'
    if (['+', '-', '*', '/'].includes(key)) return 'bg-blue-100 text-blue-700 hover:bg-blue-200'
    if (['AC', '⌫'].includes(key)) return 'bg-red-50 text-red-600 hover:bg-red-100'
    if (['sin', 'cos', 'tan', 'ln', 'log', 'x²', '√', '^', 'π', 'e'].includes(key))
      return 'bg-gray-100 text-gray-700 hover:bg-gray-200 text-base'
    return 'bg-white text-gray-800 hover:bg-gray-50 border border-gray-200'
  }

  return (
    <div
      className="fixed z-50 select-none"
      style={{ left: pos.x, top: pos.y }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="w-[432px] rounded-xl shadow-xl border border-gray-200 bg-gray-50 overflow-hidden">
        {/* Drag handle */}
        <div
          className="bg-[#1E2D5E] text-white text-base px-4 py-2.5 cursor-move flex justify-between items-center"
          onMouseDown={handleMouseDown}
        >
          <span>공학용 계산기</span>
          <span className="opacity-60 text-base">⠿</span>
        </div>

        {/* Display */}
        <div className="bg-white px-5 py-4 text-right">
          <div className="text-base text-gray-400 min-h-[24px] truncate">{expr}</div>
          <div className="text-4xl font-mono font-semibold text-gray-900 truncate">{display}</div>
        </div>

        {/* Buttons */}
        <div className="p-3 space-y-2">
          {BUTTONS.map((row, i) => (
            <div key={i} className={`grid gap-2 ${row.length === 5 ? 'grid-cols-5' : 'grid-cols-4'}`}>
              {row.map((key) => (
                <button
                  key={key}
                  onClick={() => pressKey(key)}
                  className={`rounded-lg py-4 text-lg font-medium transition-colors ${buttonClass(key)}`}
                >
                  {key}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
