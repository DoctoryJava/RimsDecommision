import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // @ts-ignore - tsconfigPaths is valid in Vite 8
    tsconfigPaths: true,
  },
  optimizeDeps: {
    include: ['lucide-react','axios'],
  },
  server: {
    host: true,
    port: 80,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8088',
        changeOrigin: true,
      },
    },
  },
  // @ts-ignore - vitest test config
  test: {
    environment: 'jsdom',
    globals: true,
  },
} as any);
