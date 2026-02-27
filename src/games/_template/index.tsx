import { useEffect, useRef, useState, useCallback } from 'react'
import { GameShell } from '../_shared/shell/GameShell'
import { createTemplateGame } from './game'
import { GAME_ID, TITLE } from './constants'

/**
 * Componente del juego. Export default para lazy load.
 * 1. Añade este juego a app/routes/gameRegistry.ts (GAMES + gameLoaders).
 * 2. Renombra la carpeta _template a tu slug (ej. my-game).
 * 3. Implementa game.ts con tu lógica (Phaser o Three).
 */
export default function TemplateGame() {
  const containerRef = useRef<HTMLDivElement>(null)
  const disposeRef = useRef<(() => void) | null>(null)
  const [score, setScore] = useState(0)

  const startGame = useCallback(() => {
    if (!containerRef.current) return
    disposeRef.current?.()
    setScore(0)
    disposeRef.current = createTemplateGame(containerRef.current, {
      onScore: setScore,
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
