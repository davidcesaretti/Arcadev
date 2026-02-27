import { useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { GameShell } from '../_shared/shell/GameShell'
import { GAME_ID, TITLE } from './constants'

/**
 * Juego: avión pasando por aros para sumar puntos.
 * Escena vacía lista para que implementes avión, aros y colisiones.
 */
function Scene() {
  return null
}

export default function RingFlightGame() {
  const [score, setScore] = useState(0)

  const handleRestart = useCallback(() => {
    setScore(0)
  }, [])

  return (
    <GameShell gameId={GAME_ID} title={TITLE} score={score} onRestart={handleRestart}>
      <div className="w-full h-full min-h-0 bg-zinc-950">
        <Canvas
          camera={{ position: [0, 0, 10], fov: 60 }}
          gl={{ antialias: true }}
          style={{ width: '100%', height: '100%' }}
        >
          <Scene />
        </Canvas>
      </div>
    </GameShell>
  )
}
