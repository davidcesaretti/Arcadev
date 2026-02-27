export const GAME_ID = 'tetris' as const
export const TITLE = 'Tetris'

export const COLS = 10
export const ROWS = 20
export const CELL_SIZE = 30
export const PREVIEW_CELL = 18

export const PIECE_NAMES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'] as const
export type PieceName = (typeof PIECE_NAMES)[number]

export const COLORS: Record<PieceName, string> = {
  I: '#00ffe7',
  O: '#ffd700',
  T: '#c77dff',
  S: '#06d6a0',
  Z: '#ff006e',
  J: '#4895ef',
  L: '#ff8c00',
}

export const SHAPES: Record<PieceName, number[][]> = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  O: [[0,1,1,0],[0,1,1,0]],
  T: [[0,1,0],[1,1,1],[0,0,0]],
  S: [[0,1,1],[1,1,0],[0,0,0]],
  Z: [[1,1,0],[0,1,1],[0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]],
  L: [[0,0,1],[1,1,1],[0,0,0]],
}

// Score per number of lines cleared × level multiplier
export const SCORE_TABLE: number[] = [0, 100, 300, 500, 800]
export const LINES_PER_LEVEL = 10

// Drop interval in ms per level
export function dropInterval(level: number): number {
  return Math.max(80, 800 - level * 65)
}

export const SOFT_DROP_INTERVAL = 25  // ms between drops when holding down
export const LOCK_DELAY_MS = 400
export const MAX_LOCK_MOVES = 1  // una sola corrección permitida por pieza       // ms before piece locks after landing
export const LINE_CLEAR_MS = 380       // line flash animation duration
export const PETRIFY_MS = 1600         // petrification animation duration
