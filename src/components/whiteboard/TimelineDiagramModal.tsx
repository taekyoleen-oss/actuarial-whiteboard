'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useWhiteboardStore } from '@/store/whiteboardStore'
import { TimelineType, TimelineConfig } from '@/types/actuarial'
import { generateTimelineSVG, TIMELINE_DEFAULTS } from '@/lib/canvas/actuarialShapes'
import type { Canvas as FabricCanvas } from 'fabric'

const TIMELINE_TYPES: { value: TimelineType; label: string }[] = [
  { value: 'insurance-period', label: '단순 보험기간' },
  { value: 'payment-period', label: '납입기간 + 보험기간' },
  { value: 'survival-death', label: '생존/사망 분기' },
  { value: 'deferred-annuity', label: '거치연금' },
  { value: 'whole-life', label: '종신보험' },
]

interface Props {
  getCanvas: () => FabricCanvas | null
}

export default function TimelineDiagramModal({ getCanvas }: Props) {
  const { isTimelineModalOpen, toggleTimelineModal } = useWhiteboardStore()

  const [type, setType] = useState<TimelineType>('insurance-period')
  const [startLabel, setStartLabel] = useState('x')
  const [endLabel, setEndLabel] = useState('x+n')
  const [midLabel, setMidLabel] = useState('x+m')

  function applyDefaults(t: TimelineType) {
    const d = TIMELINE_DEFAULTS[t]
    setType(t)
    setStartLabel(d.startLabel ?? 'x')
    setEndLabel(d.endLabel ?? 'x+n')
    setMidLabel(d.midLabel ?? 'x+m')
  }

  async function handleInsert() {
    const canvas = getCanvas()
    if (!canvas) return

    const config: TimelineConfig = {
      type,
      startLabel,
      endLabel,
      midLabel,
      annotations: TIMELINE_DEFAULTS[type].annotations ?? [],
      scale: 1,
    }

    const svgString = generateTimelineSVG(config)
    const { loadSVGFromString, util } = await import('fabric')

    const { objects, options } = await loadSVGFromString(svgString)
    const nonNullObjects = objects.filter((o): o is NonNullable<typeof o> => o !== null)
    const group = util.groupSVGElements(nonNullObjects, options)

    const vp = canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0]
    const cx = (canvas.width! / 2 - vp[4]) / vp[0]
    const cy = (canvas.height! / 2 - vp[5]) / vp[3]

    group.set({
      left: cx - (group.width ?? 0) / 2,
      top: cy - (group.height ?? 0) / 2,
    })

    canvas.add(group)
    canvas.setActiveObject(group)
    canvas.requestRenderAll()
    toggleTimelineModal()
  }

  const previewSVG = generateTimelineSVG({
    type,
    startLabel,
    endLabel,
    midLabel,
    annotations: TIMELINE_DEFAULTS[type].annotations ?? [],
    scale: 1,
  })

  return (
    <Dialog open={isTimelineModalOpen} onOpenChange={toggleTimelineModal}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#1E2D5E]">보험수리 타임라인 삽입</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type selector */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">다이어그램 종류</label>
            <div className="grid grid-cols-1 gap-1">
              {TIMELINE_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => applyDefaults(t.value)}
                  className={`text-left text-sm px-3 py-2 rounded-md border transition-colors ${
                    type === t.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Labels */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">시작 레이블</label>
              <input
                value={startLabel}
                onChange={(e) => setStartLabel(e.target.value)}
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {(type === 'payment-period' || type === 'deferred-annuity') && (
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">중간 레이블</label>
                <input
                  value={midLabel}
                  onChange={(e) => setMidLabel(e.target.value)}
                  className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">끝 레이블</label>
              <input
                value={endLabel}
                onChange={(e) => setEndLabel(e.target.value)}
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">미리보기</label>
            <div
              className="border border-gray-200 rounded bg-white p-2 overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: previewSVG }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={toggleTimelineModal}>취소</Button>
          <Button onClick={handleInsert} className="bg-[#1E2D5E] hover:bg-[#162248]">삽입</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
