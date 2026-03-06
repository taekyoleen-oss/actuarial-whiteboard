'use client'

import { useCallback, useEffect, useState } from 'react'
import { LocalBoard } from '@/types/board'
import { getAllBoards, saveBoard, deleteBoard, loadBoard } from '@/lib/storage/localBoards'

export function useLocalBoards() {
  const [boards, setBoards] = useState<LocalBoard[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const all = await getAllBoards()
      setBoards(all)
    } catch (e) {
      console.error('Failed to load boards', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const save = useCallback(async (board: LocalBoard) => {
    await saveBoard(board)
    await refresh()
  }, [refresh])

  const remove = useCallback(async (id: string) => {
    await deleteBoard(id)
    await refresh()
  }, [refresh])

  const load = useCallback(async (id: string) => {
    return loadBoard(id)
  }, [])

  return { boards, loading, refresh, save, remove, load }
}
