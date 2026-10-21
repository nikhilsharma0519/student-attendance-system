import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the browser talks to Vite (port 5173). Vite forwards every /api request to the
// Express server (port 5000). Because the browser only ever sees ONE origin, the secure login cookie works
// without any CORS tricks.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } },
  },
});
