/**
 * Distribution Orchestrator Tests
 * Comprehensive tests for the distribution pipeline orchestrator
 */

import { DistributionOrchestrator } from '../../tools/DistributionOrchestrator';

// Mock all dependencies
jest.mock('../../tools/build/MultiBuildManager');
jest.mock('../../tools/build/BundleOptimizer');
jest.mock('../../tools/publishing/CDNDistributionManager');
jest.mock('../../tools/publishing/NPMPublishManager');
jest.mock('../../tools/security/SecurityScanner');
jest.mock('../../tools/monitoring/PerformanceMonitor');

describe('DistributionOrchestrator', () => {
  let orchestrator: DistributionOrchestrator;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      projectPath: '/test/project',
      version: '1.0.0',
      buildConfig: {
        formats: ['umd', 'esm', 'iife'],
        minify: true,
        sourceMaps: true,
        optimize: true
      },
      publishConfig: {
        npm: {
          enabled: true,
          registry: 'https://registry.npmjs.org/',
          access: 'public',
          dryRun: false
        },
        cdn: {
          enabled: true,
          provider: 'jsdelivr',
          validateDeployment: true
        }
      },
      securityConfig: {
        enabled: true,
        scanTypes: ['dependencies', 'code', 'secrets', 'licenses'],
        autoFix: false
      },
      performanceConfig: {
        enabled: true,
        thresholds: {
          bundleSize: 1000000,
          gzippedSize: 300000,
          buildTime: 60000,
          regressionPercent: 10
        }
      }
    };

    orchestrator = new DistributionOrchestrator(mockConfig);
  });

  describe('Pipeline Execution', () => {
    it('should execute complete distribution pipeline successfully', async () => {
      // Mock successful responses from all managers
      const mockBuildResults = {
        formats: [
          { format: 'umd', size: 100000, gzippedSize: 30000 },
          { format: 'esm', size: 90000, gzippedSize: 27000 },
          { format: 'iife', size: 95000, gzippedSize: 28000 }
        ],
        totalSize: 285000,
        totalGzippedSize: 85000,
        outputFiles: ['dist/bundle.umd.js', 'dist/bundle.esm.js', 'dist/bundle.iife.js']
      };

      const mockSecurityReport = {
        totalVulnerabilities: 0,
        vulnerabilities: [],
        riskScore: 10,
        recommendations: []
      };

      const mockPerformanceReport = {
        overallScore: 95,
        regressions: [],
        improvements: [
          { metric: 'bundleSize', changePercent: -5 }
        ]
      };

      const mockNpmResult = {
        success: true,
        version: '1.0.1',
        packageUrl: 'https://www.npmjs.com/package/test-package',
        publishTime: new Date()
      };

      const mockCdnResult = {
        success: true,
        cdnUrls: [
          'https://cdn.jsdelivr.net/npm/test-package@1.0.1/dist/bundle.umd.js',
          'https://cdn.jsdelivr.net/npm/test-package@1.0.1/dist/bundle.esm.js'
        ],
        deploymentId: 'deploy-123'
      };

      // Setup mocks
      const mockBuildManager = require('../../tools/build/MultiBuildManager').MultiBuildManager;
      const mockSecurityScanner = require('../../tools/security/SecurityScanner').SecurityScanner;
      const mockPerformanceMonitor = require('../../tools/monitoring/PerformanceMonitor').PerformanceMonitor;
      const mockNpmManager = require('../../tools/publishing/NPMPublishManager').NPMPublishManager;
      const mockCdnManager = require('../../tools/publishing/CDNDistributionManager').CDNDistributionManager;

      mockBuildManager.prototype.buildAllFormats.mockResolvedValue(mockBuildResults);
      mockSecurityScanner.prototype.runSecurityScan.mockResolvedValue(mockSecurityReport);
      mockPerformanceMonitor.prototype.recordMetrics.mockResolvedValue(undefined);
      mockPerformanceMonitor.prototype.analyzePerformance.mockResolvedValue(mockPerformanceReport);
      mockNpmManager.prototype.generateVersionBump.mockReturnValue({
        type: 'patch',
        current: '1.0.0',
        next: '1.0.1',
        changelog: ['Bug fixes and improvements']
      });
      mockNpmManager.prototype.publish.mockResolvedValue(mockNpmResult);
      mockCdnManager.prototype.deployToCDN.mockResolvedValue(mockCdnResult);

      const result = await orchestrator.executeDistribution();

      expect(result.success).toBe(true);
      expect(result.version).toBe('1.0.1');
      expect(result.buildResults).toEqual(mockBuildResults);
      expect(result.publishResults.npm).toEqual(mockNpmResult);
      expect(result.publishResults.cdn).toEqual(mockCdnResult);
      expect(result.securityReport).toEqual(mockSecurityReport);
      expect(result.performanceReport).toEqual(mockPerformanceReport);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle critical security vulnerabilities', async () => {
      const mockSecurityReport = {
        totalVulnerabilities: 2,
        vulnerabilities: [
          { severity: 'critical', title: 'Critical vulnerability 1' },
          { severity: 'high', title: 'High vulnerability 1' }
        ],
        riskScore: 85
      };

      const mockSecurityScanner = require('../../tools/security/SecurityScanner').SecurityScanner;
      mockSecurityScanner.prototype.runSecurityScan.mockResolvedValue(mockSecurityReport);

      const result = await orchestrator.executeDistribution();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Critical security vulnerabilities found: 1');
    });

    it('should handle build failures gracefully', async () => {
      const mockBuildManager = require('../../tools/build/MultiBuildManager').MultiBuildManager;
      mockBuildManager.prototype.buildAllFormats.mockRejectedValue(new Error('Build failed'));

      const result = await orchestrator.executeDistribution();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Build failed');
    });

    it('should handle npm publishing failures', async () => {
      const mockBuildResults = {
        formats: [{ format: 'umd', size: 100000 }],
        totalSize: 100000,
        outputFiles: ['dist/bundle.umd.js']
      };

      const mockBuildManager = require('../../tools/build/MultiBuildManager').MultiBuildManager;
      const mockNpmManager = require('../../tools/publishing/NPMPublishManager').NPMPublishManager;
      const mockSecurityScanner = require('../../tools/security/SecurityScanner').SecurityScanner;

      mockBuildManager.prototype.buildAllFormats.mockResolvedValue(mockBuildResults);
      mockSecurityScanner.prototype.runSecurityScan.mockResolvedValue({
        totalVulnerabilities: 0,
        vulnerabilities: [],
        riskScore: 10
      });
      mockNpmManager.prototype.generateVersionBump.mockReturnValue({
        type: 'patch',
        current: '1.0.0',
        next: '1.0.1'
      });
      mockNpmManager.prototype.publish.mockRejectedValue(new Error('NPM publish failed'));

      const result = await orchestrator.executeDistribution();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('NPM publish failed');
    });
  });

  describe('Dry Run', () => {
    it('should execute dry run without actual publishing', async () => {
      const mockBuildResults = {
        formats: [{ format: 'umd', size: 100000 }],
        totalSize: 100000,
        outputFiles: ['dist/bundle.umd.js']
      };

      const mockBuildManager = require('../../tools/build/MultiBuildManager').MultiBuildManager;
      const mockSecurityScanner = require('../../tools/security/SecurityScanner').SecurityScanner;
      const mockNpmManager = require('../../tools/publishing/NPMPublishManager').NPMPublishManager;

      mockBuildManager.prototype.buildAllFormats.mockResolvedValue(mockBuildResults);
      mockSecurityScanner.prototype.runSecurityScan.mockResolvedValue({
        totalVulnerabilities: 0,
        vulnerabilities: [],
        riskScore: 10
      });
      mockNpmManager.prototype.generateVersionBump.mockReturnValue({
        type: 'patch',
        current: '1.0.0',
        next: '1.0.1'
      });
      mockNpmManager.prototype.publish.mockResolvedValue({
        success: true,
        version: '1.0.1',
        packageUrl: 'https://www.npmjs.com/package/test-package'
      });

      const result = await orchestrator.executeDryRun();

      expect(result.warnings).toContain('This was a dry run - no actual publishing occurred');
      // Verify that npm manager was called with dryRun: true
      expect(mockNpmManager).toHaveBeenCalledWith(
        expect.objectContaining({
          dryRun: true
        })
      );
    });
  });

  describe('Pipeline Status', () => {
    it('should track pipeline step status', async () => {
      const initialStatus = orchestrator.getPipelineStatus();
      
      expect(initialStatus).toHaveLength(6);
      expect(initialStatus.every(step => step.status === 'pending')).toBe(true);
      
      const stepNames = initialStatus.map(step => step.name);
      expect(stepNames).toContain('security-scan');
      expect(stepNames).toContain('build');
      expect(stepNames).toContain('performance-analysis');
      expect(stepNames).toContain('npm-publish');
      expect(stepNames).toContain('cdn-deploy');
      expect(stepNames).toContain('validation');
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive distribution report', () => {
      const mockResult = {
        success: true,
        version: '1.0.1',
        timestamp: new Date('2023-01-01T00:00:00Z'),
        buildResults: {
          formats: [
            { format: 'umd', size: 100000 },
            { format: 'esm', size: 90000 }
          ],
          totalSize: 190000,
          totalGzippedSize: 57000
        },
        publishResults: {
          npm: {
            success: true,
            packageUrl: 'https://www.npmjs.com/package/test-package'
          },
          cdn: {
            success: true,
            cdnUrls: ['https://cdn.jsdelivr.net/npm/test-package@1.0.1/dist/bundle.umd.js']
          }
        },
        securityReport: {
          totalVulnerabilities: 1,
          riskScore: 25
        },
        performanceReport: {
          overallScore: 85,
          regressions: [],
          improvements: [{ metric: 'bundleSize' }]
        },
        errors: [],
        warnings: ['Minor performance regression detected']
      };

      const report = orchestrator.generateDistributionReport(mockResult);

      expect(report).toContain('Distribution Pipeline Report');
      expect(report).toContain('Version: 1.0.1');
      expect(report).toContain('Status: ✅ SUCCESS');
      expect(report).toContain('Build Results:');
      expect(report).toContain('Formats: umd, esm');
      expect(report).toContain('NPM Publishing:');
      expect(report).toContain('CDN Distribution:');
      expect(report).toContain('Security Scan:');
      expect(report).toContain('Performance Analysis:');
      expect(report).toContain('⚠️ Warnings:');
      expect(report).toContain('Minor performance regression detected');
    });

    it('should generate report for failed pipeline', () => {
      const mockResult = {
        success: false,
        version: '1.0.0',
        timestamp: new Date('2023-01-01T00:00:00Z'),
        buildResults: null,
        publishResults: {},
        errors: ['Build failed', 'NPM publish failed'],
        warnings: []
      };

      const report = orchestrator.generateDistributionReport(mockResult);

      expect(report).toContain('Status: ❌ FAILED');
      expect(report).toContain('❌ Errors:');
      expect(report).toContain('Build failed');
      expect(report).toContain('NPM publish failed');
    });
  });

  describe('Configuration Validation', () => {
    it('should handle disabled components', async () => {
      const disabledConfig = {
        ...mockConfig,
        securityConfig: { ...mockConfig.securityConfig, enabled: false },
        performanceConfig: { ...mockConfig.performanceConfig, enabled: false },
        publishConfig: {
          npm: { ...mockConfig.publishConfig.npm, enabled: false },
          cdn: { ...mockConfig.publishConfig.cdn, enabled: false }
        }
      };

      const disabledOrchestrator = new DistributionOrchestrator(disabledConfig);
      
      const mockBuildManager = require('../../tools/build/MultiBuildManager').MultiBuildManager;
      mockBuildManager.prototype.buildAllFormats.mockResolvedValue({
        formats: [{ format: 'umd', size: 100000 }],
        totalSize: 100000,
        outputFiles: ['dist/bundle.umd.js']
      });

      const result = await disabledOrchestrator.executeDistribution();

      expect(result.success).toBe(true);
      expect(result.securityReport).toBeUndefined();
      expect(result.performanceReport).toBeUndefined();
      expect(result.publishResults.npm).toBeUndefined();
      expect(result.publishResults.cdn).toBeUndefined();
    });
  });

  describe('Error Handling and Rollback', () => {
    it('should attempt rollback on CDN deployment failure', async () => {
      const mockBuildResults = {
        formats: [{ format: 'umd', size: 100000 }],
        totalSize: 100000,
        outputFiles: ['dist/bundle.umd.js']
      };

      const mockCdnResult = {
        success: true,
        cdnUrls: ['https://cdn.jsdelivr.net/npm/test-package@1.0.1/dist/bundle.umd.js'],
        deploymentId: 'deploy-123'
      };

      const mockBuildManager = require('../../tools/build/MultiBuildManager').MultiBuildManager;
      const mockSecurityScanner = require('../../tools/security/SecurityScanner').SecurityScanner;
      const mockNpmManager = require('../../tools/publishing/NPMPublishManager').NPMPublishManager;
      const mockCdnManager = require('../../tools/publishing/CDNDistributionManager').CDNDistributionManager;

      mockBuildManager.prototype.buildAllFormats.mockResolvedValue(mockBuildResults);
      mockSecurityScanner.prototype.runSecurityScan.mockResolvedValue({
        totalVulnerabilities: 0,
        vulnerabilities: [],
        riskScore: 10
      });
      mockNpmManager.prototype.generateVersionBump.mockReturnValue({
        type: 'patch',
        current: '1.0.0',
        next: '1.0.1'
      });
      mockNpmManager.prototype.publish.mockResolvedValue({
        success: true,
        version: '1.0.1'
      });
      mockCdnManager.prototype.deployToCDN.mockResolvedValue(mockCdnResult);
      mockCdnManager.prototype.rollbackDeployment.mockResolvedValue(undefined);

      // Mock validation failure
      jest.spyOn(orchestrator as any, 'validateDeployment').mockResolvedValue({
        success: false,
        errors: ['Validation failed']
      });

      const result = await orchestrator.executeDistribution();

      expect(result.success).toBe(false);
      expect(mockCdnManager.prototype.rollbackDeployment).toHaveBeenCalledWith('1.0.1');
    });
  });

  describe('Performance Regression Handling', () => {
    it('should warn about critical performance regressions but continue', async () => {
      const mockBuildResults = {
        formats: [{ format: 'umd', size: 100000 }],
        totalSize: 100000,
        outputFiles: ['dist/bundle.umd.js']
      };

      const mockPerformanceReport = {
        overallScore: 45,
        regressions: [
          { metric: 'bundleSize', severity: 'critical', changePercent: 50 }
        ],
        improvements: []
      };

      const mockBuildManager = require('../../tools/build/MultiBuildManager').MultiBuildManager;
      const mockSecurityScanner = require('../../tools/security/SecurityScanner').SecurityScanner;
      const mockPerformanceMonitor = require('../../tools/monitoring/PerformanceMonitor').PerformanceMonitor;
      const mockNpmManager = require('../../tools/publishing/NPMPublishManager').NPMPublishManager;

      mockBuildManager.prototype.buildAllFormats.mockResolvedValue(mockBuildResults);
      mockSecurityScanner.prototype.runSecurityScan.mockResolvedValue({
        totalVulnerabilities: 0,
        vulnerabilities: [],
        riskScore: 10
      });
      mockPerformanceMonitor.prototype.recordMetrics.mockResolvedValue(undefined);
      mockPerformanceMonitor.prototype.analyzePerformance.mockResolvedValue(mockPerformanceReport);
      mockNpmManager.prototype.generateVersionBump.mockReturnValue({
        type: 'patch',
        current: '1.0.0',
        next: '1.0.1'
      });
      mockNpmManager.prototype.publish.mockResolvedValue({
        success: true,
        version: '1.0.1'
      });

      const result = await orchestrator.executeDistribution();

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Critical performance regressions detected: 1');
    });
  });
});
