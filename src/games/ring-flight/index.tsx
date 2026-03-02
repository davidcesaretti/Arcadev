import { useState, useCallback, useEffect, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { GameShell } from '../_shared/shell/GameShell'
import { GAME_ID, TITLE } from './constants'
import FlightGame from './game'
import { audioManager } from '../../audio/AudioManager'
import { setOnRingCollected, setOnAllCollected } from './gameEvents'

const POINTS_PER_RING = 100

export default function RingFlightGame() {
  const [score, setScore]           = useState(0)
  const [gameStarted, setGameStarted] = useState(false)
  const [audioError, setAudioError]   = useState(false)

  // ── Registrar handlers de eventos de juego ──────────────────────────────────
  useEffect(() => {
    setOnRingCollected((combo) => {
      const points = POINTS_PER_RING + Math.floor(combo * 10)
      setScore((prev) => prev + points)
      audioManager.playRing(combo)
    })

    setOnAllCollected(() => {
      setScore((prev) => prev + 500)
      audioManager.playWin()
    })

    return () => {
      setOnRingCollected(() => undefined)
      setOnAllCollected(() => undefined)
    }
  }, [])

  // ── Destruir audio al desmontar ─────────────────────────────────────────────
  useEffect(() => {
    return () => { audioManager.destroy() }
  }, [])

  // ── Click en el overlay: inicia audio Y juego ────────────────────────────────
  const handleStart = useCallback(async () => {
    // Montar el juego primero para que el click también sirva como gesto de usuario
    setGameStarted(true)

    try {
      await audioManager.init()
      await audioManager.loadAll()
      audioManager.start()
    } catch (err) {
      console.warn('[RingFlight] Audio init falló, continuando sin sonido:', err)
      setAudioError(true)
    }
  }, [])

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
      <div className="relative w-full h-full min-h-0 bg-zinc-950">

        {/* El Canvas se monta solo después del click → el juego no corre en background */}
        {gameStarted && (
          <Canvas shadows>
            <Suspense fallback={null}>
              <FlightGame />
            </Suspense>
          </Canvas>
        )}

        {/* Pantalla de inicio — tapa todo hasta el primer click */}
        {!gameStarted && (
          <button
            type="button"
            onClick={handleStart}
            className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 cursor-pointer"
          >
            {/* Fondo decorativo */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#001a2e_0%,_#020408_70%)]" />

            <div className="relative flex flex-col items-center gap-6 select-none">
              {/* Título */}
              <h2
                className="font-arcade text-3xl tracking-[0.3em] text-white uppercase"
                style={{ textShadow: '0 0 24px rgba(0,255,231,0.6)' }}
              >
                RING FLIGHT
              </h2>

              {/* Instrucciones */}
              <div className="flex flex-col items-center gap-1 text-center">
                <p className="font-arcade text-[10px] tracking-widest text-zinc-400 uppercase">
                  A / D &nbsp;— girar &nbsp;|&nbsp; W / S &nbsp;— subir / bajar
                </p>
                <p className="font-arcade text-[10px] tracking-widest text-zinc-400 uppercase">
                  SHIFT &nbsp;— turbo &nbsp;|&nbsp; R &nbsp;— resetear posición
                </p>
              </div>

              {/* Botón de inicio */}
              <span
                className="font-arcade text-[#00ffe7] text-base tracking-[0.4em] uppercase animate-pulse mt-2"
                style={{ textShadow: '0 0 16px #00ffe7' }}
              >
                ▶ &nbsp; CLICK TO START
              </span>
            </div>
          </button>
        )}

        {/* Aviso sutil si los archivos de audio no están */}
        {gameStarted && audioError && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
            <span className="font-arcade text-zinc-600 text-[9px] tracking-widest">
              Audio no disponible — colocar archivos en /public/audio/
            </span>
          </div>
        )}
      </div>
    </GameShell>
  )
}
