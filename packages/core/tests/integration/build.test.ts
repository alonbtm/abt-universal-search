/**
 * Integration Tests - Build Configuration
 * Tests for build outputs and bundle validation
 */

import { existsSync, statSync } from 'fs';
import { join } from 'path';

const DIST_DIR = join(__dirname, '../../dist');

describe('Build Configuration', () => {
  describe('Build Output Files', () => {
    const expectedFiles = [
      'index.esm.js',
      'index.esm.js.map',
      'index.cjs.js',
      'index.cjs.js.map',
      'index.umd.js',
      'index.umd.js.map',
      'index.iife.js',
      'index.iife.js.map',
      'index.d.ts',
      'index.d.ts.map'
    ];

    expectedFiles.forEach(fileName => {
      it(`should generate ${fileName}`, () => {
        const filePath = join(DIST_DIR, fileName);
        expect(existsSync(filePath)).toBe(true);
      });
    });
  });

  describe('Bundle Size Validation', () => {
    const bundleFiles = [
      'index.esm.js',
      'index.cjs.js',
      'index.umd.js',
      'index.iife.js'
    ];

    bundleFiles.forEach(fileName => {
      it(`should keep ${fileName} under reasonable size`, () => {
        const filePath = join(DIST_DIR, fileName);
        
        if (existsSync(filePath)) {
          const stats = statSync(filePath);
          // Size should be reasonable for a basic in-memory search component
          // Updated after QA feedback to allow for essential functionality
          // Adjusted after removing advanced features but keeping core TypeScript types
          const sizeLimit = fileName.includes('umd') || fileName.includes('iife') ? 200 * 1024 : 175 * 1024;
          expect(stats.size).toBeLessThan(sizeLimit);
        }
      });
    });
  });

  describe('TypeScript Declarations', () => {
    it('should generate TypeScript declaration files', () => {
      const dtsPath = join(DIST_DIR, 'index.d.ts');
      expect(existsSync(dtsPath)).toBe(true);
    });

    it('should generate declaration source maps', () => {
      const dtsMapPath = join(DIST_DIR, 'index.d.ts.map');
      expect(existsSync(dtsMapPath)).toBe(true);
    });
  });

  describe('Source Maps', () => {
    const bundleFiles = ['esm', 'cjs', 'umd', 'iife'];

    bundleFiles.forEach(format => {
      it(`should generate source maps for ${format} bundle`, () => {
        const sourceMapPath = join(DIST_DIR, `index.${format}.js.map`);
        expect(existsSync(sourceMapPath)).toBe(true);
      });
    });
  });
});