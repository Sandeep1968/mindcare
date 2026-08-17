import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const apiProxy = { '/api': 'http://localhost:4000' }

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: apiProxy,
  },
  // `vite preview` (serving the production build locally) doesn't inherit
  // `server.proxy` — without this, /api calls would 404 against the preview
  // server itself, or force a real cross-origin request to the API.
  preview: {
    port: 4173,
    proxy: apiProxy,
  },
})
