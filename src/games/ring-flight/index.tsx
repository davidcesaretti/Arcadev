import { useState, useCallback, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { GameShell } from '../_shared/shell/GameShell'
import { GAME_ID, TITLE } from './constants'
import FlightGame from './game'

export default function RingFlightGame() {
  const [score, setScore] = useState(0)

  const handleRestart = useCallback(() => {
    setScore(0)
  }, [])

  return (
    <GameShell
      gameId={GAME_ID}
      title={TITLE}
      score={score}
      onRestart={handleRestart}
    >
      <div className="w-full h-full min-h-0 bg-zinc-950">
        <Canvas shadows>
          <Suspense fallback={null}>
            <FlightGame />
          </Suspense>
        </Canvas>
      </div>
    </GameShell>
  )
}
