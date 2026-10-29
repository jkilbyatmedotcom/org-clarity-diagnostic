import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        culture: resolve(__dirname, 'culture.html'),
        cultureResults: resolve(__dirname, 'culture-results.html'),
        cultureLeader: resolve(__dirname, 'culture-leader.html'),
      },
    },
  },
})
