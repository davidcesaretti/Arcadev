import type { GameId } from '../games/_shared/types'

/**
 * Cliente API para scores en backend (stub).
 * En el futuro: enviar scores, obtener leaderboards, etc.
 */

export interface SubmitScoreRequest {
  gameId: GameId
  score: number
  playerId?: string
}

export interface SubmitScoreResponse {
  ok: boolean
  rank?: number
  error?: string
}

export async function submitScore(_payload: SubmitScoreRequest): Promise<SubmitScoreResponse> {
  // TODO: POST /api/scores
  await Promise.resolve()
  return { ok: true }
}

export async function getLeaderboard(
  _gameId: GameId,
  _limit?: number
): Promise<Array<{ playerId: string; score: number }>> {
  // TODO: GET /api/scores/:gameId
  return []
}
