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

/* ── Botón HUD reutilizable ── */
function HudButton({
  onClick,
  children,
  variant = 'default',
}: {
  onClick: () => void
  children: ReactNode
  variant?: 'default' | 'danger'
}) {
  const base =
    'relative font-arcade text-[10px] tracking-widest uppercase px-3 py-1.5 border transition-all duration-150 cursor-pointer'
  const colors =
    variant === 'danger'
      ? 'border-rose-500/50 text-rose-400 hover:bg-rose-500 hover:text-black hover:border-rose-500'
      : 'border-[#00ffe7]/30 text-[#00ffe7]/80 hover:bg-[#00ffe7] hover:text-black hover:border-[#00ffe7]'

  return (
    <button type="button" onClick={onClick} className={`${base} ${colors}`}>
      {children}
    </button>
  )
}

/* ── Stat (score / best) ── */
function HudStat({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center leading-none">
      <span className="font-arcade text-[8px] tracking-[0.2em] text-zinc-500 uppercase mb-0.5">
        {label}
      </span>
      <span
        className={[
          'font-arcade text-base font-bold tabular-nums',
          highlight ? 'text-amber-400' : 'text-[#00ffe7]',
        ].join(' ')}
        style={
          highlight
            ? { textShadow: '0 0 8px rgba(251,191,36,0.6)' }
            : { textShadow: '0 0 8px rgba(0,255,231,0.5)' }
        }
      >
        {String(value).padStart(6, '0')}
      </span>
    </div>
  )
}

export function GameShell({ gameId, title, score, onRestart, children }: GameShellProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { bestScore, updateBestScore } = useLocalBestScore(gameId)
  const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef)

  useEffect(() => {
    if (score > bestScore) updateBestScore(score)
  }, [score, bestScore, updateBestScore])

  const currentBest = score > bestScore ? score : bestScore
  const isNewBest = score > 0 && score >= currentBest

  return (
    <div ref={containerRef} className="relative flex flex-col h-screen w-full bg-[#020408]">

      {/* ── HUD bar ── */}
      <header className="flex-shrink-0 relative z-20 flex items-center justify-between gap-2 px-4 h-12
        bg-[#060d18]/95 backdrop-blur-sm border-b border-[#00ffe7]/10">

        {/* Línea superior animada */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00ffe7]/50 to-transparent" />

        {/* Corner accent izquierdo */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#00ffe7]/50" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#00ffe7]/20" />

        {/* Corner accent derecho */}
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#00ffe7]/50" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#00ffe7]/20" />

        {/* Título izquierda */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-1 h-5 bg-[#00ffe7] flex-shrink-0" style={{ boxShadow: '0 0 6px #00ffe7' }} />
          <h1 className="font-arcade text-[11px] tracking-widest text-white uppercase truncate">
            {title}
          </h1>
        </div>

        {/* Stats centro */}
        <div className="flex items-center gap-6">
          <HudStat label="Score" value={score} />
          <div className="w-px h-6 bg-[#00ffe7]/10" />
          <HudStat label="Best" value={currentBest} highlight />
          {isNewBest && score > 0 && (
            <span className="font-arcade text-[8px] tracking-widest text-amber-400 animate-pulse">
              ★ NEW BEST
            </span>
          )}
        </div>

        {/* Controles derecha */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <HudButton onClick={onRestart}>⟳ Restart</HudButton>
          <HudButton onClick={toggleFullscreen}>
            {isFullscreen ? '⊠ Exit FS' : '⊡ Fullscreen'}
          </HudButton>
          <Link
            to="/"
            className="font-arcade text-[10px] tracking-widest uppercase px-3 py-1.5 border
              border-zinc-600/50 text-zinc-400 hover:bg-zinc-700 hover:text-white hover:border-zinc-500
              transition-all duration-150 no-underline"
          >
            ← Hub
          </Link>
        </div>
      </header>

      {/* ── Contenido del juego ── */}
      <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
    </div>
  )
}
