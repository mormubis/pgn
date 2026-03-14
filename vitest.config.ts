import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      exclude: ['src/grammar.cjs', 'src/__tests__/**/*.bench.ts'],
      include: ['src/**/*.ts'],
      provider: 'v8',
    },
  },
});
