import { useCallback, useState } from 'react'
import { getBestScore, setBestScore } from '../utils/storage'

export function useLocalBestScore(gameId: string) {
  const [bestScore, setBestScoreState] = useState<number>(() => getBestScore(gameId))

  const updateBestScore = useCallback(
    (score: number) => {
      const current = getBestScore(gameId)
      if (score > current) {
        setBestScore(gameId, score)
        setBestScoreState(score)
        return score
      }
      return current
    },
    [gameId]
  )

  return { bestScore, updateBestScore }
}
