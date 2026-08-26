import { defineConfig } from 'vite';
import path from 'path';

// Multi-platform build configuration
// Builds the same game for multiple distribution platforms from one source.
//
// Platforms:
//   standalone — Local dev / standalone web (default)
//   playgama   — Playgama distribution (includes Playgama Bridge CDN)
//   ytgame     — YouTube Playables / Mediacube (platform provides SDK)
//
// The game code (@game/sdk) auto-detects the platform at runtime.
// Each platform only differs in index.html (CDN scripts / SDK init).
//
// Usage:
//   pnpm run build              → build ALL platforms
//   pnpm run build:playgama     → build only Playgama platform
//   pnpm run build:standalone   → build only standalone

const PLATFORM_HTML: Record<string, string> = {
  standalone: 'index.html',
  playgama: 'playgama.html',
  ytgame: 'ytgame.html',
};

export default defineConfig(({ mode }) => {
  // Determine which platforms to build
  const isDev = mode === 'development';
  const platformsToBuild: string[] = [];

  if (isDev) {
    // Dev server: only standalone
    platformsToBuild.push('standalone');
  } else if (PLATFORM_HTML[mode]) {
    // Single platform build
    platformsToBuild.push(mode);
  } else {
    // Production build: all platforms
    platformsToBuild.push(...Object.keys(PLATFORM_HTML));
  }

  const input: Record<string, string> = {};
  platformsToBuild.forEach(p => {
    input[p] = path.resolve(__dirname, PLATFORM_HTML[p]);
  });

  return {
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
        input,
        output: {
          manualChunks: {
            phaser: ['phaser'],
          },
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
    server: { host: '0.0.0.0', port: 5173 },
  };
});