/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/index.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.types.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json',
    'json-summary',
    'cobertura',
    'clover'
  ],
  // coverageThreshold: {
  //   global: {
  //     branches: 70,
  //     functions: 75,
  //     lines: 80,
  //     statements: 80
  //   },
  //   './src/UniversalSearch.ts': {
  //     branches: 80,
  //     functions: 85,
  //     lines: 90,
  //     statements: 90
  //   },
  //   './src/adapters/**/*.ts': {
  //     branches: 65,
  //     functions: 70,
  //     lines: 75,
  //     statements: 75
  //   },
  //   './src/ui/**/*.ts': {
  //     branches: 60,
  //     functions: 65,
  //     lines: 70,
  //     statements: 70
  //   }
  // },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Coverage configuration
  collectCoverage: false, // Only when explicitly requested
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/tests/',
    '/__tests__/',
    '\\.d\\.ts$'
  ],
  
  // Advanced reporting options
  verbose: true,
  bail: false,
  errorOnDeprecated: true,
  
  // Performance
  maxWorkers: '50%',
  
  // Clear coverage between runs
  clearMocks: true,
  restoreMocks: true
};