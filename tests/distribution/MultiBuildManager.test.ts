/**
 * MultiBuildManager Tests
 * Tests for multi-format build system
 */

import { MultiBuildManager } from '../../tools/build/MultiBuildManager';
import { readFileSync, existsSync } from 'fs';

jest.mock('fs');
jest.mock('rollup');

describe('MultiBuildManager', () => {
  let buildManager: MultiBuildManager;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      projectPath: '/test/project',
      outputDir: 'dist',
      formats: ['umd', 'esm', 'iife'],
      minify: true,
      sourceMaps: true
    };

    buildManager = new MultiBuildManager(mockConfig);

    // Mock fs functions
    (existsSync as jest.Mock).mockReturnValue(true);
    (readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
      name: 'test-package',
      version: '1.0.0',
      main: 'dist/bundle.umd.js'
    }));
  });

  describe('Build Configuration', () => {
    it('should generate correct rollup config for UMD format', () => {
      const config = (buildManager as any).generateRollupConfig('umd');
      
      expect(config.output.format).toBe('umd');
      expect(config.output.name).toBeDefined();
      expect(config.output.file).toContain('bundle.umd.js');
    });

    it('should generate correct rollup config for ESM format', () => {
      const config = (buildManager as any).generateRollupConfig('esm');
      
      expect(config.output.format).toBe('es');
      expect(config.output.file).toContain('bundle.esm.js');
    });

    it('should generate correct rollup config for IIFE format', () => {
      const config = (buildManager as any).generateRollupConfig('iife');
      
      expect(config.output.format).toBe('iife');
      expect(config.output.name).toBeDefined();
      expect(config.output.file).toContain('bundle.iife.js');
    });

    it('should include source maps when enabled', () => {
      const config = (buildManager as any).generateRollupConfig('umd');
      expect(config.output.sourcemap).toBe(true);
    });

    it('should exclude source maps when disabled', () => {
      const noSourceMapsManager = new MultiBuildManager({
        ...mockConfig,
        sourceMaps: false
      });
      
      const config = (noSourceMapsManager as any).generateRollupConfig('umd');
      expect(config.output.sourcemap).toBe(false);
    });
  });

  describe('Build Execution', () => {
    it('should build all specified formats', async () => {
      // Mock rollup
      const mockRollup = require('rollup');
      const mockBundle = {
        write: jest.fn().mockResolvedValue({
          output: [{
            fileName: 'bundle.umd.js',
            code: 'mock code',
            map: 'mock map'
          }]
        }),
        close: jest.fn()
      };
      
      mockRollup.rollup.mockResolvedValue(mockBundle);

      const result = await buildManager.buildAll();

      expect(result.formats).toHaveLength(3);
      expect(result.formats.map(f => f.format)).toEqual(['umd', 'esm', 'iife']);
      expect(mockRollup.rollup).toHaveBeenCalledTimes(3);
    });

    it('should calculate bundle sizes correctly', async () => {
      const mockRollup = require('rollup');
      const mockBundle = {
        write: jest.fn().mockResolvedValue({
          output: [{
            fileName: 'bundle.umd.js',
            code: 'a'.repeat(1000), // 1000 bytes
            map: 'mock map'
          }]
        }),
        close: jest.fn()
      };
      
      mockRollup.rollup.mockResolvedValue(mockBundle);

      const result = await buildManager.buildAll();

      expect(result.formats[0].size).toBe(1000);
      expect(result.formats[0].gzippedSize).toBeGreaterThan(0);
      expect(result.totalSize).toBeGreaterThan(0);
    });

    it('should handle build errors gracefully', async () => {
      const mockRollup = require('rollup');
      mockRollup.rollup.mockRejectedValue(new Error('Build failed'));

      await expect(buildManager.buildAll()).rejects.toThrow('Build failed');
    });
  });

  describe('Bundle Validation', () => {
    it('should validate UMD bundle exports', () => {
      const bundleCode = `
        (function (global, factory) {
          typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
          typeof define === 'function' && define.amd ? define(['exports'], factory) :
          (global = global || self, factory(global.TestPackage = {}));
        }(this, (function (exports) { 'use strict'; })));
      `;

      const isValid = (buildManager as any).validateBundle(bundleCode, 'umd');
      expect(isValid).toBe(true);
    });

    it('should validate ESM bundle exports', () => {
      const bundleCode = 'export { default } from "./index.js";';

      const isValid = (buildManager as any).validateBundle(bundleCode, 'esm');
      expect(isValid).toBe(true);
    });

    it('should validate IIFE bundle structure', () => {
      const bundleCode = `
        var TestPackage = (function () {
          'use strict';
          return {};
        })();
      `;

      const isValid = (buildManager as any).validateBundle(bundleCode, 'iife');
      expect(isValid).toBe(true);
    });

    it('should reject invalid bundle code', () => {
      const invalidCode = 'this is not valid javascript';

      const isValid = (buildManager as any).validateBundle(invalidCode, 'umd');
      expect(isValid).toBe(false);
    });
  });

  describe('Package.json Updates', () => {
    it('should update package.json with entry points', async () => {
      const mockWriteFileSync = jest.fn();
      jest.doMock('fs', () => ({
        ...jest.requireActual('fs'),
        writeFileSync: mockWriteFileSync
      }));

      await (buildManager as any).updatePackageJson(['umd', 'esm', 'iife']);

      expect(mockWriteFileSync).toHaveBeenCalled();
      const writtenContent = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      
      expect(writtenContent.main).toBe('dist/bundle.umd.js');
      expect(writtenContent.module).toBe('dist/bundle.esm.js');
      expect(writtenContent.browser).toBe('dist/bundle.iife.js');
      expect(writtenContent.sideEffects).toBe(false);
    });

    it('should preserve existing package.json fields', async () => {
      (readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
        name: 'test-package',
        version: '1.0.0',
        description: 'Test package',
        keywords: ['test'],
        author: 'Test Author'
      }));

      const mockWriteFileSync = jest.fn();
      jest.doMock('fs', () => ({
        ...jest.requireActual('fs'),
        writeFileSync: mockWriteFileSync
      }));

      await (buildManager as any).updatePackageJson(['umd']);

      const writtenContent = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      
      expect(writtenContent.description).toBe('Test package');
      expect(writtenContent.keywords).toEqual(['test']);
      expect(writtenContent.author).toBe('Test Author');
    });
  });

  describe('Size Calculations', () => {
    it('should calculate gzipped size correctly', () => {
      const content = 'a'.repeat(1000);
      const gzippedSize = (buildManager as any).calculateGzippedSize(content);
      
      expect(gzippedSize).toBeGreaterThan(0);
      expect(gzippedSize).toBeLessThan(1000); // Should be compressed
    });

    it('should calculate brotli size correctly', () => {
      const content = 'a'.repeat(1000);
      const brotliSize = (buildManager as any).calculateBrotliSize(content);
      
      expect(brotliSize).toBeGreaterThan(0);
      expect(brotliSize).toBeLessThan(1000); // Should be compressed
    });

    it('should handle empty content', () => {
      const gzippedSize = (buildManager as any).calculateGzippedSize('');
      const brotliSize = (buildManager as any).calculateBrotliSize('');
      
      expect(gzippedSize).toBeGreaterThan(0); // Gzip has overhead
      expect(brotliSize).toBeGreaterThan(0); // Brotli has overhead
    });
  });

  describe('Output Directory Management', () => {
    it('should clean output directory when requested', async () => {
      const mockRmSync = jest.fn();
      const mockMkdirSync = jest.fn();
      
      jest.doMock('fs', () => ({
        ...jest.requireActual('fs'),
        rmSync: mockRmSync,
        mkdirSync: mockMkdirSync,
        existsSync: jest.fn().mockReturnValue(true)
      }));

      buildManager.clean();

      expect(mockRmSync).toHaveBeenCalledWith(
        expect.stringContaining('dist'),
        { recursive: true, force: true }
      );
      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('dist'),
        { recursive: true }
      );
    });

    it('should create output directory if it does not exist', async () => {
      const mockMkdirSync = jest.fn();
      
      jest.doMock('fs', () => ({
        ...jest.requireActual('fs'),
        mkdirSync: mockMkdirSync,
        existsSync: jest.fn().mockReturnValue(false)
      }));

      buildManager.clean();

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('dist'),
        { recursive: true }
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle missing package.json', () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      expect(() => new MultiBuildManager(mockConfig)).toThrow('package.json not found');
    });

    it('should handle invalid package.json', () => {
      (readFileSync as jest.Mock).mockReturnValue('invalid json');

      expect(() => new MultiBuildManager(mockConfig)).toThrow();
    });

    it('should handle rollup build failures', async () => {
      const mockRollup = require('rollup');
      mockRollup.rollup.mockRejectedValue(new Error('Rollup error'));

      await expect(buildManager.buildAll()).rejects.toThrow('Rollup error');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate required configuration fields', () => {
      expect(() => new MultiBuildManager({
        input: '',
        outputDir: 'dist',
        formats: [{
          name: 'umd',
          file: 'bundle.umd.js',
          format: 'umd'
        }]
      })).toThrow();
    });

    it('should use default values for optional fields', () => {
      const manager = new MultiBuildManager({
        input: 'src/index.ts',
        outputDir: 'dist',
        formats: [{
          name: 'umd',
          file: 'bundle.umd.js',
          format: 'umd'
        }]
      });

      expect(manager).toBeDefined();
    });

    it('should validate supported formats', () => {
      expect(() => new MultiBuildManager({
        input: 'src/index.ts',
        outputDir: 'dist',
        formats: [{
          name: 'invalid' as any,
          file: 'bundle.invalid.js',
          format: 'invalid' as any
        }]
      })).toThrow();
    });
  });
});
