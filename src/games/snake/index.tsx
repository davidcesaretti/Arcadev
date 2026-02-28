import { useEffect, useRef, useState, useCallback } from 'react'
import { GameShell } from '../_shared/shell/GameShell'
import {
  GAME_ID, TITLE, GRID, CELL, CANVAS_SIZE, SPEEDS, SPEED_ORDER, FLASH_MS,
} from './constants'
import type { SpeedTier } from './constants'
import {
  createState, tick, queueDir, startGame, setSpeed,
  type State, type Dir,
} from './game'
import { snakeAudio } from './audio'

// ── Colores ──────────────────────────────────────────────────────────────────
const BG          = '#010810'
const GRID_COLOR  = 'rgba(0,255,231,0.035)'
const HEAD_COLOR  = '#00ffe7'
const BODY_COLOR  = '#0aafaa'
const FOOD_COLOR  = '#ff006e'
const FLASH_COLOR = '#ffffff'

// ── Canvas drawing ───────────────────────────────────────────────────────────

function drawScene(ctx: CanvasRenderingContext2D, state: State) {
  const S = CANVAS_SIZE

  // fondo
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, S, S)

  // grid
  ctx.strokeStyle = GRID_COLOR
  ctx.lineWidth = 1
  for (let i = 0; i <= GRID; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, S); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(S, i * CELL); ctx.stroke()
  }

  // serpiente
  const flashT = state.flashMs > 0 ? state.flashMs / FLASH_MS : 0 // 1→0
  state.snake.forEach((seg, idx) => {
    const isHead = idx === 0
    const baseColor = isHead ? HEAD_COLOR : BODY_COLOR
    // flash de crecimiento: interpolar hacia blanco en los primeros segmentos
    let color = baseColor
    if (flashT > 0 && idx < 4) {
      const amount = flashT * (1 - idx / 4)
      color = lerpHex(baseColor, FLASH_COLOR, amount * 0.8)
    }
    const px = seg.x * CELL
    const py = seg.y * CELL
    const pad = isHead ? 1 : 2
    const r = isHead ? 3 : 2

    ctx.save()
    ctx.shadowColor = isHead ? HEAD_COLOR : 'transparent'
    ctx.shadowBlur = isHead ? 10 : 0
    ctx.fillStyle = color
    roundRect(ctx, px + pad, py + pad, CELL - pad * 2, CELL - pad * 2, r)
    ctx.fill()

    if (isHead) {
      ctx.shadowBlur = 0
      ctx.fillStyle = 'rgba(255,255,255,0.18)'
      roundRect(ctx, px + pad, py + pad, CELL - pad * 2, 3, 1)
      ctx.fill()
    }
    ctx.restore()
  })

  // comida
  if (state.food.x >= 0) {
    const fx = state.food.x * CELL + CELL / 2
    const fy = state.food.y * CELL + CELL / 2
    const r = CELL / 2 - 3
    ctx.save()
    ctx.shadowColor = FOOD_COLOR
    ctx.shadowBlur = 14
    ctx.fillStyle = FOOD_COLOR
    ctx.beginPath()
    ctx.arc(fx, fy, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.beginPath()
    ctx.arc(fx - r * 0.25, fy - r * 0.3, r * 0.28, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // scanlines CRT
  ctx.save()
  ctx.globalAlpha = 0.035
  for (let y = 0; y < S; y += 4) {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, y, S, 2)
  }
  ctx.restore()
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

function lerpHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a)
  const [br, bg, bb] = hexToRgb(b)
  const r = Math.round((ar ?? 0) + ((br ?? 0) - (ar ?? 0)) * t)
  const g = Math.round((ag ?? 0) + ((bg ?? 0) - (ag ?? 0)) * t)
  const bl = Math.round((ab ?? 0) + ((bb ?? 0) - (ab ?? 0)) * t)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`
}

// ── Formatear tiempo ─────────────────────────────────────────────────────────
function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<State>(createState('normal'))
  const audioStarted = useRef(false)

  const [score, setScore] = useState(0)
  const [ui, setUi] = useState({
    phase: stateRef.current.phase,
    speed: stateRef.current.speed,
    elapsedMs: 0,
    length: stateRef.current.snake.length,
  })

  // ── Restart ────────────────────────────────────────────────────────────────
  const doRestart = useCallback((speed?: SpeedTier) => {
    const spd = speed ?? stateRef.current.speed
    const fresh = createState(spd)
    stateRef.current = fresh
    setScore(0)
    setUi({ phase: 'waiting', speed: spd, elapsedMs: 0, length: fresh.snake.length })
    if (audioStarted.current) {
      snakeAudio.restart()
    }
  }, [])

  // ── Game loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d') ?? null
    if (!canvas || !ctx) return

    let running = true
    let lastTime = performance.now()
    let rafId = 0

    function loop() {
      if (!running) return
      const now = performance.now()
      const delta = Math.min(now - lastTime, 100)
      lastTime = now

      const prev = stateRef.current
      if (prev.phase === 'playing') {
        stateRef.current = tick(prev, delta)
      }
      const s = stateRef.current

      drawScene(ctx!, s)

      // Sincronizar con React solo cuando algo relevante cambia
      if (
        s.score !== prev.score ||
        s.phase !== prev.phase ||
        s.elapsedMs !== prev.elapsedMs
      ) {
        setScore(s.score)
        setUi({
          phase: s.phase,
          speed: s.speed,
          elapsedMs: s.elapsedMs,
          length: s.snake.length,
        })
      }

      // Audio events
      if (audioStarted.current) {
        if (s.eatId !== prev.eatId) snakeAudio.playEat()
        if (s.deathId !== prev.deathId) {
          snakeAudio.stopMusic()
          snakeAudio.playDeath()
        }
        if (s.winId !== prev.winId) {
          snakeAudio.stopMusic()
          snakeAudio.playWin()
        }
        // Ajustar tempo según velocidad seleccionada
        const tempos: Record<SpeedTier, number> = {
          slow: 100, normal: 128, fast: 155, insane: 185,
        }
        if (s.phase === 'playing' && prev.phase !== 'playing') {
          snakeAudio.setTempo(tempos[s.speed])
          snakeAudio.startMusic()
        }
      }

      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => {
      running = false
      cancelAnimationFrame(rafId)
      snakeAudio.destroy()
    }
  }, [])

  // ── Teclado ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const preventKeys = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ']
      if (preventKeys.includes(e.key)) e.preventDefault()
      if (e.repeat) return

      const s = stateRef.current

      // Pantalla de inicio o gameover/win: Enter para iniciar/reiniciar
      if (s.phase === 'waiting') {
        if (e.code === 'Enter' || e.code === 'Space') {
          if (!audioStarted.current) {
            audioStarted.current = true
          }
          stateRef.current = startGame(stateRef.current)
          const tempos: Record<SpeedTier, number> = {
            slow: 100, normal: 128, fast: 155, insane: 185,
          }
          snakeAudio.setTempo(tempos[stateRef.current.speed])
          snakeAudio.startMusic()
          setUi(u => ({ ...u, phase: 'playing' }))
        }
        // Selección de velocidad en pantalla de espera
        if (e.code === 'Digit1') doRestart('slow')
        if (e.code === 'Digit2') doRestart('normal')
        if (e.code === 'Digit3') doRestart('fast')
        if (e.code === 'Digit4') doRestart('insane')
        return
      }

      if (s.phase === 'gameover' || s.phase === 'win') {
        if (e.code === 'Enter') doRestart()
        return
      }

      // Movimiento
      const dirMap: Record<string, Dir> = {
        ArrowUp: 'up', ArrowDown: 'down',
        ArrowLeft: 'left', ArrowRight: 'right',
        KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
      }
      const dir = dirMap[e.code]
      if (dir) {
        stateRef.current = queueDir(stateRef.current, dir)
        if (audioStarted.current) snakeAudio.resume()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [doRestart])

  const speedCfg = SPEEDS[ui.speed]

  return (
    <GameShell gameId={GAME_ID} title={TITLE} score={score} onRestart={doRestart}>
      <div className="flex items-center justify-center w-full h-full bg-[#020408] gap-6 px-4 py-4 overflow-auto">

        {/* Canvas */}
        <div
          className="relative flex-shrink-0"
          style={{
            border: '1px solid rgba(0,255,231,0.2)',
            boxShadow: '0 0 28px rgba(0,255,231,0.1), inset 0 0 28px rgba(0,255,231,0.02)',
          }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            style={{ display: 'block' }}
          />

          {/* Corner accents */}
          {(['top-0 left-0 border-t border-l','top-0 right-0 border-t border-r',
             'bottom-0 left-0 border-b border-l','bottom-0 right-0 border-b border-r'] as const
          ).map((cls, i) => (
            <div key={i} className={`absolute w-3 h-3 border-[#00ffe7]/60 ${cls}`} />
          ))}

          {/* Overlay: waiting */}
          {ui.phase === 'waiting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
              <p className="font-arcade text-3xl font-bold tracking-widest mb-1"
                 style={{ color: '#00ffe7', textShadow: '0 0 20px #00ffe7, 0 0 40px #00ffe760' }}>
                SNAKE
              </p>
              <div className="w-24 h-px bg-[#00ffe7]/40 mb-5" />

              {/* Selector de velocidad */}
              <p className="font-arcade text-[9px] tracking-widest text-zinc-500 uppercase mb-3">
                Select Speed
              </p>
              <div className="flex gap-2 mb-6">
                {SPEED_ORDER.map((tier, i) => {
                  const cfg = SPEEDS[tier]
                  const active = ui.speed === tier
                  return (
                    <button
                      key={tier}
                      onClick={() => doRestart(tier)}
                      className="font-arcade text-[8px] tracking-widest px-3 py-1.5 border transition-all duration-150 cursor-pointer"
                      style={{
                        borderColor: active ? cfg.color : `${cfg.color}40`,
                        color: active ? '#000' : cfg.color,
                        backgroundColor: active ? cfg.color : 'transparent',
                        boxShadow: active ? `0 0 10px ${cfg.color}80` : 'none',
                      }}
                    >
                      {i + 1} {cfg.label}
                    </button>
                  )
                })}
              </div>

              <p className="font-arcade text-[10px] tracking-widest text-zinc-400 animate-pulse">
                PRESS ENTER TO START
              </p>
            </div>
          )}

          {/* Overlay: game over */}
          {ui.phase === 'gameover' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm">
              <p className="font-arcade text-2xl font-bold tracking-widest mb-1"
                 style={{ color: '#ff006e', textShadow: '0 0 20px #ff006e, 0 0 40px #ff006e60' }}>
                GAME OVER
              </p>
              <div className="w-24 h-px bg-[#ff006e]/40 mb-4" />
              <p className="font-arcade text-[10px] tracking-widest text-zinc-400 mb-1">
                LENGTH: {ui.length}
              </p>
              <p className="font-arcade text-[10px] tracking-widest text-zinc-400 mb-5">
                TIME: {formatTime(ui.elapsedMs)}
              </p>
              <p className="font-arcade text-sm text-[#00ffe7]"
                 style={{ textShadow: '0 0 10px #00ffe7' }}>
                {String(score).padStart(8, '0')}
              </p>
              <p className="font-arcade text-[9px] tracking-widest text-zinc-500 mt-5 animate-pulse">
                PRESS ENTER TO RESTART
              </p>
            </div>
          )}

          {/* Overlay: victoria */}
          {ui.phase === 'win' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm">
              <p className="font-arcade text-2xl font-bold tracking-widest mb-1"
                 style={{ color: '#ffd700', textShadow: '0 0 20px #ffd700, 0 0 40px #ffd70060' }}>
                YOU WIN!
              </p>
              <div className="w-24 h-px bg-[#ffd700]/40 mb-4" />
              <p className="font-arcade text-[10px] tracking-widest text-zinc-400 mb-5">
                TIME: {formatTime(ui.elapsedMs)}
              </p>
              <p className="font-arcade text-sm text-[#ffd700]"
                 style={{ textShadow: '0 0 10px #ffd700' }}>
                {String(score).padStart(8, '0')}
              </p>
              <p className="font-arcade text-[9px] tracking-widest text-zinc-500 mt-5 animate-pulse">
                PRESS ENTER TO RESTART
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-3 flex-shrink-0" style={{ width: 160 }}>

          {/* Stats */}
          <div className="border border-[#00ffe7]/10 bg-[#060d18] p-3">
            {([
              ['Time',   formatTime(ui.elapsedMs), '#00ffe7'],
              ['Length', String(ui.length).padStart(4, '0'), '#c77dff'],
            ] as const).map(([label, value, color]) => (
              <div key={label} className="mb-3 last:mb-0">
                <p className="font-arcade text-[8px] tracking-widest text-zinc-500 uppercase mb-0.5">{label}</p>
                <p className="font-arcade text-base tabular-nums" style={{ color, textShadow: `0 0 8px ${color}80` }}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Velocidad activa */}
          <div className="border bg-[#060d18] p-3"
               style={{ borderColor: `${speedCfg.color}30` }}>
            <p className="font-arcade text-[8px] tracking-widest text-zinc-500 uppercase mb-1">Speed</p>
            <p className="font-arcade text-sm font-bold" style={{ color: speedCfg.color, textShadow: `0 0 8px ${speedCfg.color}80` }}>
              {speedCfg.label}
            </p>
            <p className="font-arcade text-[8px] tracking-widest mt-1" style={{ color: `${speedCfg.color}80` }}>
              ×{speedCfg.multiplier} pts
            </p>
          </div>

          {/* Velocidades disponibles */}
          <div className="border border-[#00ffe7]/10 bg-[#060d18] p-3">
            <p className="font-arcade text-[7px] tracking-widest text-zinc-600 uppercase mb-2">Speeds</p>
            <div className="flex flex-col gap-1">
              {SPEED_ORDER.map((tier, i) => {
                const cfg = SPEEDS[tier]
                const active = ui.speed === tier
                return (
                  <div key={tier} className="flex items-center justify-between gap-1">
                    <span className="font-arcade text-[7px] flex-shrink-0"
                          style={{ color: active ? cfg.color : `${cfg.color}50` }}>
                      {i + 1}
                    </span>
                    <span className="font-arcade text-[7px] flex-shrink-0"
                          style={{ color: active ? cfg.color : `${cfg.color}50` }}>
                      {cfg.label}
                    </span>
                    <span className="font-hud text-[10px] text-zinc-600 text-right">
                      ×{cfg.multiplier}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Controles */}
          <div className="border border-[#00ffe7]/10 bg-[#060d18] p-3">
            <p className="font-arcade text-[7px] tracking-widest text-zinc-600 uppercase mb-2">Controls</p>
            <div className="flex flex-col gap-1">
              {([
                ['↑↓←→ / WASD', 'Move'],
                ['ENTER',        'Start'],
                ['1–4',          'Speed'],
              ] as const).map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between gap-1">
                  <span className="font-arcade text-[7px] text-[#00ffe7]/60 bg-[#00ffe7]/5 border border-[#00ffe7]/15 px-1 py-0.5 leading-none flex-shrink-0">
                    {key}
                  </span>
                  <span className="font-hud text-[11px] text-zinc-500 text-right">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </GameShell>
  )
}
