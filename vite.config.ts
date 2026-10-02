import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Saat pengembangan frontend terpisah: `npm run dev:client`
// (proxy /api ke server lokal di port 8787)
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'client-dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1600,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': { target: 'http://localhost:8787', changeOrigin: false },
    },
  },
})
