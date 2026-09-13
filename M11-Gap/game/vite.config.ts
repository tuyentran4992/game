import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Multi-platform: mode standalone | playgama | ytgame (B5 hoàn thiện entrypoint riêng).
export default defineConfig({
  base: './',
  root: fileURLToPath(new URL('./', import.meta.url)),
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  build: { target: 'es2020', outDir: 'dist', emptyOutDir: true, assetsInlineLimit: 0 },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
});
