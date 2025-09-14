module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  env: {
    node: true,
    browser: true,
    es6: true,
  },
  plugins: ['@typescript-eslint'],
  rules: {
    // General code quality rules
    'no-console': 'warn',
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    
    // TypeScript-specific rules
    '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    
    // Turn off base ESLint rules that conflict with TypeScript
    'no-unused-vars': 'off',
    
    // Security rules
    'no-eval': 'error',
    'no-implied-eval': 'error',
  },
  ignorePatterns: [
    'dist/**/*',
    'node_modules/**/*',
    'rollup.config.js',
    '*.test.ts',
    'tests/**/*'
  ],
};