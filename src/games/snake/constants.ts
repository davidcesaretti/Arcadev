export const GAME_ID = 'snake' as const
export const TITLE = 'Snake'

export const GRID = 24          // celdas por lado
export const CELL = 22          // px por celda
export const CANVAS_SIZE = GRID * CELL  // 528px

export type SpeedTier = 'slow' | 'normal' | 'fast' | 'insane'

export interface SpeedConfig {
  label: string
  ms: number        // intervalo entre pasos (ms)
  multiplier: number // multiplicador de puntos
  color: string
}

export const SPEEDS: Record<SpeedTier, SpeedConfig> = {
  slow:   { label: 'SLOW',   ms: 200, multiplier: 1,   color: '#06d6a0' },
  normal: { label: 'NORMAL', ms: 130, multiplier: 1.5, color: '#00ffe7' },
  fast:   { label: 'FAST',   ms: 75,  multiplier: 2.5, color: '#ffd700' },
  insane: { label: 'INSANE', ms: 40,  multiplier: 4,   color: '#ff006e' },
}

export const SPEED_ORDER: SpeedTier[] = ['slow', 'normal', 'fast', 'insane']

export const BASE_SCORE = 100           // puntos base por item
export const WIN_BONUS = 5000           // bonus por cubrir todo el tablero
export const FLASH_MS = 320            // duración del flash de crecimiento
