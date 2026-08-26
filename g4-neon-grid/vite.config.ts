import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@game/core': path.resolve(__dirname, '../packages/core/src'),
      '@game/sdk': path.resolve(__dirname, '../packages/sdk/src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
  server: { host: '0.0.0.0', port: 5173 },
});