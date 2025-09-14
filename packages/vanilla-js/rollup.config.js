import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { babel } from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';
import filesize from 'rollup-plugin-filesize';

const isDevelopment = process.env.NODE_ENV === 'development';

const baseConfig = {
  input: 'src/index.ts',
  plugins: [
    nodeResolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: false, // We'll generate types separately
      declarationMap: false
    }),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
      presets: [
        ['@babel/preset-env', {
          targets: {
            browsers: [
              'Chrome >= 80',
              'Firefox >= 75', 
              'Safari >= 13',
              'Edge >= 80'
            ]
          },
          modules: false
        }]
      ]
    }),
    filesize()
  ],
  external: [],
  watch: {
    include: 'src/**'
  }
};

const configs = [];

// IIFE build for browser CDN usage
configs.push({
  ...baseConfig,
  output: {
    file: 'dist/universal-search.js',
    format: 'iife',
    name: 'UniversalSearch',
    sourcemap: !isDevelopment ? true : 'inline'
  },
  plugins: [
    ...baseConfig.plugins,
    ...(isDevelopment ? [] : [])
  ]
});

// Minified IIFE build for production CDN
if (!isDevelopment) {
  configs.push({
    ...baseConfig,
    output: {
      file: 'dist/universal-search.min.js',
      format: 'iife',
      name: 'UniversalSearch',
      sourcemap: true
    },
    plugins: [
      ...baseConfig.plugins,
      terser({
        compress: {
          drop_console: true,
          drop_debugger: true
        },
        mangle: {
          reserved: ['UniversalSearch']
        }
      })
    ]
  });
}

// ES Module build for modern bundlers
configs.push({
  ...baseConfig,
  output: {
    file: 'dist/universal-search.esm.js',
    format: 'es',
    sourcemap: !isDevelopment ? true : 'inline'
  }
});

// CommonJS build for Node.js environments
configs.push({
  ...baseConfig,
  output: {
    file: 'dist/universal-search.cjs.js',
    format: 'cjs',
    sourcemap: !isDevelopment ? true : 'inline'
  }
});

export default configs;