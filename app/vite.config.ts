import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  base: '/channel-secrets/',
  build: {
    commonjsOptions: {
      // The reedsolomon package uses `this.X = X` exports which breaks in ESM strict mode.
      // This tells rollup to transform such patterns correctly.
      transformMixedEsModules: true,
    },
  },
  optimizeDeps: {
    // Force pre-bundling of reedsolomon to handle its CommonJS exports properly
    include: ['reedsolomon'],
  },
})
