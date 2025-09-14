/**
 * Unit Tests - Workspace Configuration
 * Tests for workspace dependency resolution and monorepo setup
 */

import { existsSync } from 'fs';
import { join } from 'path';

const ROOT_DIR = join(__dirname, '../../../..');
const CORE_DIR = join(__dirname, '../..');

describe('Workspace Configuration', () => {
  describe('Package Structure', () => {
    it('should have root package.json with workspace configuration', () => {
      const rootPackageJson = join(ROOT_DIR, 'package.json');
      expect(existsSync(rootPackageJson)).toBe(true);
      
      const pkg = require(rootPackageJson);
      expect(pkg.workspaces).toBeDefined();
      expect(Array.isArray(pkg.workspaces)).toBe(true);
      expect(pkg.workspaces).toContain('packages/*');
    });

    it('should have core package.json with correct configuration', () => {
      const corePackageJson = join(CORE_DIR, 'package.json');
      expect(existsSync(corePackageJson)).toBe(true);
      
      const pkg = require(corePackageJson);
      expect(pkg.name).toBe('@universal-search/core');
      expect(pkg.main).toBeDefined();
      expect(pkg.module).toBeDefined();
      expect(pkg.types).toBeDefined();
    });
  });

  describe('TypeScript Configuration', () => {
    it('should have root tsconfig.json', () => {
      const rootTsConfig = join(ROOT_DIR, 'tsconfig.json');
      expect(existsSync(rootTsConfig)).toBe(true);
    });

    it('should have core tsconfig.json extending root config', () => {
      const coreTsConfig = join(CORE_DIR, 'tsconfig.json');
      expect(existsSync(coreTsConfig)).toBe(true);
      
      const config = require(coreTsConfig);
      expect(config.extends).toBe('../../tsconfig.json');
    });
  });

  describe('Build Configuration', () => {
    it('should have rollup configuration', () => {
      const rollupConfig = join(CORE_DIR, 'rollup.config.js');
      expect(existsSync(rollupConfig)).toBe(true);
    });

    it('should have package build scripts', () => {
      const packageJson = join(CORE_DIR, 'package.json');
      const pkg = require(packageJson);
      
      expect(pkg.scripts.build).toBeDefined();
      expect(pkg.scripts.dev).toBeDefined();
      expect(pkg.scripts.clean).toBeDefined();
    });
  });

  describe('Quality Tools Configuration', () => {
    it('should have ESLint configuration', () => {
      const eslintConfig = join(CORE_DIR, '.eslintrc.cjs');
      expect(existsSync(eslintConfig)).toBe(true);
    });

    it('should have Prettier configuration', () => {
      const prettierConfig = join(CORE_DIR, '.prettierrc');
      expect(existsSync(prettierConfig)).toBe(true);
    });

    it('should have Jest configuration', () => {
      const jestConfig = join(CORE_DIR, 'jest.config.cjs');
      expect(existsSync(jestConfig)).toBe(true);
    });
  });
});