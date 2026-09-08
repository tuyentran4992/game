import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Playables build: base './' so the zip runs anywhere without network (M3-proven config).
export default defineConfig({
  base: './',
  root: fileURLToPath(new URL('./', import.meta.url)),
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  server: { port: 5199, strictPort: true },
  build: {
    target: 'es2020',
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2048,
  },
});
