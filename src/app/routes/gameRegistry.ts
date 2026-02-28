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
    id: 'snake',
    slug: 'snake',
    title: 'Snake',
    description: 'Guía la serpiente para comer y crecer. Elige tu velocidad y no te choques.',
    kind: '2d',
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
  'snake': () => import('../../games/snake'),
  'ring-flight': () => import('../../games/ring-flight'),
}
