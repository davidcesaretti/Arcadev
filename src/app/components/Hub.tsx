import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GAMES } from '../routes/gameRegistry'
import type { GameMeta } from '../../games/_shared/types'

/* ─────────────────────── Background ─────────────────────── */
function Background() {
  const stars = Array.from({ length: 120 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 200,
    size: Math.random() * 2 + 0.5,
    opacity: Math.random() * 0.7 + 0.2,
    delay: Math.random() * 4,
  }))

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Deep space gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#020408] via-[#040d1a] to-[#020408]" />

      {/* Nebula blobs */}
      <div className="absolute top-[-10%] left-[20%] w-[60vw] h-[50vh] rounded-full bg-[#00ffe7]/[0.025] blur-[100px]" />
      <div className="absolute bottom-[10%] right-[-5%] w-[40vw] h-[40vh] rounded-full bg-[#bf00ff]/[0.03] blur-[100px]" />
      <div className="absolute top-[40%] left-[-10%] w-[30vw] h-[30vh] rounded-full bg-[#ff006e]/[0.02] blur-[80px]" />

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,255,231,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,231,0.8) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          perspectiveOrigin: '50% 0%',
        }}
      />

      {/* Drifting stars */}
      <div className="stars-layer absolute top-0 left-0 w-full" style={{ height: '200%' }}>
        {stars.map((s) => (
          <div
            key={s.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              opacity: s.opacity,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Horizontal scanline accent */}
      <div className="absolute top-1/2 left-0 w-full h-px bg-[#00ffe7]/10 blur-sm" />
    </div>
  )
}

/* ─────────────────────── Kind badge ─────────────────────── */
function KindBadge({ kind }: { kind: GameMeta['kind'] }) {
  return (
    <span
      className={[
        'font-arcade text-[9px] tracking-widest px-2 py-0.5 border',
        kind === '2d'
          ? 'border-emerald-400/60 text-emerald-400 bg-emerald-400/10'
          : 'border-violet-400/60 text-violet-400 bg-violet-400/10',
      ].join(' ')}
    >
      {kind.toUpperCase()}
    </span>
  )
}

/* ─────────────────────── Game card ─────────────────────── */
function GameCard({ game, index }: { game: GameMeta; index: number }) {
  const [hovered, setHovered] = useState(false)

  return (
    <article
      className="card-animate relative flex flex-col bg-[#060d18] border border-[#00ffe7]/10 overflow-hidden cursor-pointer group"
      style={{ animationDelay: `${index * 0.1 + 0.2}s` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Running border top */}
      {hovered && (
        <div className="absolute top-0 left-0 right-0 h-[2px] card-border-run" />
      )}
      {!hovered && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#00ffe7]/20" />
      )}

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#00ffe7]/60" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#00ffe7]/60" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#00ffe7]/60" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#00ffe7]/60" />

      {/* Hover glow overlay */}
      <div
        className="absolute inset-0 bg-[#00ffe7]/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
      />

      <div className="relative p-6 flex flex-col h-full">
        {/* Index + badge row */}
        <div className="flex items-center justify-between mb-4">
          <span className="font-arcade text-[#00ffe7]/30 text-xs">
            {String(index + 1).padStart(2, '0')}
          </span>
          <KindBadge kind={game.kind} />
        </div>

        {/* Title */}
        <h2 className="font-arcade text-white text-xl font-bold tracking-wider mb-2 group-hover:text-[#00ffe7] transition-colors duration-200">
          {game.title}
        </h2>

        {/* Separator */}
        <div className="w-8 h-[2px] bg-[#00ffe7]/40 mb-3 group-hover:w-16 transition-all duration-300" />

        {/* Description */}
        <p className="font-hud text-zinc-400 text-[15px] flex-1 mb-6 leading-relaxed">
          {game.description}
        </p>

        {/* Play button */}
        <Link
          to={`/game/${game.slug}`}
          className="relative inline-flex items-center justify-center gap-2 overflow-hidden font-arcade text-sm tracking-widest uppercase no-underline
            px-6 py-3 border border-[#00ffe7]/40 text-[#00ffe7] bg-transparent
            hover:bg-[#00ffe7] hover:text-black hover:border-[#00ffe7]
            transition-all duration-200 group/btn"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="relative z-10">▶ Play</span>
        </Link>
      </div>
    </article>
  )
}

/* ─────────────────────── Header logo ─────────────────────── */
function ArcadeLogo() {
  return (
    <div className="relative text-center select-none">
      {/* Subtitle above */}
      <p className="font-arcade text-[#00ffe7]/50 text-xs tracking-[0.4em] uppercase mb-3">
        ◈ Select Game ◈
      </p>

      {/* Main title */}
      <div className="relative inline-block">
        <h1
          className="title-glitch font-arcade text-[clamp(3rem,10vw,7rem)] font-black tracking-widest text-[#00ffe7] glow-text leading-none"
          data-text="ARCADE"
        >
          ARCADE
        </h1>
      </div>

      {/* Tagline */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <div className="h-px flex-1 max-w-[120px] bg-gradient-to-r from-transparent to-[#00ffe7]/40" />
        <p className="font-hud text-zinc-500 text-sm tracking-[0.3em] uppercase">
          Mini Game Portal
        </p>
        <div className="h-px flex-1 max-w-[120px] bg-gradient-to-l from-transparent to-[#00ffe7]/40" />
      </div>
    </div>
  )
}

/* ─────────────────────── Footer bar ─────────────────────── */
function FooterBar() {
  return (
    <footer className="relative mt-16 pb-8 text-center">
      <div className="inline-flex items-center gap-6 font-arcade text-[10px] tracking-widest text-zinc-600">
        <span>◈ KEYBOARD SUPPORT: COMING SOON</span>
        <span className="text-[#00ffe7]/20">|</span>
        <span>◈ {GAMES.length} GAMES AVAILABLE</span>
      </div>
    </footer>
  )
}

/* ─────────────────────── Hub ─────────────────────── */
export function Hub() {
  return (
    <div className="scanlines relative min-h-screen text-white">
      <Background />

      <div className="relative z-10 flex flex-col min-h-screen px-4 py-16 max-w-5xl mx-auto">
        {/* Logo / Header */}
        <header className="mb-16">
          <ArcadeLogo />
        </header>

        {/* Game grid */}
        <main>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {GAMES.map((game, i) => (
              <GameCard key={game.id} game={game} index={i} />
            ))}
          </div>
        </main>

        <FooterBar />
      </div>
    </div>
  )
}
