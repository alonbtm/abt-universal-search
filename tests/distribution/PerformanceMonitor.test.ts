/**
 * PerformanceMonitor Tests
 * Tests for bundle size tracking and performance regression detection
 */

import { PerformanceMonitor } from '../../tools/monitoring/PerformanceMonitor';
import { readFileSync, existsSync } from 'fs';

jest.mock('fs');

describe('PerformanceMonitor', () => {
  let performanceMonitor: PerformanceMonitor;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      projectPath: '/test/project',
      thresholds: {
        bundleSize: 1000000, // 1MB
        gzippedSize: 300000, // 300KB
        buildTime: 60000, // 60 seconds
        regressionPercent: 10 // 10%
      },
      historyPath: '/test/project/.performance-history.json'
    };

    // Mock fs functions
    (existsSync as jest.Mock).mockReturnValue(false);
    (readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
      name: 'test-package',
      version: '1.0.0',
      dependencies: { lodash: '^4.17.21' },
      devDependencies: { jest: '^29.0.0' }
    }));

    performanceMonitor = new PerformanceMonitor(mockConfig);
  });

  describe('Metrics Recording', () => {
    it('should record performance metrics correctly', async () => {
      const mockBuildResults = {
        formats: [
          { format: 'umd', size: 100000, gzippedSize: 30000 },
          { format: 'esm', size: 90000, gzippedSize: 27000 },
          { format: 'iife', size: 95000, gzippedSize: 28000 }
        ],
        totalSize: 285000,
        totalGzippedSize: 85000,
        buildTime: 45000,
        treeShakeEffectiveness: 0.85
      };

      const metrics = await performanceMonitor.recordMetrics('1.0.1', mockBuildResults);

      expect(metrics.version).toBe('1.0.1');
      expect(metrics.bundleSize).toBe(285000);
      expect(metrics.gzippedSize).toBe(85000);
      expect(metrics.buildTime).toBe(45000);
      expect(metrics.formats.umd).toBe(100000);
      expect(metrics.formats.esm).toBe(90000);
      expect(metrics.formats.iife).toBe(95000);
      expect(metrics.dependencies).toBe(2);
      expect(metrics.treeShakeEffectiveness).toBe(0.85);
    });

    it('should calculate brotli size as 85% of gzipped size', async () => {
      const mockBuildResults = {
        totalSize: 100000,
        totalGzippedSize: 30000,
        buildTime: 10000
      };

      const metrics = await performanceMonitor.recordMetrics('1.0.1', mockBuildResults);

      expect(metrics.brotliSize).toBe(Math.floor(30000 * 0.85));
    });

    it('should handle missing build data gracefully', async () => {
      const mockBuildResults = {};

      const metrics = await performanceMonitor.recordMetrics('1.0.1', mockBuildResults);

      expect(metrics.bundleSize).toBe(0);
      expect(metrics.gzippedSize).toBe(0);
      expect(metrics.buildTime).toBe(0);
    });
  });

  describe('Performance Analysis', () => {
    it('should detect bundle size regression', async () => {
      // Setup history with previous metrics
      const previousMetrics = {
        version: '1.0.0',
        timestamp: new Date('2023-01-01'),
        bundleSize: 100000,
        gzippedSize: 30000,
        buildTime: 10000,
        formats: { umd: 100000, esm: 0, iife: 0 },
        dependencies: 2,
        treeShakeEffectiveness: 0.8
      };

      const currentMetrics = {
        version: '1.0.1',
        timestamp: new Date('2023-01-02'),
        bundleSize: 150000, // 50% increase
        gzippedSize: 45000,
        buildTime: 12000,
        formats: { umd: 150000, esm: 0, iife: 0 },
        dependencies: 2,
        treeShakeEffectiveness: 0.8
      };

      // Mock history loading
      (performanceMonitor as any).history = [previousMetrics, currentMetrics];

      const report = await performanceMonitor.analyzePerformance('1.0.1');

      expect(report.regressions).toHaveLength(1);
      expect(report.regressions).toBeDefined();
      expect(report.regressions[0]).toBeDefined();
      expect(report.regressions[0]?.metric).toBe('bundleSize');
      expect(report.regressions[0]?.changePercent).toBe(50);
      expect(report.regressions[0]?.severity).toBe('critical');
    });

    it('should detect performance improvements', async () => {
      const previousMetrics = {
        version: '1.0.0',
        timestamp: new Date('2023-01-01'),
        bundleSize: 150000,
        gzippedSize: 45000,
        buildTime: 20000,
        formats: { umd: 150000, esm: 0, iife: 0 },
        dependencies: 2,
        treeShakeEffectiveness: 0.7
      };

      const currentMetrics = {
        version: '1.0.1',
        timestamp: new Date('2023-01-02'),
        bundleSize: 120000, // 20% improvement
        gzippedSize: 36000,
        buildTime: 15000,
        formats: { umd: 120000, esm: 0, iife: 0 },
        dependencies: 2,
        treeShakeEffectiveness: 0.8
      };

      (performanceMonitor as any).history = [previousMetrics, currentMetrics];

      const report = await performanceMonitor.analyzePerformance('1.0.1');

      expect(report.improvements).toHaveLength(2); // bundleSize and buildTime
      expect(report.improvements).toBeDefined();
      expect(report.improvements[0]).toBeDefined();
      expect(report.improvements[0]?.metric).toBe('bundleSize');
      expect(report.improvements[0]?.changePercent).toBe(-20);
    });

    it('should calculate overall performance score', async () => {
      const currentMetrics = {
        version: '1.0.1',
        timestamp: new Date(),
        bundleSize: 500000, // Under threshold
        gzippedSize: 150000, // Under threshold
        buildTime: 30000, // Under threshold
        formats: { umd: 500000, esm: 0, iife: 0 },
        dependencies: 2,
        treeShakeEffectiveness: 0.9
      };

      (performanceMonitor as any).history = [currentMetrics];

      const report = await performanceMonitor.analyzePerformance('1.0.1');

      expect(report.overallScore).toBe(100); // Perfect score
    });

    it('should penalize threshold violations', async () => {
      const currentMetrics = {
        version: '1.0.1',
        timestamp: new Date(),
        bundleSize: 1500000, // Over threshold
        gzippedSize: 400000, // Over threshold
        buildTime: 80000, // Over threshold
        formats: { umd: 1500000, esm: 0, iife: 0 },
        dependencies: 2,
        treeShakeEffectiveness: 0.5
      };

      (performanceMonitor as any).history = [currentMetrics];

      const report = await performanceMonitor.analyzePerformance('1.0.1');

      expect(report.overallScore).toBeLessThan(100);
      expect(report.overallScore).toBeLessThan(60); // Should be significantly penalized
    });
  });

  describe('Performance Trends', () => {
    it('should calculate performance trends over time', () => {
      const mockHistory = [
        {
          version: '1.0.0',
          timestamp: new Date('2023-01-01'),
          bundleSize: 100000,
          gzippedSize: 30000,
          buildTime: 10000
        },
        {
          version: '1.0.1',
          timestamp: new Date('2023-01-02'),
          bundleSize: 110000,
          gzippedSize: 33000,
          buildTime: 11000
        },
        {
          version: '1.0.2',
          timestamp: new Date('2023-01-03'),
          bundleSize: 120000,
          gzippedSize: 36000,
          buildTime: 12000
        }
      ];

      (performanceMonitor as any).history = mockHistory;

      const trends = performanceMonitor.getPerformanceTrends(['bundleSize', 'gzippedSize']);

      expect(trends).toHaveLength(2);
      expect(trends).toBeDefined();
      expect(trends[0]).toBeDefined();
      expect(trends[0]?.metric).toBe('bundleSize');
      expect(trends[0]?.trend).toBe('degrading');
      expect(trends[0]?.changeRate).toBe(20); // 20% increase from 100k to 120k
    });

    it('should identify improving trends', () => {
      const mockHistory = [
        {
          version: '1.0.0',
          timestamp: new Date('2023-01-01'),
          bundleSize: 120000,
          buildTime: 15000
        },
        {
          version: '1.0.1',
          timestamp: new Date('2023-01-02'),
          bundleSize: 110000,
          buildTime: 13000
        },
        {
          version: '1.0.2',
          timestamp: new Date('2023-01-03'),
          bundleSize: 100000,
          buildTime: 11000
        }
      ];

      (performanceMonitor as any).history = mockHistory;

      const trends = performanceMonitor.getPerformanceTrends(['bundleSize']);

      expect(trends).toBeDefined();
      expect(trends[0]).toBeDefined();
      expect(trends[0]?.trend).toBe('improving');
      expect(trends[0]?.changeRate).toBeLessThan(0);
    });

    it('should identify stable trends', () => {
      const mockHistory = [
        {
          version: '1.0.0',
          timestamp: new Date('2023-01-01'),
          bundleSize: 100000
        },
        {
          version: '1.0.1',
          timestamp: new Date('2023-01-02'),
          bundleSize: 102000
        },
        {
          version: '1.0.2',
          timestamp: new Date('2023-01-03'),
          bundleSize: 101000
        }
      ];

      (performanceMonitor as any).history = mockHistory;

      const trends = performanceMonitor.getPerformanceTrends(['bundleSize']);

      expect(trends).toBeDefined();
      expect(trends[0]).toBeDefined();
      expect(trends[0]?.trend).toBe('stable');
    });
  });

  describe('Dashboard Data Generation', () => {
    it('should generate dashboard data', () => {
      const mockHistory = [
        {
          version: '1.0.0',
          bundleSize: 100000,
          buildTime: 10000,
          timestamp: new Date('2023-01-01')
        },
        {
          version: '1.0.1',
          bundleSize: 110000,
          buildTime: 11000,
          timestamp: new Date('2023-01-02')
        }
      ];

      (performanceMonitor as any).history = mockHistory;

      const dashboardData = performanceMonitor.generateDashboardData();

      expect(dashboardData.summary.totalBuilds).toBe(2);
      expect(dashboardData.summary.averageBundleSize).toBe(105000);
      expect(dashboardData.summary.averageBuildTime).toBe(10500);
      expect(dashboardData.recentMetrics).toHaveLength(2);
      expect(dashboardData.trends).toBeDefined();
      expect(dashboardData.thresholds).toEqual(mockConfig.thresholds);
    });

    it('should limit recent metrics to 10 items', () => {
      const mockHistory = Array.from({ length: 15 }, (_, i) => ({
        version: `1.0.${i}`,
        bundleSize: 100000 + i * 1000,
        buildTime: 10000,
        timestamp: new Date(`2023-01-${i + 1}`)
      }));

      (performanceMonitor as any).history = mockHistory;

      const dashboardData = performanceMonitor.generateDashboardData();

      expect(dashboardData.recentMetrics).toHaveLength(10);
    });
  });

  describe('History Management', () => {
    it('should export history as JSON', () => {
      const mockHistory = [
        {
          version: '1.0.0',
          bundleSize: 100000,
          timestamp: new Date('2023-01-01')
        }
      ];

      (performanceMonitor as any).history = mockHistory;

      const exported = performanceMonitor.exportHistory('json');
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].version).toBe('1.0.0');
    });

    it('should export history as CSV', () => {
      const mockHistory = [
        {
          version: '1.0.0',
          timestamp: new Date('2023-01-01T00:00:00Z'),
          bundleSize: 100000,
          gzippedSize: 30000,
          buildTime: 10000,
          dependencies: 5
        }
      ];

      (performanceMonitor as any).history = mockHistory;

      const csv = performanceMonitor.exportHistory('csv');
      const lines = csv.split('\n');

      expect(lines[0]).toBe('version,timestamp,bundleSize,gzippedSize,buildTime,dependencies');
      expect(lines[1]).toBe('1.0.0,2023-01-01T00:00:00.000Z,100000,30000,10000,5');
    });

    it('should import history from JSON', () => {
      const historyData = JSON.stringify([
        {
          version: '1.0.0',
          bundleSize: 100000,
          timestamp: '2023-01-01T00:00:00Z'
        }
      ]);

      performanceMonitor.importHistory(historyData, 'json');

      const history = (performanceMonitor as any).history;
      expect(history).toHaveLength(1);
      expect(history[0].version).toBe('1.0.0');
    });

    it('should clear history', () => {
      (performanceMonitor as any).history = [{ version: '1.0.0' }];

      performanceMonitor.clearHistory();

      expect((performanceMonitor as any).history).toHaveLength(0);
    });
  });

  describe('Regression Severity Calculation', () => {
    it('should classify regression severity correctly', () => {
      const calculateSeverity = (performanceMonitor as any).calculateSeverity.bind(performanceMonitor);

      expect(calculateSeverity(5)).toBe('low');
      expect(calculateSeverity(15)).toBe('medium');
      expect(calculateSeverity(30)).toBe('high');
      expect(calculateSeverity(60)).toBe('critical');
    });
  });

  describe('Recommendations Generation', () => {
    it('should generate appropriate recommendations', () => {
      const mockMetrics = {
        bundleSize: 1500000, // Over threshold
        buildTime: 80000, // Over threshold
        treeShakeEffectiveness: 0.6 // Low effectiveness
      };

      const mockRegressions = [
        { metric: 'bundleSize', severity: 'high' }
      ];

      const recommendations = (performanceMonitor as any).generateRecommendations(mockMetrics, mockRegressions);

      expect(recommendations).toContain('Bundle size exceeds threshold - consider code splitting or tree shaking');
      expect(recommendations).toContain('Build time is slow - consider optimizing build configuration');
      expect(recommendations).toContain('Tree shaking effectiveness is low - review unused exports');
      expect(recommendations).toContain('Critical bundle size regression detected - investigate recent changes');
    });

    it('should not generate recommendations for good metrics', () => {
      const mockMetrics = {
        bundleSize: 500000, // Under threshold
        buildTime: 30000, // Under threshold
        treeShakeEffectiveness: 0.9 // Good effectiveness
      };

      const recommendations = (performanceMonitor as any).generateRecommendations(mockMetrics, []);

      expect(recommendations).toHaveLength(0);
    });
  });

  describe('Alert System', () => {
    it('should identify critical regressions for alerts', async () => {
      const mockReport = {
        version: '1.0.1',
        regressions: [
          { metric: 'bundleSize', severity: 'critical' },
          { metric: 'buildTime', severity: 'high' },
          { metric: 'gzippedSize', severity: 'medium' }
        ],
        overallScore: 45,
        timestamp: new Date()
      };

      // Mock console.log to capture alert output
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await (performanceMonitor as any).sendAlertsIfNeeded(mockReport);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨 Sending alert for 2 critical regressions')
      );

      consoleSpy.mockRestore();
    });

    it('should not send alerts for minor regressions', async () => {
      const mockReport = {
        version: '1.0.1',
        regressions: [
          { metric: 'bundleSize', severity: 'low' },
          { metric: 'buildTime', severity: 'medium' }
        ],
        overallScore: 85,
        timestamp: new Date()
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await (performanceMonitor as any).sendAlertsIfNeeded(mockReport);

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('🚨 Sending alert')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('File Size Formatting', () => {
    it('should format file sizes correctly', () => {
      const formatSize = (performanceMonitor as any).formatSize.bind(performanceMonitor);

      expect(formatSize(500)).toBe('500.0B');
      expect(formatSize(1500)).toBe('1.5KB');
      expect(formatSize(1500000)).toBe('1.4MB');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing performance history file', () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      expect(() => new PerformanceMonitor(mockConfig)).not.toThrow();
      expect((performanceMonitor as any).history).toHaveLength(0);
    });

    it('should handle corrupted history file', () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (readFileSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('.performance-history.json')) {
          return 'invalid json';
        }
        return JSON.stringify({ name: 'test-package' });
      });

      expect(() => new PerformanceMonitor(mockConfig)).not.toThrow();
      expect((performanceMonitor as any).history).toHaveLength(0);
    });

    it('should handle missing package.json gracefully', () => {
      (readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File not found');
      });

      const metrics = (performanceMonitor as any).getDependencyCount();
      expect(metrics).toBe(0);
    });

    it('should handle analysis of non-existent version', async () => {
      await expect(performanceMonitor.analyzePerformance('non-existent')).rejects.toThrow(
        'Metrics not found for version non-existent'
      );
    });
  });

  describe('Configuration Validation', () => {
    it('should use default thresholds when not provided', () => {
      const minimalConfig = {
        projectPath: '/test/project',
        thresholds: {
          bundleSize: 1000000,
          gzippedSize: 300000,
          buildTime: 60000,
          regressionPercent: 10
        }
      };

      expect(() => new PerformanceMonitor(minimalConfig)).not.toThrow();
    });

    it('should validate required configuration', () => {
      expect(() => new PerformanceMonitor({} as any)).toThrow();
    });
  });
});
