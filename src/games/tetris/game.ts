import { SCORE_INTERVAL_MS, SCORE_PER_TICK } from './constants'

export interface TetrisGameCallbacks {
  onScore: (score: number) => void
}

export function createTetrisLoop(
  _container: HTMLDivElement,
  callbacks: TetrisGameCallbacks
): () => void {
  let score = 0
  const intervalId = setInterval(() => {
    score += SCORE_PER_TICK
    callbacks.onScore(score)
  }, SCORE_INTERVAL_MS)
  return () => clearInterval(intervalId)
}
