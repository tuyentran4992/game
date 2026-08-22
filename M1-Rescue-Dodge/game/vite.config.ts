import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// Build web cho Playables: base './' để chạy khi đóng gói zip (BR-05, không mạng ngoài).
// publicDir trỏ tới assets/ của dự án -> copy nguyên thư mục raw/ vào dist (nhẹ).
export default defineConfig({
  base: './',
  root: fileURLToPath(new URL('./', import.meta.url)),
  publicDir: fileURLToPath(new URL('../assets', import.meta.url)),
  build: {
    target: 'es2020',
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2048,
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
});
