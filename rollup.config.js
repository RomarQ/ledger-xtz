import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import polyfills from 'rollup-plugin-node-polyfills';
import { terser } from 'rollup-plugin-terser';
import pkg from './package.json';

export default {
  input: 'src/index.ts',
  output: [
    {
      exports: 'default',
      file: pkg.main,
      format: 'cjs',
    },
    {
      exports: 'default',
      file: pkg.module,
      format: 'es',
    },
    {
      exports: 'default',
      name: 'LedgerXTZ',
      file: pkg.minified,
      format: 'iife',
      compact: true,

      intro: 'const global = window;',
    },
  ],
  plugins: [
    terser(),
    resolve({ browser: true }),
    commonjs(),
    json(),
    polyfills(),
    typescript()
  ],
};
