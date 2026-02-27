const STORAGE_PREFIX = 'arcade:best:'

export function getBestScore(gameId: string): number {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + gameId)
    if (raw === null) return 0
    const n = parseInt(raw, 10)
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

export function setBestScore(gameId: string, score: number): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + gameId, String(score))
  } catch {
    // ignore
  }
}
