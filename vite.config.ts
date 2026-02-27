import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('games/tetris')) return 'tetris'
          if (id.includes('games/target-range-3d')) return 'target-range-3d'
          if (id.includes('games/ring-flight')) return 'ring-flight'
        },
      },
    },
  },
})
