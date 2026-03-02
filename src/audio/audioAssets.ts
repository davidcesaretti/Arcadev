export const AUDIO_ASSETS = {
  engine: '/audio/airplane_engine.wav',
  boost:  '/audio/air_rush.wav',
  ring:   '/audio/ring_collected.wav',
  win:    '/audio/win.mp3',
} as const

export type AssetKey = keyof typeof AUDIO_ASSETS
