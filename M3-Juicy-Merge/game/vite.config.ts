import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { devvit } from '@devvit/start/vite';

export default defineConfig(({ mode }) => {
  if (mode === 'web') {
    // Standalone Web / Playgama HTML5 build
    return {
      base: './',
      root: fileURLToPath(new URL('./', import.meta.url)),
      publicDir: 'public',
      build: {
        target: 'es2020',
        outDir: 'dist',
        emptyOutDir: true,
        assetsInlineLimit: 0,
        chunkSizeWarningLimit: 2048,
      },
      resolve: {
        alias: { '@': resolve(import.meta.dirname, 'src') },
      },
    };
  }

  // Reddit Devvit build (default / mode: 'reddit')
  return {
    plugins: [
      devvit({
        client: {
          build: {
            chunkSizeWarningLimit: 2048,
          },
        },
      }),
    ],
    resolve: {
      alias: { '@': resolve(import.meta.dirname, 'src') },
    },
  };
});
