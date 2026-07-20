import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: './', // Permette all'app di funzionare in qualsiasi cartella (root o sottocartella)
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
}))
