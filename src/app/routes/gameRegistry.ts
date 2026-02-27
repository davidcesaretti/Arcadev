import type { ComponentType } from 'react'
import type { GameMeta } from '../../games/_shared/types'

export const GAMES: GameMeta[] = [
  {
    id: 'tetris',
    slug: 'tetris',
    title: 'Tetris',
    description: 'Clásico puzzle de bloques. Stub: score sube cada segundo.',
    kind: '2d',
  },
  {
    id: 'target-range-3d',
    slug: 'target-range-3d',
    title: 'Target Range 3D',
    description: 'Dispara a objetivos en 3D. Stub: haz click para sumar puntos.',
    kind: '3d',
  },
  {
    id: 'ring-flight',
    slug: 'ring-flight',
    title: 'Ring Flight',
    description: 'Pilotea un avión y pasa por los aros para sumar puntos.',
    kind: '3d',
  },
]

export const GAME_SLUGS = GAMES.map((g) => g.slug)
export const GAME_BY_SLUG = new Map(GAMES.map((g) => [g.slug, g]))

export type GameLoader = () => Promise<{ default: ComponentType<Record<string, never>> }>

export const gameLoaders: Record<string, GameLoader> = {
  tetris: () => import('../../games/tetris'),
  'target-range-3d': () => import('../../games/target-range-3d'),
  'ring-flight': () => import('../../games/ring-flight'),
}
