import { useParams, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { GAME_BY_SLUG, gameLoaders } from './gameRegistry'

const Fallback = () => (
  <div className="flex items-center justify-center h-screen bg-zinc-900 text-zinc-400">
    Cargando juego…
  </div>
)

export function GameRoute() {
  const { slug } = useParams<{ slug: string }>()
  if (!slug || !GAME_BY_SLUG.has(slug)) {
    return <Navigate to="/" replace />
  }

  const loader = gameLoaders[slug]
  if (!loader) {
    return <Navigate to="/" replace />
  }

  const LazyGame = lazy(loader)

  return (
    <Suspense fallback={<Fallback />}>
      <LazyGame />
    </Suspense>
  )
}
