import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // -------------------------------------------------------------------------
  // Build Configuration
  // Output directly into public_html/ alongside the existing api/ directory.
  // emptyOutDir: false prevents Vite from wiping the PHP backend files.
  // -------------------------------------------------------------------------
  build: {
    outDir: 'public_html',
    emptyOutDir: false,
    sourcemap: false,
    rollupOptions: {
      output: {
        // Place all compiled assets into an assets/ subdirectory.
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },

  // -------------------------------------------------------------------------
  // Dev Server Configuration
  // Proxy /api requests to a local PHP development server or production.
  // -------------------------------------------------------------------------
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
