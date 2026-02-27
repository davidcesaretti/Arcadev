import { useEffect, useRef, useState, useCallback } from 'react'
import { GameShell } from '../_shared/shell/GameShell'
import { createTetrisLoop } from './game'
import { GAME_ID, TITLE } from './constants'

export default function TetrisGame() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stopRef = useRef<(() => void) | null>(null)
  const [score, setScore] = useState(0)

  const startGame = useCallback(() => {
    if (!containerRef.current) return
    stopRef.current?.()
    setScore(0)
    stopRef.current = createTetrisLoop(containerRef.current, {
      onScore: setScore,
    })
  }, [])

  useEffect(() => {
    startGame()
    return () => {
      stopRef.current?.()
      stopRef.current = null
    }
  }, [startGame])

  const handleRestart = useCallback(() => {
    startGame()
  }, [startGame])

  return (
    <GameShell gameId={GAME_ID} title={TITLE} score={score} onRestart={handleRestart}>
      <div ref={containerRef} className="w-full h-full flex items-center justify-center bg-zinc-950">
        <p className="text-zinc-500 text-sm">Tetris stub — el score sube cada segundo</p>
      </div>
    </GameShell>
  )
}
