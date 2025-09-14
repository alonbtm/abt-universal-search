import { PerformanceTracker } from '../PerformanceTracker';

describe('PerformanceTracker', () => {
  let tracker: PerformanceTracker;

  beforeEach(() => {
    tracker = new PerformanceTracker();
    jest.clearAllMocks();
    
    // Mock performance API
    global.performance = {
      now: jest.fn(() => Date.now()),
      mark: jest.fn(),
      measure: jest.fn(),
      getEntriesByType: jest.fn(() => []),
      getEntriesByName: jest.fn(() => []),
      clearMarks: jest.fn(),
      clearMeasures: jest.fn()
    } as any;
  });

  afterEach(() => {
    tracker.cleanup();
  });

  describe('measurement collection', () => {
    test('should track search performance measurement', async () => {
      const measurementId = tracker.startMeasurement('search_query', {
        query: 'test query',
        source: 'api'
      });

      tracker.endMeasurement(measurementId, true, {
        resultCount: 25,
        cacheStatus: 'miss'
      });

      const summary = tracker.getMetricsSummary();
      expect(summary.responseTime.avg).toBeGreaterThanOrEqual(0);
    });

    test('should calculate performance baselines', async () => {
      // Record multiple measurements
      for (let i = 0; i < 10; i++) {
        tracker.recordSearchPerformance({
          searchId: `search-${i}`,
          query: 'test',
          startTime: Date.now(),
          endTime: Date.now() + 100 + i * 10,
          responseTime: 100 + i * 10,
          renderTime: 50 + i * 5,
          totalTime: 150 + i * 15,
          resultCount: 20 + i,
          cacheHit: i % 2 === 0,
          metadata: {}
        });
      }

      const baseline = await tracker.getPerformanceBaseline();
      
      expect(baseline.metrics.responseTime.p95).toBeGreaterThan(baseline.metrics.responseTime.p50);
      expect(baseline.sampleSize).toBe(10);
    });

    test('should detect performance regressions', async () => {
      // Establish baseline with good performance
      for (let i = 0; i < 5; i++) {
        tracker.recordSearchPerformance({
          searchId: `baseline-${i}`,
          query: 'test',
          startTime: Date.now(),
          endTime: Date.now() + 100,
          responseTime: 100,
          renderTime: 50,
          totalTime: 150,
          resultCount: 20,
          cacheHit: true,
          metadata: {}
        });
      }

      // Record slow measurement
      tracker.recordSearchPerformance({
        searchId: 'slow-search',
        query: 'test',
        startTime: Date.now(),
        endTime: Date.now() + 500,
        responseTime: 500,
        renderTime: 200,
        totalTime: 700,
        resultCount: 15,
        cacheHit: false,
        metadata: {}
      });

      const regression = await tracker.detectRegression();
      
      expect(regression.detected).toBe(true);
      expect(regression.affectedMetrics).toContain('responseTime');
      expect(regression.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('frame rate monitoring', () => {
    test('should track frame rates', () => {
      tracker.startFrameRateMonitoring();
      
      // Simulate frame callback
      const callback = (window.requestAnimationFrame as jest.Mock).mock.calls[0][0];
      const timestamps = [0, 16.67, 33.33, 50, 66.67]; // 60fps
      
      timestamps.forEach(timestamp => callback(timestamp));
      
      tracker.stopFrameRateMonitoring();
      
      expect(tracker.getCurrentFPS()).toBeCloseTo(60, 0);
    });

    test('should detect low frame rates', () => {
      tracker.startFrameRateMonitoring();
      
      const callback = (window.requestAnimationFrame as jest.Mock).mock.calls[0][0];
      const timestamps = [0, 33.33, 66.67, 100, 133.33]; // 30fps
      
      timestamps.forEach(timestamp => callback(timestamp));
      
      expect(tracker.getCurrentFPS()).toBeCloseTo(30, 0);
      expect(tracker.getCurrentFPS()).toBeLessThan(50); // Below good threshold
    });
  });

  describe('interaction latency', () => {
    test('should measure interaction latency', () => {
      const startTime = Date.now();
      tracker.startInteractionMeasurement('click', 'button-id');
      
      // Simulate processing time
      setTimeout(() => {
        tracker.endInteractionMeasurement('click', 'button-id');
      }, 50);
      
      const latency = tracker.getLastInteractionLatency();
      expect(latency).toBeGreaterThan(40);
      expect(latency).toBeLessThan(100);
    });

    test('should track interaction patterns', () => {
      tracker.startInteractionMeasurement('scroll', 'content');
      tracker.endInteractionMeasurement('scroll', 'content');
      
      tracker.startInteractionMeasurement('click', 'button');
      tracker.endInteractionMeasurement('click', 'button');
      
      const patterns = tracker.getInteractionPatterns();
      expect(patterns).toHaveProperty('scroll');
      expect(patterns).toHaveProperty('click');
    });
  });

  describe('memory monitoring', () => {
    test('should track memory usage', () => {
      // Mock memory API
      (global as any).performance.memory = {
        usedJSHeapSize: 10000000,
        totalJSHeapSize: 20000000,
        jsHeapSizeLimit: 100000000
      };

      const memoryUsage = tracker.getCurrentMemoryUsage();
      
      expect(memoryUsage.used).toBe(10000000);
      expect(memoryUsage.total).toBe(20000000);
      expect(memoryUsage.limit).toBe(100000000);
      expect(memoryUsage.utilization).toBe(0.5);
    });

    test('should detect memory pressure', () => {
      (global as any).performance.memory = {
        usedJSHeapSize: 90000000,
        totalJSHeapSize: 95000000,
        jsHeapSizeLimit: 100000000
      };

      const memoryUsage = tracker.getCurrentMemoryUsage();
      const isPressure = tracker.isMemoryPressure();
      
      expect(memoryUsage.utilization).toBeGreaterThan(0.8);
      expect(isPressure).toBe(true);
    });
  });

  describe('cache performance', () => {
    test('should track cache hits and misses', () => {
      tracker.recordCacheHit('search-results', 'query-123');
      tracker.recordCacheHit('search-results', 'query-456');
      tracker.recordCacheMiss('search-results', 'query-789');
      
      const stats = tracker.getCacheStats();
      
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.67, 2);
    });

    test('should analyze cache efficiency', () => {
      // Record cache patterns
      for (let i = 0; i < 100; i++) {
        if (i % 4 === 0) {
          tracker.recordCacheMiss('search-results', `query-${i}`);
        } else {
          tracker.recordCacheHit('search-results', `query-${i}`);
        }
      }
      
      const analysis = tracker.analyzeCacheEfficiency();
      
      expect(analysis.hitRate).toBeCloseTo(0.75, 2);
      expect(analysis.recommendations).toContain('cache-size-optimization');
    });
  });

  describe('metrics aggregation', () => {
    test('should provide comprehensive metrics summary', async () => {
      // Record various performance data
      tracker.recordSearchPerformance({
        searchId: 'test-1',
        query: 'test',
        startTime: Date.now(),
        endTime: Date.now() + 100,
        responseTime: 100,
        renderTime: 50,
        totalTime: 150,
        resultCount: 20,
        cacheHit: true,
        metadata: {}
      });

      tracker.recordCacheHit('search', 'query-1');
      tracker.startFrameRateMonitoring();
      
      const summary = await tracker.getMetricsSummary();
      
      expect(summary).toHaveProperty('averageResponseTime');
      expect(summary).toHaveProperty('averageRenderTime');
      expect(summary).toHaveProperty('cacheHitRate');
      expect(summary).toHaveProperty('memoryUsage');
      expect(summary.averageResponseTime).toBe(100);
    });

    test('should calculate performance trends', async () => {
      const now = Date.now();
      
      // Record measurements over time
      for (let i = 0; i < 24; i++) {
        tracker.recordSearchPerformance({
          searchId: `hourly-${i}`,
          query: 'trend-test',
          startTime: now - (24 - i) * 3600000,
          endTime: now - (24 - i) * 3600000 + 100 + i * 5,
          responseTime: 100 + i * 5,
          renderTime: 50 + i * 2,
          totalTime: 150 + i * 7,
          resultCount: 20,
          cacheHit: i % 2 === 0,
          metadata: { hour: i }
        });
      }
      
      const trends = await tracker.getPerformanceTrends('1h');
      
      expect(trends.length).toBe(24);
      expect(trends[23].responseTime).toBeGreaterThan(trends[0].responseTime);
    });
  });

  describe('error handling', () => {
    test('should handle missing performance API gracefully', () => {
      delete (global as any).performance;
      
      const newTracker = new PerformanceTracker();
      
      expect(() => {
        newTracker.recordSearchPerformance({
          searchId: 'test',
          query: 'test',
          startTime: Date.now(),
          endTime: Date.now() + 100,
          responseTime: 100,
          renderTime: 50,
          totalTime: 150,
          resultCount: 20,
          cacheHit: true,
          metadata: {}
        });
      }).not.toThrow();
      
      newTracker.dispose();
    });

    test('should handle invalid measurements', () => {
      expect(() => {
        tracker.recordSearchPerformance({
          searchId: '',
          query: '',
          startTime: Date.now() + 1000,
          endTime: Date.now(),
          responseTime: -100,
          renderTime: -50,
          totalTime: -150,
          resultCount: -5,
          cacheHit: true,
          metadata: {}
        });
      }).not.toThrow();
    });
  });
});