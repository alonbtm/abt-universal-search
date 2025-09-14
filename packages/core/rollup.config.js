import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

export default defineConfig({
  input: 'src/index.ts',
  external: [], // No external dependencies for this component
  output: [
    // ESM build
    {
      file: 'dist/index.esm.js',
      format: 'es',
      sourcemap: true,
      exports: 'named'
    },
    // CommonJS build
    {
      file: 'dist/index.cjs.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    // UMD build
    {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'UniversalSearch',
      sourcemap: true,
      exports: 'named'
    },
    // IIFE build (for direct browser usage)
    {
      file: 'dist/index.iife.js',
      format: 'iife',
      name: 'UniversalSearch',
      sourcemap: true,
      exports: 'named'
    }
  ],
  plugins: [
    resolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      sourceMap: true,
      inlineSources: !isProduction
    }),
    // Only minify in production
    ...(isProduction ? [terser({
      compress: {
        drop_console: true,
        drop_debugger: true
      },
      output: {
        comments: false
      }
    })] : []),
    // Development-specific plugins
    ...(isDevelopment ? [] : [])
  ],
  // Watch mode configuration
  watch: {
    include: 'src/**',
    exclude: 'node_modules/**'
  }
});