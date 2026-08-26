import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@game/core': path.resolve(__dirname, '../../packages/core/src'),
      '@game/sdk': path.resolve(__dirname, '../../packages/sdk/src'),
    },
  },
  test: { globals: true },
});