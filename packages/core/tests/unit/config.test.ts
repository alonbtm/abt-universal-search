/**
 * CI/CD Pipeline Configuration Tests
 * Validates build configuration and pipeline setup
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('CI/CD Pipeline Configuration', () => {
  const projectRoot = join(__dirname, '../../../..');
  
  describe('Jest Configuration', () => {
    it('should have correct Jest configuration', () => {
      const jestConfig = require('../../jest.config.cjs');
      
      expect(jestConfig.preset).toBe('ts-jest');
      expect(jestConfig.testEnvironment).toBe('jsdom');
      expect(jestConfig.coverageThreshold.global.branches).toBe(90);
      expect(jestConfig.coverageThreshold.global.functions).toBe(90);
      expect(jestConfig.coverageThreshold.global.lines).toBe(90);
      expect(jestConfig.coverageThreshold.global.statements).toBe(90);
    });
    
    it('should include coverage reporters', () => {
      const jestConfig = require('../../jest.config.cjs');
      
      expect(jestConfig.coverageReporters).toContain('text');
      expect(jestConfig.coverageReporters).toContain('lcov');
      expect(jestConfig.coverageReporters).toContain('html');
    });
  });

  describe('GitHub Actions Configuration', () => {
    it('should have CI workflow file', () => {
      const ciPath = join(projectRoot, '.github/workflows/ci.yaml');
      const ciContent = readFileSync(ciPath, 'utf8');
      
      expect(ciContent).toContain('name: CI Pipeline');
      expect(ciContent).toContain('node-version: [18, 20]');
      expect(ciContent).toContain('npm run lint');
      expect(ciContent).toContain('npm run test:unit');
      expect(ciContent).toContain('npm run test:integration');
      expect(ciContent).toContain('npm run test:coverage');
    });
    
    it('should have publish workflow file', () => {
      const publishPath = join(projectRoot, '.github/workflows/publish.yaml');
      const publishContent = readFileSync(publishPath, 'utf8');
      
      expect(publishContent).toContain('name: Publish');
      expect(publishContent).toContain('npx semantic-release');
      expect(publishContent).toContain('- main');
    });
  });

  describe('Package.json Scripts', () => {
    it('should have required test scripts', () => {
      const packagePath = join(projectRoot, 'package.json');
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      expect(packageJson.scripts['test:unit']).toBeDefined();
      expect(packageJson.scripts['test:integration']).toBeDefined();
      expect(packageJson.scripts['test:coverage']).toBeDefined();
      expect(packageJson.scripts['test:e2e']).toBeDefined();
      expect(packageJson.scripts['build:all']).toBeDefined();
      expect(packageJson.scripts.lint).toBeDefined();
      expect(packageJson.scripts.release).toBeDefined();
    });
  });

  describe('Playwright Configuration', () => {
    it('should have Playwright config file', () => {
      const playwrightPath = join(projectRoot, 'playwright.config.ts');
      const playwrightContent = readFileSync(playwrightPath, 'utf8');
      
      expect(playwrightContent).toContain('testDir: \'./tests/e2e\'');
      expect(playwrightContent).toContain('baseURL: \'http://localhost:8080\'');
      expect(playwrightContent).toContain('Desktop Chrome');
      expect(playwrightContent).toContain('Desktop Firefox');
      expect(playwrightContent).toContain('Desktop Safari');
    });
  });

  describe('Semantic Release Configuration', () => {
    it('should have semantic-release config', () => {
      const releasePath = join(projectRoot, '.releaserc.json');
      const releaseConfig = JSON.parse(readFileSync(releasePath, 'utf8'));
      
      expect(releaseConfig.branches).toEqual(['main']);
      expect(releaseConfig.plugins).toContain('@semantic-release/commit-analyzer');
      expect(releaseConfig.plugins).toContain('@semantic-release/changelog');
      expect(releaseConfig.plugins).toContain('@semantic-release/github');
    });
  });
});