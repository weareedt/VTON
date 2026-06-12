import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In production, Vercel serves /api functions on the same origin as the static
// build, so no proxy is needed there. For a plain `vite dev` (without `vercel dev`)
// this proxies /api to a local `vercel dev` running on port 3000.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
  },
});
