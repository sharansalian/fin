import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/analytics'],
          readability: ['@mozilla/readability', 'dompurify'],
          router: ['react-router-dom'],
          vendor: ['date-fns', 'lucide-react'],
        },
      },
    },
  },
})
