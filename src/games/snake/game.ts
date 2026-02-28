import { GRID, BASE_SCORE, WIN_BONUS, FLASH_MS } from './constants'
import type { SpeedTier, SpeedConfig } from './constants'
import { SPEEDS } from './constants'

export type Dir = 'up' | 'down' | 'left' | 'right'

export interface Vec2 { x: number; y: number }

export type Phase = 'waiting' | 'playing' | 'gameover' | 'win'

export interface State {
  snake: Vec2[]         // head = [0], tail = last
  dir: Dir
  nextDir: Dir          // dirección encolada (evita 180° accidentales)
  food: Vec2
  score: number
  phase: Phase
  speed: SpeedTier
  speedCfg: SpeedConfig
  stepAccMs: number     // acumulador del timer de paso
  elapsedMs: number     // tiempo de partida en ms
  eatId: number         // se incrementa al comer (para disparar SFX/anim)
  flashMs: number       // ms restantes del flash de crecimiento
  winId: number         // se incrementa al ganar (para disparar SFX)
  deathId: number       // se incrementa al morir (para disparar SFX)
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function randomFood(snake: Vec2[]): Vec2 {
  const occupied = new Set(snake.map(s => `${s.x},${s.y}`))
  const free: Vec2[] = []
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++)
      if (!occupied.has(`${x},${y}`)) free.push({ x, y })
  if (free.length === 0) return { x: -1, y: -1 } // tablero lleno → victoria
  return free[Math.floor(Math.random() * free.length)]!
}

function moved(head: Vec2, dir: Dir): Vec2 {
  switch (dir) {
    case 'up':    return { x: head.x, y: head.y - 1 }
    case 'down':  return { x: head.x, y: head.y + 1 }
    case 'left':  return { x: head.x - 1, y: head.y }
    case 'right': return { x: head.x + 1, y: head.y }
  }
}

function isOpposite(a: Dir, b: Dir): boolean {
  return (a === 'up' && b === 'down') || (a === 'down' && b === 'up') ||
         (a === 'left' && b === 'right') || (a === 'right' && b === 'left')
}

// ── API pública ──────────────────────────────────────────────────────────────

export function createState(speed: SpeedTier = 'normal'): State {
  const snake: Vec2[] = [
    { x: Math.floor(GRID / 2),     y: Math.floor(GRID / 2) },
    { x: Math.floor(GRID / 2) - 1, y: Math.floor(GRID / 2) },
    { x: Math.floor(GRID / 2) - 2, y: Math.floor(GRID / 2) },
  ]
  return {
    snake,
    dir: 'right',
    nextDir: 'right',
    food: randomFood(snake),
    score: 0,
    phase: 'waiting',
    speed,
    speedCfg: SPEEDS[speed],
    stepAccMs: 0,
    elapsedMs: 0,
    eatId: 0,
    flashMs: 0,
    winId: 0,
    deathId: 0,
  }
}

export function setSpeed(state: State, speed: SpeedTier): State {
  return { ...state, speed, speedCfg: SPEEDS[speed] }
}

export function queueDir(state: State, dir: Dir): State {
  if (state.phase !== 'playing') return state
  if (isOpposite(state.dir, dir)) return state
  return { ...state, nextDir: dir }
}

export function startGame(state: State): State {
  return { ...state, phase: 'playing' }
}

export function tick(state: State, deltaMs: number): State {
  if (state.phase !== 'playing') return state

  // Actualizar timer de flash de crecimiento
  const flashMs = Math.max(0, state.flashMs - deltaMs)

  // Actualizar tiempo de partida
  const elapsedMs = state.elapsedMs + deltaMs

  const stepAcc = state.stepAccMs + deltaMs
  if (stepAcc < state.speedCfg.ms) {
    return { ...state, stepAccMs: stepAcc, elapsedMs, flashMs }
  }

  // — Dar un paso —
  const dir = state.nextDir
  const head = moved(state.snake[0]!, dir)

  // Colisión con paredes
  if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
    return { ...state, phase: 'gameover', stepAccMs: 0, elapsedMs, flashMs, deathId: state.deathId + 1 }
  }

  // Colisión con cuerpo (ignorar la cola porque se va a mover)
  const bodyWithoutTail = state.snake.slice(0, -1)
  if (bodyWithoutTail.some(s => s.x === head.x && s.y === head.y)) {
    return { ...state, phase: 'gameover', stepAccMs: 0, elapsedMs, flashMs, deathId: state.deathId + 1 }
  }

  const ate = head.x === state.food.x && head.y === state.food.y

  let newSnake: Vec2[]
  if (ate) {
    newSnake = [head, ...state.snake] // crecer: no eliminar cola
  } else {
    newSnake = [head, ...state.snake.slice(0, -1)] // mover
  }

  // Victoria: el snake ocupa todo el tablero
  if (ate && newSnake.length === GRID * GRID) {
    const winScore = state.score + Math.round(BASE_SCORE * state.speedCfg.multiplier) + WIN_BONUS
    return {
      ...state,
      snake: newSnake,
      score: winScore,
      phase: 'win',
      stepAccMs: stepAcc - state.speedCfg.ms,
      elapsedMs,
      flashMs: FLASH_MS,
      eatId: state.eatId + 1,
      winId: state.winId + 1,
    }
  }

  if (ate) {
    const newFood = randomFood(newSnake)
    const eatScore = Math.round(BASE_SCORE * state.speedCfg.multiplier)
    return {
      ...state,
      snake: newSnake,
      food: newFood,
      score: state.score + eatScore,
      dir,
      nextDir: dir,
      stepAccMs: stepAcc - state.speedCfg.ms,
      elapsedMs,
      flashMs: FLASH_MS,
      eatId: state.eatId + 1,
    }
  }

  return {
    ...state,
    snake: newSnake,
    dir,
    stepAccMs: stepAcc - state.speedCfg.ms,
    elapsedMs,
    flashMs,
  }
}
