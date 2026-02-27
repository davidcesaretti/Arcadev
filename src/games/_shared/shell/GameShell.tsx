import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useLocalBestScore } from '../hooks/useLocalBestScore'
import { useFullscreen } from '../hooks/useFullscreen'
import type { GameId } from '../types'

export interface GameShellProps {
  gameId: GameId
  title: string
  score: number
  onRestart: () => void
  children: ReactNode
}

export function GameShell({ gameId, title, score, onRestart, children }: GameShellProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { bestScore, updateBestScore } = useLocalBestScore(gameId)
  const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef)

  useEffect(() => {
    if (score > bestScore) updateBestScore(score)
  }, [score, bestScore, updateBestScore])

  const currentBest = score > bestScore ? score : bestScore

  return (
    <div ref={containerRef} className="relative flex flex-col h-screen w-full bg-zinc-900">
      <header className="flex-shrink-0 flex items-center justify-between gap-4 px-4 py-2 bg-zinc-800 text-white">
        <h1 className="text-lg font-semibold truncate">{title}</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-300">
            Score: <strong>{score}</strong>
          </span>
          <span className="text-sm text-amber-400">
            Best: <strong>{currentBest}</strong>
          </span>
          <button
            type="button"
            onClick={onRestart}
            className="px-3 py-1 rounded bg-zinc-600 hover:bg-zinc-500 text-sm"
          >
            Restart
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="px-3 py-1 rounded bg-zinc-600 hover:bg-zinc-500 text-sm"
          >
            {isFullscreen ? 'Exit FS' : 'Fullscreen'}
          </button>
          <Link
            to="/"
            className="px-3 py-1 rounded bg-zinc-600 hover:bg-zinc-500 text-sm no-underline text-white"
          >
            Back to Hub
          </Link>
        </div>
      </header>
      <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
    </div>
  )
}
