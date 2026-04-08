import { defineConfig } from 'tsdown';

export default defineConfig({
  dts: true,
  entry: ['src/index.ts'],
  format: 'esm',
  minify: true,
  platform: 'neutral',
  outDir: 'dist',
  sourcemap: 'hidden',
  tsconfig: 'tsconfig.src.json',
});
