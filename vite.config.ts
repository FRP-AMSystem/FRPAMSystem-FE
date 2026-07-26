import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Trigger config change to force Vite dev server to rebuild pre-bundled dependency cache
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://forestryresourceplanning.runasp.net',
        changeOrigin: true,
      },
    },
  },
})
