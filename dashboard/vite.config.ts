import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.API_URL || 'http://api:3000',
        changeOrigin: true,
      },
    },
    watch: {
      usePolling: true, // required for hot reload inside Docker on Mac/Linux
    },
  },
})
