import {
  COLS,
  ROWS,
  SHAPES,
  COLORS,
  PIECE_NAMES,
  SCORE_TABLE,
  LINES_PER_LEVEL,
  dropInterval,
  SOFT_DROP_INTERVAL,
  LOCK_DELAY_MS,
  LINE_CLEAR_MS,
  PETRIFY_MS,
} from './constants'
import type { PieceName } from './constants'

export type CellColor = string | null
export type Board = CellColor[][]

export interface Piece {
  name: PieceName
  shape: number[][]
  color: string
  x: number
  y: number
}

export type Phase = 'playing' | 'lineclear' | 'petrifying' | 'gameover'

export interface State {
  board: Board
  piece: Piece | null
  ghostY: number
  queue: PieceName[]
  score: number
  level: number
  lines: number
  phase: Phase
  clearRows: number[]
  clearMs: number
  petrifyMs: number
  dropAccMs: number
  lockAccMs: number
  lockActive: boolean
  softDrop: boolean
  lockId: number
}

// ── Internal helpers ────────────────────────────────────────────────────────

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<CellColor>(COLS).fill(null))
}

function shuffled(arr: PieceName[]): PieceName[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = a[i] as PieceName
    a[i] = a[j] as PieceName
    a[j] = tmp
  }
  return a
}

function refillQueue(q: PieceName[]): PieceName[] {
  const out = [...q]
  while (out.length < 7) out.push(...shuffled([...PIECE_NAMES]))
  return out
}

function makePiece(name: PieceName): Piece {
  const shape = SHAPES[name].map(row => [...row])
  const x = Math.floor((COLS - (shape[0]?.length ?? 0)) / 2)
  return { name, shape, color: COLORS[name], x, y: 0 }
}

function rotateCW(shape: number[][]): number[][] {
  const R = shape.length
  const C = shape[0]?.length ?? 0
  return Array.from({ length: C }, (_, c) =>
    Array.from({ length: R }, (_, r) => shape[R - 1 - r]?.[c] ?? 0)
  )
}

function rotateCCW(shape: number[][]): number[][] {
  const R = shape.length
  const C = shape[0]?.length ?? 0
  return Array.from({ length: C }, (_, c) =>
    Array.from({ length: R }, (_, r) => shape[r]?.[C - 1 - c] ?? 0)
  )
}

function collides(board: Board, shape: number[][], x: number, y: number): boolean {
  for (let r = 0; r < shape.length; r++) {
    const row = shape[r]
    if (!row) continue
    for (let c = 0; c < row.length; c++) {
      if (!row[c]) continue
      const nx = x + c
      const ny = y + r
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true
      if (ny >= 0 && (board[ny]?.[nx] ?? null) !== null) return true
    }
  }
  return false
}

function calcGhostY(board: Board, piece: Piece): number {
  let gy = piece.y
  while (!collides(board, piece.shape, piece.x, gy + 1)) gy++
  return gy
}

function lockPiece(board: Board, piece: Piece): Board {
  const b = board.map(row => [...row])
  for (let r = 0; r < piece.shape.length; r++) {
    const row = piece.shape[r]
    if (!row) continue
    for (let c = 0; c < row.length; c++) {
      if (!row[c]) continue
      const nx = piece.x + c
      const ny = piece.y + r
      if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
        b[ny]![nx] = piece.color
      }
    }
  }
  return b
}

function fullRows(board: Board): number[] {
  return board.reduce<number[]>((acc, row, i) => {
    if (row.every(c => c !== null)) acc.push(i)
    return acc
  }, [])
}

function dropRows(board: Board, rows: number[]): Board {
  const set = new Set(rows)
  const kept = board.filter((_, i) => !set.has(i))
  const empty = Array.from({ length: rows.length }, () => Array<CellColor>(COLS).fill(null))
  return [...empty, ...kept]
}

function spawnNext(state: State): State {
  const name = state.queue[0]
  if (!name) return state
  const queue = refillQueue(state.queue.slice(1))
  const piece = makePiece(name)
  if (collides(state.board, piece.shape, piece.x, piece.y)) {
    return { ...state, piece, queue, phase: 'petrifying', petrifyMs: PETRIFY_MS }
  }
  return {
    ...state,
    piece,
    queue,
    ghostY: calcGhostY(state.board, piece),
    dropAccMs: 0,
    lockAccMs: 0,
    lockActive: false,
  }
}

function doLock(state: State): State {
  if (!state.piece) return state
  const lockId = state.lockId + 1
  const board = lockPiece(state.board, state.piece)
  const full = fullRows(board)
  if (full.length > 0) {
    return { ...state, board, piece: null, phase: 'lineclear', clearRows: full, clearMs: LINE_CLEAR_MS, lockId }
  }
  return spawnNext({ ...state, board, piece: null, lockId })
}

function tryRotate(state: State, dir: 1 | -1): State {
  if (!state.piece || state.phase !== 'playing') return state
  const shape = dir === 1 ? rotateCW(state.piece.shape) : rotateCCW(state.piece.shape)
  const offsets: [number, number][] = [[0,0],[1,0],[-1,0],[2,0],[-2,0],[0,-1],[1,-1],[-1,-1]]
  for (const [ox, oy] of offsets) {
    const nx = state.piece.x + ox
    const ny = state.piece.y + oy
    if (!collides(state.board, shape, nx, ny)) {
      const piece = { ...state.piece, shape, x: nx, y: ny }
      return { ...state, piece, ghostY: calcGhostY(state.board, piece), lockAccMs: 0 }
    }
  }
  return state
}

// ── Public API ──────────────────────────────────────────────────────────────

export function createState(): State {
  const queue = refillQueue([])
  const firstName = queue[0] ?? 'I'
  const piece = makePiece(firstName)
  const board = emptyBoard()
  return {
    board,
    piece,
    ghostY: calcGhostY(board, piece),
    queue: refillQueue(queue.slice(1)),
    score: 0,
    level: 0,
    lines: 0,
    phase: 'playing',
    clearRows: [],
    clearMs: 0,
    petrifyMs: 0,
    dropAccMs: 0,
    lockAccMs: 0,
    lockActive: false,
    softDrop: false,
    lockId: 0,
  }
}

export function tick(state: State, deltaMs: number): State {
  if (state.phase === 'gameover') return state

  if (state.phase === 'petrifying') {
    const petrifyMs = state.petrifyMs - deltaMs
    if (petrifyMs <= 0) return { ...state, phase: 'gameover', petrifyMs: 0 }
    return { ...state, petrifyMs }
  }

  if (state.phase === 'lineclear') {
    const clearMs = state.clearMs - deltaMs
    if (clearMs <= 0) {
      const board = dropRows(state.board, state.clearRows)
      const newLines = state.lines + state.clearRows.length
      const lineScore = (SCORE_TABLE[state.clearRows.length] ?? 0) * (state.level + 1)
      const level = Math.floor(newLines / LINES_PER_LEVEL)
      return spawnNext({
        ...state,
        board,
        lines: newLines,
        score: state.score + lineScore,
        level,
        phase: 'playing',
        clearRows: [],
        clearMs: 0,
      })
    }
    return { ...state, clearMs }
  }

  // playing
  if (!state.piece) return spawnNext(state)

  const interval = state.softDrop ? SOFT_DROP_INTERVAL : dropInterval(state.level)
  const dropAcc = state.dropAccMs + deltaMs

  if (dropAcc >= interval) {
    if (!collides(state.board, state.piece.shape, state.piece.x, state.piece.y + 1)) {
      const piece = { ...state.piece, y: state.piece.y + 1 }
      return {
        ...state,
        piece,
        ghostY: calcGhostY(state.board, piece),
        // Soft drop: reset acumulador para evitar cascada de caídas al activarse
        dropAccMs: state.softDrop ? 0 : dropAcc - interval,
        lockActive: false,
        lockAccMs: 0,
      }
    }
    // Can't drop → start lock delay
    const s = { ...state, dropAccMs: 0, lockActive: true }
    const lockAcc = s.lockAccMs + deltaMs
    if (lockAcc >= LOCK_DELAY_MS) return doLock({ ...s, lockAccMs: 0 })
    return { ...s, lockAccMs: lockAcc }
  }

  if (state.lockActive) {
    const lockAcc = state.lockAccMs + deltaMs
    if (lockAcc >= LOCK_DELAY_MS) return doLock({ ...state, lockAccMs: 0 })
    return { ...state, dropAccMs: dropAcc, lockAccMs: lockAcc }
  }

  return { ...state, dropAccMs: dropAcc }
}

export function handleInput(state: State, action: string, down: boolean): State {
  if (state.phase === 'gameover') {
    if (action === 'restart' && down) return createState()
    return state
  }
  if (!down) {
    return action === 'softdrop' ? { ...state, softDrop: false } : state
  }
  if (!state.piece || state.phase !== 'playing') return state

  switch (action) {
    case 'left': {
      if (collides(state.board, state.piece.shape, state.piece.x - 1, state.piece.y)) return state
      const piece = { ...state.piece, x: state.piece.x - 1 }
      return { ...state, piece, ghostY: calcGhostY(state.board, piece), lockAccMs: 0 }
    }
    case 'right': {
      if (collides(state.board, state.piece.shape, state.piece.x + 1, state.piece.y)) return state
      const piece = { ...state.piece, x: state.piece.x + 1 }
      return { ...state, piece, ghostY: calcGhostY(state.board, piece), lockAccMs: 0 }
    }
    case 'softdrop':
      return { ...state, softDrop: true }
    case 'harddrop': {
      const piece = { ...state.piece, y: state.ghostY }
      return doLock({ ...state, piece })
    }
    case 'rotatecw':  return tryRotate(state, 1)
    case 'rotateccw': return tryRotate(state, -1)
    default: return state
  }
}
