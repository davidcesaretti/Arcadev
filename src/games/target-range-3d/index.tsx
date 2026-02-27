import { useEffect, useRef, useState, useCallback } from 'react'
import { GameShell } from '../_shared/shell/GameShell'
import { createTargetRangeScene } from './game'
import { GAME_ID, TITLE } from './constants'

export default function TargetRange3DGame() {
  const containerRef = useRef<HTMLDivElement>(null)
  const disposeRef = useRef<(() => void) | null>(null)
  const [score, setScore] = useState(0)

  const startGame = useCallback(() => {
    if (!containerRef.current) return
    disposeRef.current?.()
    setScore(0)
    disposeRef.current = createTargetRangeScene(containerRef.current, {
      onClick: () => setScore((s) => s + 1),
    })
  }, [])

  useEffect(() => {
    startGame()
    return () => {
      disposeRef.current?.()
      disposeRef.current = null
    }
  }, [startGame])

  const handleRestart = useCallback(() => {
    startGame()
  }, [startGame])

  return (
    <GameShell gameId={GAME_ID} title={TITLE} score={score} onRestart={handleRestart}>
      <div ref={containerRef} className="w-full h-full min-h-0" />
    </GameShell>
  )
}
