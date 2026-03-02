import type { ComponentType } from 'react'
import type { GameMeta } from '../../games/_shared/types'

export const GAMES: GameMeta[] = [
  {
    id: 'tetris',
    slug: 'tetris',
    title: 'Tetris',
    description: 'Classic block puzzle. Complete lines to score points.',
    kind: '2d',
  },
  {
    id: 'snake',
    slug: 'snake',
    title: 'Snake',
    description:
      'Guide the snake to eat and grow. Choose your speed and don’t crash.',
    kind: '2d',
  },
  {
    id: 'ring-flight',
    slug: 'ring-flight',
    title: 'Ring Flight',
    description: 'Pilot a plane and fly through rings to score points.',
    kind: '3d',
  },
]

export const GAME_SLUGS = GAMES.map((g) => g.slug)
export const GAME_BY_SLUG = new Map(GAMES.map((g) => [g.slug, g]))

export type GameLoader = () => Promise<{
  default: ComponentType<Record<string, never>>
}>

export const gameLoaders: Record<string, GameLoader> = {
  tetris: () => import('../../games/tetris'),
  snake: () => import('../../games/snake'),
  'ring-flight': () => import('../../games/ring-flight'),
}
