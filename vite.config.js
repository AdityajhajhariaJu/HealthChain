import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react()
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'framer-motion': ['framer-motion']
        }
      }
    }
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
  server: {
    port: 3009,
    host: true,
    open: false,
    allowedHosts: true
  }
})
