import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Forwards /api/* to the backend during `npm run dev`, so the
      // frontend code can always call a relative '/api' path - the
      // same code works unchanged once this gets containerized,
      // where nginx does this same forwarding job instead of Vite.
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
