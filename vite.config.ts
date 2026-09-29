import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 5000,
    isolate: true,
    pool: 'threads',
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/types.ts', 'src/vite-env.d.ts'],
      thresholds: {
        lines: 100.0,
        functions: 100.0,
        branches: 100.0,
        statements: 100.0,
      },
    },
  },
});
