import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
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
    },
  ],
  plugins: [
    terser(),
    commonjs(),
    polyfills(),
    resolve({ browser: true, preferBuiltins: false }),
    typescript()
  ],
};
