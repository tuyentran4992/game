import { defineConfig } from 'vitest/config';

// Logic thuần: chạy trong môi trường node (KHÔNG cần browser) — đúng ràng buộc ADR-01.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    globals: false,
  },
});
