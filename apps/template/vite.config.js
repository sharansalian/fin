import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ─────────────────────────────────────────────────────────────────────────────
// Vite config for a platform app.
//
// @pocket/core is a local workspace package — Vite resolves it automatically
// via the npm workspaces symlink in node_modules/@pocket/core.
// No aliases needed; just import normally:
//   import { useAuth } from '@pocket/core/context'
// ─────────────────────────────────────────────────────────────────────────────
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          vendor:   ['react', 'react-dom', 'react-router-dom', 'lucide-react'],
        },
      },
    },
  },
});
