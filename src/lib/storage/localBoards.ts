import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { LocalBoard, LocalPage } from '@/types/board'

const DB_NAME = 'actuarial-whiteboard'
const DB_VERSION = 1
const STORE_BOARDS = 'boards'

interface WhiteboardDB extends DBSchema {
  boards: {
    key: string
    value: LocalBoard
    indexes: { 'by-updatedAt': number }
  }
}

let dbPromise: Promise<IDBPDatabase<WhiteboardDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<WhiteboardDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(STORE_BOARDS, { keyPath: 'id' })
        store.createIndex('by-updatedAt', 'updatedAt')
      },
    })
  }
  return dbPromise
}

export function createEmptyPage(order: number): LocalPage {
  return {
    id: generateId(),
    canvasJSON: JSON.stringify({ version: '5.3.0', objects: [] }),
    thumbnail: '',
    order,
  }
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export async function saveBoard(board: LocalBoard): Promise<void> {
  const db = await getDB()
  await db.put(STORE_BOARDS, { ...board, updatedAt: Date.now() })
}

export async function loadBoard(id: string): Promise<LocalBoard | undefined> {
  const db = await getDB()
  return db.get(STORE_BOARDS, id)
}

export async function getAllBoards(): Promise<LocalBoard[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex(STORE_BOARDS, 'by-updatedAt')
  return all.reverse()
}

export async function deleteBoard(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_BOARDS, id)
}

export async function getLastBoard(): Promise<LocalBoard | undefined> {
  const boards = await getAllBoards()
  return boards[0]
}

export function createNewBoard(name: string = '새 보드'): LocalBoard {
  const now = Date.now()
  return {
    id: generateId(),
    name,
    pages: [createEmptyPage(0)],
    currentPageIndex: 0,
    updatedAt: now,
    createdAt: now,
  }
}
