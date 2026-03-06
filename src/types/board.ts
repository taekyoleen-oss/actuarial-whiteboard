export interface LocalPage {
  id: string
  canvasJSON: string
  thumbnail: string
  order: number
}

export interface LocalBoard {
  id: string
  name: string
  pages: LocalPage[]
  currentPageIndex: number
  updatedAt: number
  createdAt: number
}
