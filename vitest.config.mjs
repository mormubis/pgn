import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      exclude: ['**/__tests__/**', '**/*.bench.ts'],
      provider: 'v8',
      thresholds: {
        'src/parse.ts': {
          branches: 85,
          functions: 100,
          lines: 98,
          statements: 98,
        },
        'src/stream.ts': {
          branches: 97,
          functions: 100,
          lines: 98,
          statements: 98,
        },
        'src/stringify.ts': {
          branches: 90,
          functions: 100,
          lines: 98,
          statements: 98,
        },
      },
    },
  },
});
