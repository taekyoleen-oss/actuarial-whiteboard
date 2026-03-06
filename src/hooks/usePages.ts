'use client'

import { useCallback, useRef, useState } from 'react'
import { LocalPage } from '@/types/board'
import { createEmptyPage, generateId } from '@/lib/storage/localBoards'
import { generateThumbnail } from '@/lib/canvas/exportUtils'
import type { Canvas as FabricCanvas } from 'fabric'

export function usePages(initialPages: LocalPage[]) {
  const [pages, setPages] = useState<LocalPage[]>(initialPages)
  const [currentIndex, setCurrentIndex] = useState(0)
  const canvasRef = useRef<FabricCanvas | null>(null)

  const saveCurrentPage = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return pages

    const thumbnail = generateThumbnail(canvas)
    const canvasJSON = JSON.stringify(canvas.toJSON())

    setPages((prev) => {
      const updated = [...prev]
      updated[currentIndex] = { ...updated[currentIndex], canvasJSON, thumbnail }
      return updated
    })

    return pages
  }, [currentIndex, pages])

  const switchToPage = useCallback(
    async (index: number) => {
      const canvas = canvasRef.current
      if (!canvas || index === currentIndex) return

      // Save current page
      const thumbnail = generateThumbnail(canvas)
      const canvasJSON = JSON.stringify(canvas.toJSON())

      setPages((prev) => {
        const updated = [...prev]
        updated[currentIndex] = { ...updated[currentIndex], canvasJSON, thumbnail }
        return updated
      })

      // Load target page
      const targetPage = pages[index]
      if (targetPage) {
        await canvas.loadFromJSON(JSON.parse(targetPage.canvasJSON))
        canvas.requestRenderAll()
      }

      setCurrentIndex(index)
    },
    [currentIndex, pages]
  )

  const addPage = useCallback(
    async (afterIndex?: number) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const thumbnail = generateThumbnail(canvas)
      const canvasJSON = JSON.stringify(canvas.toJSON())

      const insertAfter = afterIndex ?? currentIndex
      const newPage = createEmptyPage(insertAfter + 1)

      setPages((prev) => {
        const updated = [...prev]
        updated[currentIndex] = { ...updated[currentIndex], canvasJSON, thumbnail }
        const newPages = [
          ...updated.slice(0, insertAfter + 1),
          newPage,
          ...updated.slice(insertAfter + 1),
        ].map((p, i) => ({ ...p, order: i }))
        return newPages
      })

      canvas.clear()
      canvas.backgroundColor = '#ffffff'
      canvas.requestRenderAll()

      setCurrentIndex(insertAfter + 1)
    },
    [currentIndex]
  )

  const deletePage = useCallback(
    async (index: number) => {
      if (pages.length <= 1) return

      const canvas = canvasRef.current
      if (!canvas) return

      const newPages = pages.filter((_, i) => i !== index).map((p, i) => ({ ...p, order: i }))
      const newIndex = Math.min(index, newPages.length - 1)

      const targetPage = newPages[newIndex]
      await canvas.loadFromJSON(JSON.parse(targetPage.canvasJSON))
      canvas.requestRenderAll()

      setPages(newPages)
      setCurrentIndex(newIndex)
    },
    [pages]
  )

  const duplicatePage = useCallback(
    async (index: number) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const sourcePage = index === currentIndex
        ? { ...pages[index], canvasJSON: JSON.stringify(canvas.toJSON()), thumbnail: generateThumbnail(canvas) }
        : pages[index]

      const newPage: LocalPage = {
        id: generateId(),
        canvasJSON: sourcePage.canvasJSON,
        thumbnail: sourcePage.thumbnail,
        order: index + 1,
      }

      setPages((prev) => {
        const updated = prev.map((p, i) =>
          i === currentIndex
            ? { ...p, canvasJSON: JSON.stringify(canvas.toJSON()), thumbnail: generateThumbnail(canvas) }
            : p
        )
        return [
          ...updated.slice(0, index + 1),
          newPage,
          ...updated.slice(index + 1),
        ].map((p, i) => ({ ...p, order: i }))
      })

      // Switch to the new duplicated page
      await canvas.loadFromJSON(JSON.parse(newPage.canvasJSON))
      canvas.requestRenderAll()
      setCurrentIndex(index + 1)
    },
    [currentIndex, pages]
  )

  const reorderPage = useCallback((fromIndex: number, toIndex: number) => {
    setPages((prev) => {
      const updated = [...prev]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      return updated.map((p, i) => ({ ...p, order: i }))
    })
    if (currentIndex === fromIndex) setCurrentIndex(toIndex)
  }, [currentIndex])

  return {
    pages,
    setPages,
    currentIndex,
    setCurrentIndex,
    canvasRef,
    saveCurrentPage,
    switchToPage,
    addPage,
    deletePage,
    duplicatePage,
    reorderPage,
  }
}
