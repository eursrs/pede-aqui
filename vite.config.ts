import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // GitHub Pages serves the site from /carda-io/.
  base: process.env.GITHUB_PAGES === '1' ? '/carda-io/' : '/',
  plugins: [react()],
  // Listen on all interfaces so a phone on the same Wi-Fi can open
  // the site via the LAN IP printed by Vite (useful for QR testing).
  server: {
    host: true,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
