import { AUDIO_ASSETS, type AssetKey } from './audioAssets'

// ─── Tipos internos ────────────────────────────────────────────────────────────

interface LoopState {
  source: AudioBufferSourceNode
}

// ─── Constantes de smoothing ───────────────────────────────────────────────────

/** Factor de lerp por frame (~60 fps → τ ≈ 0.33 s). */
const LERP = 0.05
/** Anti-spam mínimo entre SFX de anillo (ms). */
const RING_GAP_MS = 60
/** Duración del ducking tras la victoria (ms). */
const DUCK_DURATION_MS = 800

// ─── Clase ─────────────────────────────────────────────────────────────────────

export class AudioManager {
  // Contexto y grafo de ganancia
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private engineGain: GainNode | null = null
  private boostGain: GainNode | null = null
  private sfxGain: GainNode | null = null

  // Buffers cargados
  private buffers: Partial<Record<AssetKey, AudioBuffer>> = {}

  // Loops en curso
  private engineLoop: LoopState | null = null
  private boostLoop: LoopState | null = null

  // Estado de suavizado del motor
  private engRateTarget = 0.85
  private engVolTarget  = 0.15
  private engRateCur    = 0.85
  private engVolCur     = 0.15

  // Estado de suavizado del boost
  private bstRateTarget = 0.95
  private bstVolTarget  = 0.0
  private bstRateCur    = 0.95
  private bstVolCur     = 0.0

  // Anti-spam anillo
  private lastRingMs = 0

  // Ducking
  private duckTimer: ReturnType<typeof setTimeout> | null = null

  // Visibilidad
  private visHandler: (() => void) | null = null

  // ─── Ciclo de vida ───────────────────────────────────────────────────────────

  async init(): Promise<void> {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume()
      return
    }

    this.ctx = new AudioContext()
    if (this.ctx.state === 'suspended') await this.ctx.resume()

    // Master gain → destination
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = 1.0
    this.masterGain.connect(this.ctx.destination)

    // Engine gain
    this.engineGain = this.ctx.createGain()
    this.engineGain.gain.value = 0.15
    this.engineGain.connect(this.masterGain)

    // Boost gain (comienza silencioso)
    this.boostGain = this.ctx.createGain()
    this.boostGain.gain.value = 0.0
    this.boostGain.connect(this.masterGain)

    // SFX gain
    this.sfxGain = this.ctx.createGain()
    this.sfxGain.gain.value = 0.8
    this.sfxGain.connect(this.masterGain)

    // Listener de visibilidad
    this.visHandler = () => { this.handleVisibilityChange() }
    document.addEventListener('visibilitychange', this.visHandler)
  }

  async loadAll(): Promise<void> {
    if (!this.ctx) throw new Error('[AudioManager] Llamar init() primero.')

      const entries = Object.entries(AUDIO_ASSETS) as [AssetKey, string][]

    await Promise.all(
      entries.map(async ([key, url]) => {
        try {
          const res = await fetch(url)
          if (!res.ok) throw new Error(`HTTP ${res.status}`)

          // Si el servidor devuelve HTML (ej: SPA fallback por archivo inexistente),
          // el ArrayBuffer no es audio válido → evitar el EncodingError confuso.
          const ct = res.headers.get('content-type') ?? ''
          if (ct.includes('text/html')) {
            console.warn(
              `[AudioManager] "${key}" no encontrado en ${url}. ` +
              `Colocar el archivo en /public/audio/ para activar el sonido.`
            )
            return
          }

          const raw = await res.arrayBuffer()
          const ctx = this.ctx
          if (!ctx) return
          this.buffers[key] = await ctx.decodeAudioData(raw)
        } catch (err) {
          console.warn(`[AudioManager] No se pudo cargar "${key}" (${url}):`, err)
        }
      })
    )
  }

  /**
   * Arranca ambos loops. Engine con gain normal; boost con gain=0.
   * Ambos corren siempre para evitar pops al activar/desactivar.
   */
  start(): void {
    if (!this.ctx || !this.engineGain || !this.boostGain) return

    if (this.buffers.engine) {
      this.engineLoop = this.startLoop(this.buffers.engine, this.engineGain)
    }
    if (this.buffers.boost) {
      this.boostLoop = this.startLoop(this.buffers.boost, this.boostGain)
    }
  }

  private startLoop(buffer: AudioBuffer, outGain: GainNode): LoopState {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.loop   = true
    src.connect(outGain)
    src.start()
    return { source: src }
  }

  // ─── Actualización por frame ─────────────────────────────────────────────────

  /**
   * Llamar desde useFrame cada tick.
   * @param speedNormalized  0..1 (0 = velocidad base, 1 = máx con turbo)
   * @param nitroActive      true si el jugador tiene el turbo activo
   */
  setEngineParams(speedNormalized: number, nitroActive: boolean): void {
    if (!this.ctx || !this.engineGain || !this.boostGain) return
    if (this.ctx.state !== 'running') return

    const s = Math.max(0, Math.min(1, speedNormalized))

    // Objetivos del motor
    this.engRateTarget = 0.85 + s * 0.40
    this.engVolTarget  = 0.15 + s * 0.30
    if (nitroActive) {
      this.engRateTarget += 0.08
      this.engVolTarget  += 0.08
    }

    // Objetivos del boost (air rush)
    this.bstRateTarget = 0.95 + s * 0.20
    this.bstVolTarget  = nitroActive ? 0.20 + s * 0.15 : 0.0

    // Lerp suave
    this.engRateCur += (this.engRateTarget - this.engRateCur) * LERP
    this.engVolCur  += (this.engVolTarget  - this.engVolCur)  * LERP
    this.bstRateCur += (this.bstRateTarget - this.bstRateCur) * LERP
    this.bstVolCur  += (this.bstVolTarget  - this.bstVolCur)  * LERP

    // Aplicar
    if (this.engineLoop) {
      this.engineLoop.source.playbackRate.value = this.engRateCur
      this.engineGain.gain.value = this.engVolCur
    }
    if (this.boostLoop) {
      this.boostLoop.source.playbackRate.value = this.bstRateCur
      this.boostGain.gain.value = this.bstVolCur
    }
  }

  // ─── SFX ─────────────────────────────────────────────────────────────────────

  /**
   * Dispara el SFX de anillo con pitch escalado por combo.
   * Incluye anti-spam: máximo 1 disparo cada RING_GAP_MS.
   */
  playRing(combo: number): void {
    if (!this.ctx || !this.sfxGain || !this.buffers.ring) return

    const now = Date.now()
    if (now - this.lastRingMs < RING_GAP_MS) return
    this.lastRingMs = now

    const rate = Math.min(1.0 + combo * 0.03, 1.25)
    this.oneShot(this.buffers.ring, this.sfxGain, rate, 0.70)
  }

  /** Dispara el SFX de victoria y aplica ducking al master por ~800 ms. */
  playWin(): void {
    if (!this.ctx || !this.sfxGain || !this.buffers.win) return
    this.oneShot(this.buffers.win, this.sfxGain, 1.0, 0.90)
    this.duck()
  }

  private oneShot(
    buffer: AudioBuffer,
    out: GainNode,
    rate: number,
    volume: number,
  ): void {
    if (!this.ctx) return
    const src  = this.ctx.createBufferSource()
    const gain = this.ctx.createGain()
    src.buffer = buffer
    src.playbackRate.value = rate
    gain.gain.value = volume
    src.connect(gain)
    gain.connect(out)
    src.start()
  }

  private duck(): void {
    if (!this.masterGain || !this.ctx) return
    if (this.duckTimer) clearTimeout(this.duckTimer)

    const t = this.ctx.currentTime
    this.masterGain.gain.cancelScheduledValues(t)
    this.masterGain.gain.setTargetAtTime(0.6, t, 0.05)

    this.duckTimer = setTimeout(() => {
      if (!this.masterGain || !this.ctx) return
      this.masterGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.15)
    }, DUCK_DURATION_MS)
  }

  // ─── Control global ──────────────────────────────────────────────────────────

  setMasterMuted(muted: boolean): void {
    if (!this.masterGain || !this.ctx) return
    const t = this.ctx.currentTime
    this.masterGain.gain.cancelScheduledValues(t)
    this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, t, 0.05)
  }

  handleVisibilityChange(): void {
    if (!this.masterGain || !this.ctx) return
    const t = this.ctx.currentTime
    this.masterGain.gain.cancelScheduledValues(t)
    if (document.hidden) {
      this.masterGain.gain.setTargetAtTime(0, t, 0.05)
    } else {
      this.masterGain.gain.setTargetAtTime(1, t, 0.10)
    }
  }

  /** Detiene todo y cierra el contexto. Llamar al desmontar el componente. */
  destroy(): void {
    if (this.visHandler) {
      document.removeEventListener('visibilitychange', this.visHandler)
      this.visHandler = null
    }
    if (this.duckTimer) {
      clearTimeout(this.duckTimer)
      this.duckTimer = null
    }
    try { this.engineLoop?.source.stop() } catch { /* ya terminó */ }
    try { this.boostLoop?.source.stop()  } catch { /* ya terminó */ }
    this.engineLoop = null
    this.boostLoop  = null
    this.ctx?.close()
    this.ctx = null
  }
}

/** Singleton compartido entre todos los componentes del juego. */
export const audioManager = new AudioManager()
