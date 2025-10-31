import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ✅ Vite configuration
export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 5173,

    // ✅ Proxy API requests to Flask backend
    proxy: {
      '/api': {
        target: 'http://localhost:5000',  // Flask backend URL
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api'), // keep the same path
      },
    },
  },
  build: {
    outDir: 'dist',
  },
})
