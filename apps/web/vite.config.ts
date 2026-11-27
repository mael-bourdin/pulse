import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En développement, Vite (5173) redirige l'API vers pulse-api (8080) :
// même origine pour le navigateur, donc le cookie de session fonctionne (spec/architecture.md).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:8080',
      '/health': 'http://localhost:8080',
    },
  },
})
