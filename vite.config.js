import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Same-origin in development: the browser talks to /api and Vite forwards it to Express,
    // so session cookies work without any CORS setup.
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: false } },
  },
})
