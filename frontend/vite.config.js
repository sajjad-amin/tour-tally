import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Read VITE_* prefixed vars from the Laravel root .env
  envDir: '../',

  // Public directory containing static assets like site.webmanifest, icons, and favicons
  publicDir: 'public',

  build: {
    // Output compiled assets directly into Laravel's public/ directory
    outDir: '../public',
    // IMPORTANT: never wipe public/ — it contains index.php, .htaccess, etc.
    emptyOutDir: false,
    rollupOptions: {
      output: {
        // Put JS/CSS inside public/assets/ subfolder to stay organised
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },

  resolve: {
    alias: {
      '@': `${import.meta.dirname}/src`,
    },
  },

  server: {
    port: 5173,
    // Dev proxy: forward /api and /sanctum requests to Laravel
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/sanctum': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
