/**
 * Bus de eventos liviano para comunicar los componentes 3D (dentro del Canvas)
 * con el shell React exterior sin necesidad de prop-drilling ni Context.
 * Mismo patrón que `planePosition` en ariplane.tsx.
 */

type ComboHandler = (combo: number) => void
type VoidHandler  = () => void

let _onRingCollected: ComboHandler | null = null
let _onAllCollected:  VoidHandler  | null = null

export function setOnRingCollected(cb: ComboHandler): void {
  _onRingCollected = cb
}

export function setOnAllCollected(cb: VoidHandler): void {
  _onAllCollected = cb
}

export function emitRingCollected(combo: number): void {
  _onRingCollected?.(combo)
}

export function emitAllCollected(): void {
  _onAllCollected?.()
}
