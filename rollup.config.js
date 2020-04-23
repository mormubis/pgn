import path from 'path';

import babel from 'rollup-plugin-babel';
import cjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';
import { sizeSnapshot } from 'rollup-plugin-size-snapshot';
import visualizer from 'rollup-plugin-visualizer';

const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';

const config = {
  external: ['nearley', path.resolve(__dirname, 'src/grammar.js')],
  input: 'src/index.js',
  output: [
    {
      exports: 'named',
      file: './dist/cjs/pgn.js',
      format: 'cjs',
      name: 'pgn',
      sourcemap: env !== 'production',
    },
    {
      file: './dist/es/pgn.js',
      format: 'es',
      sourcemap: env !== 'production',
    },
  ],
  plugins: [
    babel({
      exclude: '**/node_modules/**',
      runtimeHelpers: true,
    }),
    copy({ targets: [{ dest: 'dist', src: 'src/grammar.js' }] }),
    cjs(),
    ...(isProduction ? [sizeSnapshot()] : []),
    visualizer(),
  ],
};

export default config;
