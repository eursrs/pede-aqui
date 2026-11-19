import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // GitHub Pages serves the site from /pede-aqui/.
  base: process.env.GITHUB_PAGES === '1' ? '/pede-aqui/' : '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        app: fileURLToPath(new URL('./app.html', import.meta.url)),
      },
    },
  },
  // Listen on all interfaces so a phone on the same Wi-Fi can open
  // the site via the LAN IP printed by Vite (useful for QR testing).
  server: {
    host: true,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
