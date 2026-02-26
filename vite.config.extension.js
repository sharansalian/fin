import { defineConfig } from 'vite';

// Separate build config for the Chrome extension.
// Bundles extension/src/popup.js → extension/popup.bundle.js as a self-contained IIFE.
// Run: npm run build:ext
export default defineConfig({
  publicDir: false, // don't copy public/ into the extension output folder
  build: {
    outDir: 'extension',
    emptyOutDir: false, // don't wipe manifest.json / popup.html / icons
    lib: {
      entry: 'extension/src/popup.js',
      name: 'PocketExt',
      fileName: () => 'popup.bundle.js',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        // Inline everything — extension popup has no module loader
        inlineDynamicImports: true,
      },
    },
  },
});
