import { useEffect, useRef, useState, useCallback } from 'react'
import { GameShell } from '../_shared/shell/GameShell'
import {
  GAME_ID,
  TITLE,
  COLS,
  ROWS,
  CELL_SIZE,
  PREVIEW_CELL,
  SHAPES,
  COLORS,
  LINE_CLEAR_MS,
  PETRIFY_MS,
} from './constants'
import type { PieceName } from './constants'
import { createState, tick, handleInput, type State } from './game'
import { audio } from './audio'

// ── Color utils ─────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a)
  const [br, bg, bb] = hexToRgb(b)
  const r = Math.round((ar ?? 0) + ((br ?? 0) - (ar ?? 0)) * t)
  const g = Math.round((ag ?? 0) + ((bg ?? 0) - (ag ?? 0)) * t)
  const bl = Math.round((ab ?? 0) + ((bb ?? 0) - (ab ?? 0)) * t)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`
}

const STONE_COLOR = '#3a3a4a'
const BOARD_BG = '#01080e'
const GRID_COLOR = 'rgba(0,255,231,0.05)'

// ── Canvas drawing ──────────────────────────────────────────────────────────

function drawCell(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  color: string,
  alpha = 1,
  glowIntensity = 12,
  cs = CELL_SIZE
) {
  const px = col * cs
  const py = row * cs
  const pad = 1.5

  ctx.save()
  ctx.globalAlpha = alpha

  if (glowIntensity > 0) {
    ctx.shadowColor = color
    ctx.shadowBlur = glowIntensity
  }

  ctx.fillStyle = color
  ctx.fillRect(px + pad, py + pad, cs - pad * 2, cs - pad * 2)

  ctx.shadowBlur = 0

  // top-left highlight
  ctx.fillStyle = 'rgba(255,255,255,0.22)'
  ctx.fillRect(px + pad, py + pad, cs - pad * 2, 3)
  ctx.fillRect(px + pad, py + pad, 3, cs - pad * 2)

  // bottom-right shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.fillRect(px + pad, py + cs - pad - 3, cs - pad * 2, 3)
  ctx.fillRect(px + cs - pad - 3, py + pad, 3, cs - pad * 2)

  ctx.restore()
}

function drawBoard(ctx: CanvasRenderingContext2D, state: State) {
  const W = COLS * CELL_SIZE
  const H = ROWS * CELL_SIZE
  const petrifyProgress =
    state.phase === 'gameover'
      ? 1
      : state.petrifyMs > 0
        ? 1 - state.petrifyMs / PETRIFY_MS
        : 0
  const clearProgress =
    state.clearMs > 0 ? 1 - state.clearMs / LINE_CLEAR_MS : 0
  const clearSet = new Set(state.clearRows)
  const isTetris = state.clearRows.length === 4

  // background
  ctx.fillStyle = BOARD_BG
  ctx.fillRect(0, 0, W, H)

  // grid
  ctx.strokeStyle = GRID_COLOR
  ctx.lineWidth = 1
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath()
    ctx.moveTo(c * CELL_SIZE, 0)
    ctx.lineTo(c * CELL_SIZE, H)
    ctx.stroke()
  }
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath()
    ctx.moveTo(0, r * CELL_SIZE)
    ctx.lineTo(W, r * CELL_SIZE)
    ctx.stroke()
  }

  // board cells
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = state.board[r]?.[c]
      if (!cell) continue

      let color = cell
      let glow = 8

      // petrification wave (sweeps top→bottom)
      if (petrifyProgress > 0) {
        const wave = 4
        const amount = Math.max(
          0,
          Math.min(1, (petrifyProgress * (ROWS + wave) - r) / wave)
        )
        if (amount > 0) {
          color = lerpColor(color, STONE_COLOR, amount)
          glow = Math.round(8 * (1 - amount))
        }
      }

      // line-clear flash
      if (clearSet.has(r)) {
        const flashColor = isTetris ? '#ffffff' : '#00ffe7'
        const flashT =
          clearProgress < 0.5 ? clearProgress * 2 : (1 - clearProgress) * 2
        color = lerpColor(color, flashColor, flashT * 0.9)
        glow = 20
      }

      drawCell(ctx, c, r, color, 1, glow)
    }
  }

  // ghost piece
  if (state.piece && state.phase === 'playing') {
    const { shape, x, color } = state.piece
    const gy = state.ghostY
    ctx.save()
    ctx.globalAlpha = 0.25
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.shadowColor = color
    ctx.shadowBlur = 6
    for (let r = 0; r < shape.length; r++) {
      const row = shape[r]
      if (!row) continue
      for (let c = 0; c < row.length; c++) {
        if (!row[c]) continue
        const px = (x + c) * CELL_SIZE + 1.5
        const py = (gy + r) * CELL_SIZE + 1.5
        ctx.strokeRect(px, py, CELL_SIZE - 3, CELL_SIZE - 3)
      }
    }
    ctx.restore()
  }

  // active piece
  if (
    state.piece &&
    (state.phase === 'playing' || state.phase === 'petrifying')
  ) {
    const { shape, x, y, color } = state.piece
    for (let r = 0; r < shape.length; r++) {
      const row = shape[r]
      if (!row) continue
      for (let c = 0; c < row.length; c++) {
        if (!row[c]) continue
        drawCell(ctx, x + c, y + r, color, 1, 16)
      }
    }
  }

  // tetris flash (whole board white flash at start of 4-line clear)
  if (isTetris && clearProgress < 0.15) {
    ctx.save()
    ctx.globalAlpha = ((0.15 - clearProgress) / 0.15) * 0.5
    ctx.fillStyle = '#00ffe7'
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }

  // CRT scanlines
  ctx.save()
  ctx.globalAlpha = 0.04
  for (let r = 0; r < H; r += 4) {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, r, W, 2)
  }
  ctx.restore()
}

function drawPreview(
  ctx: CanvasRenderingContext2D,
  name: PieceName,
  opacity = 1
) {
  const shape = SHAPES[name] as number[][]
  const color = COLORS[name]
  const cols = shape[0]?.length ?? 0
  const rows = shape.length
  const W = ctx.canvas.width
  const H = ctx.canvas.height
  const cs = PREVIEW_CELL

  ctx.fillStyle = '#010810'
  ctx.fillRect(0, 0, W, H)

  const offX = Math.floor((W - cols * cs) / 2)
  const offY = Math.floor((H - rows * cs) / 2)

  for (let r = 0; r < rows; r++) {
    const row = shape[r]
    if (!row) continue
    for (let c = 0; c < row.length; c++) {
      if (!row[c]) continue
      const px = offX + c * cs + 1.5
      const py = offY + r * cs + 1.5
      ctx.save()
      ctx.globalAlpha = opacity
      ctx.shadowColor = color
      ctx.shadowBlur = 10
      ctx.fillStyle = color
      ctx.fillRect(px, py, cs - 3, cs - 3)
      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.fillRect(px, py, cs - 3, 2)
      ctx.restore()
    }
  }
}

// ── React component ──────────────────────────────────────────────────────────

interface UiState {
  score: number
  level: number
  lines: number
  phase: State['phase']
  queue: PieceName[]
}

export default function TetrisGame() {
  const boardRef = useRef<HTMLCanvasElement>(null)
  const preview0 = useRef<HTMLCanvasElement>(null)
  const preview1 = useRef<HTMLCanvasElement>(null)
  const preview2 = useRef<HTMLCanvasElement>(null)

  const stateRef = useRef<State>(createState())
  const audioStarted = useRef(false)
  const [score, setScore] = useState(0)
  const [isGameOver, setIsGameOver] = useState(false)
  const [ui, setUi] = useState<UiState>({
    score: 0,
    level: 0,
    lines: 0,
    phase: 'playing',
    queue: stateRef.current.queue,
  })

  const doRestart = useCallback(() => {
    const fresh = createState()
    stateRef.current = fresh
    setScore(0)
    setIsGameOver(false)
    setUi({
      score: 0,
      level: 0,
      lines: 0,
      phase: 'playing',
      queue: fresh.queue,
    })
    if (audioStarted.current) {
      audio.restart()
      audio.startMusic()
    }
  }, [])

  const handleRestart = doRestart

  // Game loop
  useEffect(() => {
    const board = boardRef.current
    const ctx = board?.getContext('2d') ?? null
    if (!board || !ctx) return

    const safeCtx: CanvasRenderingContext2D = ctx

    let running = true
    let lastTime = performance.now()
    let rafId = 0

    function loop() {
      if (!running) return
      const now = performance.now()
      const delta = Math.min(now - lastTime, 50)
      lastTime = now

      const prev = stateRef.current
      stateRef.current = tick(prev, delta)
      const s = stateRef.current

      drawBoard(safeCtx, s)

      const previews = [preview0, preview1, preview2]
      previews.forEach((ref, i) => {
        const c = ref.current
        if (!c) return
        const pCtx = c.getContext('2d')
        if (!pCtx) return
        const name = s.queue[i]
        if (name) drawPreview(pCtx, name, i === 0 ? 1 : i === 1 ? 0.65 : 0.4)
      })

      if (
        s.score !== prev.score ||
        s.level !== prev.level ||
        s.lines !== prev.lines ||
        s.phase !== prev.phase
      ) {
        setScore(s.score)
        setUi({
          score: s.score,
          level: s.level,
          lines: s.lines,
          phase: s.phase,
          queue: s.queue,
        })
        if (s.phase === 'gameover' && prev.phase !== 'gameover') {
          setIsGameOver(true)
        }
      }

      if (audioStarted.current) {
        if (s.lockId !== prev.lockId) audio.playLock()
        if (s.clearRows.length > 0 && prev.clearRows.length === 0)
          audio.playClear(s.clearRows.length)
        if (s.phase === 'gameover' && prev.phase !== 'gameover') {
          audio.stopMusic()
          audio.playGameOver()
          setTimeout(() => { if (audioStarted.current) audio.startGameOverMusic() }, 950)
        }
        if (s.level !== prev.level)
          audio.setTempo(Math.min(230, 150 + s.level * 8))
      }

      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => {
      running = false
      cancelAnimationFrame(rafId)
    }
  }, [])

  // Keyboard input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const preventDefaults = [
        'ArrowLeft',
        'ArrowRight',
        'ArrowDown',
        'ArrowUp',
        'Space',
        'KeyZ',
        'KeyX',
      ]
      if (preventDefaults.includes(e.code)) e.preventDefault()

      if (!audioStarted.current && e.type === 'keydown') {
        audioStarted.current = true
        audio.startMusic()
      } else if (audioStarted.current) {
        audio.resume()
      }

      if (
        e.repeat &&
        ['ArrowUp', 'KeyZ', 'KeyX', 'Space', 'Enter'].includes(e.code)
      )
        return

      // Restart: manejado explícitamente para actualizar React state desde aquí
      if (e.code === 'Enter' && e.type === 'keydown') {
        doRestart()
        return
      }

      let action: string | null = null
      switch (e.code) {
        case 'ArrowLeft':
          action = 'left'
          break
        case 'ArrowRight':
          action = 'right'
          break
        case 'ArrowDown':
          action = 'softdrop'
          break
        case 'Space':
          action = 'harddrop'
          break
        case 'ArrowUp':
        case 'KeyX':
          action = 'rotatecw'
          break
        case 'KeyZ':
          action = 'rotateccw'
          break
      }
      if (action) {
        stateRef.current = handleInput(
          stateRef.current,
          action,
          e.type === 'keydown'
        )
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
    }
  }, [doRestart])

  const boardW = COLS * CELL_SIZE
  const boardH = ROWS * CELL_SIZE
  const sidebarW = 164
  const previewW = sidebarW - 12
  const previewH = 90

  const statCell = (label: string, value: string, color: string) => (
    <div className="mb-3 last:mb-0">
      <p className="font-arcade text-[8px] tracking-widest text-zinc-500 uppercase mb-0.5">
        {label}
      </p>
      <p
        className="font-arcade text-base tabular-nums"
        style={{ color, textShadow: `0 0 8px ${color}80` }}
      >
        {value}
      </p>
    </div>
  )

  return (
    <GameShell
      gameId={GAME_ID}
      title={TITLE}
      score={score}
      onRestart={handleRestart}
    >
      <div className="flex items-center justify-center w-full h-full bg-[#020408] gap-5 px-4 overflow-auto py-4">
        {/* Board */}
        <div
          className="relative flex-shrink-0"
          style={{
            border: '1px solid rgba(0,255,231,0.2)',
            boxShadow:
              '0 0 24px rgba(0,255,231,0.1), inset 0 0 24px rgba(0,255,231,0.02)',
          }}
        >
          <canvas
            ref={boardRef}
            width={boardW}
            height={boardH}
            style={{ display: 'block' }}
          />

          {/* Corner accents */}
          {(
            [
              'top-0 left-0 border-t border-l',
              'top-0 right-0 border-t border-r',
              'bottom-0 left-0 border-b border-l',
              'bottom-0 right-0 border-b border-r',
            ] as const
          ).map((cls, i) => (
            <div
              key={i}
              className={`absolute w-3 h-3 border-[#00ffe7]/60 ${cls}`}
            />
          ))}

          {/* Game over overlay */}
          {isGameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
              <p
                className="font-arcade text-2xl font-bold tracking-widest mb-1"
                style={{
                  color: '#ff006e',
                  textShadow: '0 0 20px #ff006e, 0 0 40px #ff006e60',
                }}
              >
                GAME OVER
              </p>
              <div className="w-24 h-px bg-[#ff006e]/40 mb-4" />
              <p className="font-arcade text-[10px] tracking-widest text-zinc-400 mb-5">
                PRESS ENTER TO RESTART
              </p>
              <p
                className="font-arcade text-sm text-[#00ffe7]"
                style={{ textShadow: '0 0 10px #00ffe7' }}
              >
                {String(ui.score).padStart(8, '0')}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div
          className="flex flex-col gap-3 flex-shrink-0"
          style={{ width: sidebarW }}
        >
          {/* Next pieces */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px flex-1 bg-[#00ffe7]/20" />
              <p className="font-arcade text-[8px] tracking-widest text-[#00ffe7]/50 uppercase">
                Next
              </p>
              <div className="h-px flex-1 bg-[#00ffe7]/20" />
            </div>
            <div className="flex flex-col gap-1.5">
              {([preview0, preview1, preview2] as const).map((ref, i) => (
                <div
                  key={i}
                  style={{
                    border: `1px solid rgba(0,255,231,${i === 0 ? 0.25 : 0.08})`,
                    boxShadow:
                      i === 0 ? '0 0 8px rgba(0,255,231,0.08)' : 'none',
                  }}
                >
                  <canvas
                    ref={ref}
                    width={previewW}
                    height={previewH}
                    style={{ display: 'block', width: '100%' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="border border-[#00ffe7]/10 bg-[#060d18] p-3">
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#00ffe7]/40" />
            {statCell(
              'Level',
              String(ui.level + 1).padStart(2, '0'),
              '#00ffe7'
            )}
            {statCell('Lines', String(ui.lines).padStart(4, '0'), '#ffd700')}
          </div>

          {/* Controls */}
          <div className="border border-[#00ffe7]/10 bg-[#060d18] p-3">
            <p className="font-arcade text-[7px] tracking-widest text-zinc-600 uppercase mb-2">
              Controls
            </p>
            <div className="flex flex-col gap-1">
              {(
                [
                  ['← →', 'Move'],
                  ['↓', 'Soft drop'],
                  ['SPACE', 'Hard drop'],
                  ['↑ / X', 'Rotate ↻'],
                  ['Z', 'Rotate ↺'],
                  ['ENTER', 'Restart'],
                ] as const
              ).map(([key, desc]) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-1"
                >
                  <span className="font-arcade text-[7px] text-[#00ffe7]/60 bg-[#00ffe7]/5 border border-[#00ffe7]/15 px-1 py-0.5 leading-none flex-shrink-0">
                    {key}
                  </span>
                  <span className="font-hud text-[11px] text-zinc-500 text-right">
                    {desc}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </GameShell>
  )
}
