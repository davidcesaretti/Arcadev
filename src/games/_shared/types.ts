export type GameKind = '2d' | '3d'

export type GameId = string

export interface GameMeta {
  id: GameId
  slug: string
  title: string
  description: string
  kind: GameKind
}

export interface ScorePayload {
  gameId: GameId
  score: number
  timestamp?: number
}

export interface GameScore {
  score: number
  bestScore: number
}

import type { JSX } from 'react'
export type GameComponent = () => JSX.Element
