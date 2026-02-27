import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api/': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/create-checkout-session': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/webhook': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
