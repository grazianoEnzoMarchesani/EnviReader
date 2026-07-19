import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/2.0_beta/' : '/',
  build: {
    outDir: '2.0_beta',
    emptyOutDir: true
  }
}))
