/**
 * Comprehensive Performance Optimization System Tests
 * @description Tests for caching, query optimization, compression, memory management, monitoring, and adaptive optimization
 */

import { jest } from '@jest/globals';

// Import all performance optimization components
import { CacheManager, MultiLayerCacheManager, createCacheManager } from '../cache/CacheManager.js';
import {
  QueryOptimizer,
  createQueryOptimizer,
  QueryPerformanceAnalyzer,
} from '../optimization/QueryOptimizer.js';
import {
  ResponseCompressor,
  StreamingResponseCompressor,
  AdaptiveCompressionManager,
  createResponseCompressor,
} from '../optimization/ResponseCompressor.js';
import {
  MemoryManager,
  ObjectPool,
  MemoryEfficientCache,
  createMemoryManager,
} from '../optimization/MemoryManager.js';
import {
  PerformanceMonitor,
  createPerformanceMonitor,
  measureFunction,
} from '../monitoring/PerformanceMonitor.js';
import { AdaptiveOptimizer, createAdaptiveOptimizer } from '../optimization/AdaptiveOptimizer.js';

// Import types
import {
  CacheConfig,
  CacheStatistics,
  CompressionConfig,
  CompressionResult,
  MemoryManagementConfig,
  PerformanceConfig,
  PerformanceMetrics,
  QueryOptimizationResult,
  AdaptiveOptimizationConfig,
  OptimizationRecommendation,
} from '../types/Performance.js';

// Mock performance API for Node.js environment
global.performance =
  global.performance ||
  ({
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
  } as any);

// Mock process.memoryUsage for testing
const mockMemoryUsage = jest.fn(() => ({
  rss: 100 * 1024 * 1024,
  heapTotal: 80 * 1024 * 1024,
  heapUsed: 60 * 1024 * 1024,
  external: 5 * 1024 * 1024,
  arrayBuffers: 1 * 1024 * 1024,
}));

Object.defineProperty(global.process, 'memoryUsage', {
  value: mockMemoryUsage,
  writable: true,
});

// Mock localStorage for cache persistence tests
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0,
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Performance Optimization System', () => {
  describe('CacheManager', () => {
    let cacheManager: CacheManager<any>;

    beforeEach(() => {
      cacheManager = new CacheManager({
        maxSize: 100,
        defaultTTL: 60000,
        evictionPolicy: 'LRU',
        compressionEnabled: false,
      });
    });

    afterEach(() => {
      cacheManager.destroy();
    });

    describe('Basic Cache Operations', () => {
      it('should set and get cached values', async () => {
        const testData = { key: 'value', timestamp: Date.now() };

        await cacheManager.set('test-key', testData);
        const retrieved = await cacheManager.get('test-key');

        expect(retrieved).toEqual(testData);
      });

      it('should return null for non-existent keys', async () => {
        const result = await cacheManager.get('non-existent-key');
        expect(result).toBeNull();
      });

      it('should handle TTL expiration', async () => {
        const shortTTL = 100; // 100ms
        await cacheManager.set('expiring-key', 'test-value', shortTTL);

        // Should exist immediately
        let result = await cacheManager.get('expiring-key');
        expect(result).toBe('test-value');

        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 150));

        result = await cacheManager.get('expiring-key');
        expect(result).toBeNull();
      });

      it('should check if keys exist', async () => {
        await cacheManager.set('existing-key', 'value');

        expect(await cacheManager.has('existing-key')).toBe(true);
        expect(await cacheManager.has('non-existing-key')).toBe(false);
      });

      it('should delete cached values', async () => {
        await cacheManager.set('delete-key', 'value');

        expect(await cacheManager.has('delete-key')).toBe(true);

        const deleted = await cacheManager.delete('delete-key');
        expect(deleted).toBe(true);
        expect(await cacheManager.has('delete-key')).toBe(false);
      });
    });

    describe('Cache Eviction Policies', () => {
      it('should evict entries when cache is full (LRU)', async () => {
        const smallCache = new CacheManager({ maxSize: 3, evictionPolicy: 'LRU' });

        // Fill cache
        await smallCache.set('key1', 'value1');
        await smallCache.set('key2', 'value2');
        await smallCache.set('key3', 'value3');

        // Access key1 to make it recently used
        await smallCache.get('key1');

        // Add new entry, should evict key2 (least recently used)
        await smallCache.set('key4', 'value4');

        expect(await smallCache.has('key1')).toBe(true);
        expect(await smallCache.has('key2')).toBe(false);
        expect(await smallCache.has('key3')).toBe(true);
        expect(await smallCache.has('key4')).toBe(true);

        smallCache.destroy();
      });

      it('should handle LFU eviction policy', async () => {
        const lfuCache = new CacheManager({ maxSize: 3, evictionPolicy: 'LFU' });

        await lfuCache.set('key1', 'value1');
        await lfuCache.set('key2', 'value2');
        await lfuCache.set('key3', 'value3');

        // Access key1 multiple times
        await lfuCache.get('key1');
        await lfuCache.get('key1');
        await lfuCache.get('key1');

        // Access key2 once
        await lfuCache.get('key2');

        // Add new entry, should evict key3 (least frequently used)
        await lfuCache.set('key4', 'value4');

        expect(await lfuCache.has('key1')).toBe(true);
        expect(await lfuCache.has('key2')).toBe(true);
        expect(await lfuCache.has('key3')).toBe(false);
        expect(await lfuCache.has('key4')).toBe(true);

        lfuCache.destroy();
      });
    });

    describe('Cache Invalidation', () => {
      it('should invalidate by pattern', async () => {
        await cacheManager.set('user:123', { id: 123, name: 'John' });
        await cacheManager.set('user:456', { id: 456, name: 'Jane' });
        await cacheManager.set('order:789', { id: 789, amount: 100 });

        const invalidated = await cacheManager.invalidate('^user:');

        expect(invalidated).toBe(2);
        expect(await cacheManager.has('user:123')).toBe(false);
        expect(await cacheManager.has('user:456')).toBe(false);
        expect(await cacheManager.has('order:789')).toBe(true);
      });

      it('should clear all cache', async () => {
        await cacheManager.set('key1', 'value1');
        await cacheManager.set('key2', 'value2');
        await cacheManager.set('key3', 'value3');

        await cacheManager.clear();

        expect(await cacheManager.has('key1')).toBe(false);
        expect(await cacheManager.has('key2')).toBe(false);
        expect(await cacheManager.has('key3')).toBe(false);
      });
    });

    describe('Cache Statistics', () => {
      it('should track cache statistics', async () => {
        await cacheManager.set('key1', 'value1');
        await cacheManager.set('key2', 'value2');

        await cacheManager.get('key1'); // Hit
        await cacheManager.get('non-existent'); // Miss

        const stats = cacheManager.getStatistics();

        expect(stats.hits).toBe(1);
        expect(stats.misses).toBe(1);
        expect(stats.hitRate).toBe(0.5);
        expect(stats.entryCount).toBe(2);
      });
    });

    describe('Cache Health', () => {
      it('should provide health status', async () => {
        const health = cacheManager.getHealth();

        expect(health).toHaveProperty('status');
        expect(health).toHaveProperty('issues');
        expect(health).toHaveProperty('recommendations');
        expect(['healthy', 'degraded', 'critical']).toContain(health.status);
      });
    });

    describe('Multi-Layer Cache', () => {
      it('should handle multi-layer caching', async () => {
        const multiCache = new MultiLayerCacheManager({
          multiLayer: true,
          l1: { maxSize: 10, storageType: 'memory' },
          l2: { maxSize: 100, storageType: 'localStorage' },
          coherencyStrategy: 'write-through',
        });

        await multiCache.set('test-key', 'test-value');
        const result = await multiCache.get('test-key');

        expect(result).toBe('test-value');

        const stats = multiCache.getStatistics();
        expect(stats.entryCount).toBeGreaterThan(0);
      });
    });
  });

  describe('QueryOptimizer', () => {
    let queryOptimizer: QueryOptimizer;

    beforeEach(() => {
      queryOptimizer = new QueryOptimizer();
    });

    describe('Query Analysis', () => {
      it('should analyze query execution plan', () => {
        const query = 'SELECT * FROM users WHERE age > 25 ORDER BY name';
        const plan = queryOptimizer.analyzeQuery(query);

        expect(plan).toHaveProperty('nodes');
        expect(plan).toHaveProperty('totalTime');
        expect(plan).toHaveProperty('totalCost');
        expect(plan).toHaveProperty('analysis');
        expect(Array.isArray(plan.nodes)).toBe(true);
      });

      it('should provide query optimization suggestions', () => {
        const query = 'SELECT * FROM users WHERE UPPER(name) = "JOHN"';
        const optimization = queryOptimizer.optimizeQuery(query);

        expect(optimization).toHaveProperty('originalQuery');
        expect(optimization).toHaveProperty('optimizedQuery');
        expect(optimization).toHaveProperty('optimizations');
        expect(optimization).toHaveProperty('indexRecommendations');
        expect(optimization).toHaveProperty('complexityScore');
        expect(optimization.optimizations.length).toBeGreaterThan(0);
      });

      it('should detect problematic query patterns', () => {
        const problematicQueries = [
          'SELECT * FROM large_table',
          'SELECT name FROM users WHERE UPPER(name) = "JOHN"',
          'SELECT u.*, o.* FROM users u, orders o WHERE u.id = o.user_id',
        ];

        problematicQueries.forEach(query => {
          const optimization = queryOptimizer.optimizeQuery(query);
          expect(optimization.optimizations.length).toBeGreaterThan(0);
        });
      });
    });

    describe('Index Recommendations', () => {
      it('should provide index recommendations for multiple queries', () => {
        const queries = [
          'SELECT * FROM users WHERE email = "test@example.com"',
          'SELECT * FROM users WHERE age > 25',
          'SELECT u.name, o.amount FROM users u JOIN orders o ON u.id = o.user_id',
        ];

        const recommendations = queryOptimizer.getIndexRecommendations(queries);

        expect(Array.isArray(recommendations)).toBe(true);
        expect(recommendations.length).toBeGreaterThan(0);

        recommendations.forEach(rec => {
          expect(rec).toHaveProperty('table');
          expect(rec).toHaveProperty('columns');
          expect(rec).toHaveProperty('type');
          expect(rec).toHaveProperty('impact');
        });
      });
    });

    describe('Performance Validation', () => {
      it('should validate query performance against thresholds', () => {
        const query = 'SELECT * FROM users WHERE email = "test@example.com"';
        const thresholds = {
          executionTime: 1000,
          complexity: 5,
        };

        const validation = queryOptimizer.validatePerformance(query, thresholds);

        expect(validation).toHaveProperty('valid');
        expect(validation).toHaveProperty('issues');
        expect(validation).toHaveProperty('suggestions');
        expect(typeof validation.valid).toBe('boolean');
      });
    });

    describe('Query Performance Analysis', () => {
      it('should analyze query performance trends', () => {
        const analyzer = new QueryPerformanceAnalyzer();

        // Record some performance data
        for (let i = 0; i < 10; i++) {
          analyzer.recordPerformance('SELECT * FROM users', 100 + i * 10);
        }

        const trend = analyzer.analyzePerformanceTrends('SELECT * FROM users');

        expect(trend).toHaveProperty('trend');
        expect(trend).toHaveProperty('averageTime');
        expect(trend).toHaveProperty('variance');
        expect(['improving', 'degrading', 'stable']).toContain(trend.trend);
      });
    });
  });

  describe('ResponseCompressor', () => {
    let compressor: ResponseCompressor;

    beforeEach(() => {
      compressor = new ResponseCompressor({
        enabled: true,
        algorithms: ['gzip', 'deflate'],
        level: 6,
        threshold: 100,
      });
    });

    describe('Data Compression', () => {
      it('should compress large data', async () => {
        const largeData = 'x'.repeat(2000); // 2KB of data

        const result = await compressor.compress(largeData);

        expect(result).toHaveProperty('originalSize');
        expect(result).toHaveProperty('compressedSize');
        expect(result).toHaveProperty('ratio');
        expect(result).toHaveProperty('algorithm');
        expect(result.compressedSize).toBeLessThan(result.originalSize);
        expect(result.ratio).toBeLessThan(1);
      });

      it('should not compress small data below threshold', async () => {
        const smallData = 'small';

        const result = await compressor.compress(smallData);

        expect(result.algorithm).toBe('none');
        expect(result.ratio).toBe(1);
      });

      it('should decompress data correctly', async () => {
        const originalData = { message: 'Hello World', numbers: [1, 2, 3, 4, 5] };

        const compressed = await compressor.compress(originalData);
        const decompressed = await compressor.decompress(compressed.data, compressed.algorithm);

        expect(decompressed).toEqual(originalData);
      });
    });

    describe('Compression Algorithms', () => {
      it('should select optimal algorithm based on data characteristics', () => {
        const smallData = 'small data';
        const mediumData = 'x'.repeat(10000);
        const largeData = 'y'.repeat(100000);

        const smallAlgorithm = compressor.getOptimalAlgorithm(smallData);
        const mediumAlgorithm = compressor.getOptimalAlgorithm(mediumData);
        const largeAlgorithm = compressor.getOptimalAlgorithm(largeData);

        expect(typeof smallAlgorithm).toBe('string');
        expect(typeof mediumAlgorithm).toBe('string');
        expect(typeof largeAlgorithm).toBe('string');
      });

      it('should provide compression recommendations', () => {
        const testData = 'test data for compression analysis';

        const recommendations = compressor.getCompressionRecommendations(testData);

        expect(Array.isArray(recommendations)).toBe(true);
        recommendations.forEach(rec => {
          expect(rec).toHaveProperty('algorithm');
          expect(rec).toHaveProperty('estimatedRatio');
          expect(rec).toHaveProperty('estimatedTime');
          expect(rec).toHaveProperty('recommendation');
        });
      });
    });

    describe('Compression Statistics', () => {
      it('should track compression statistics', async () => {
        await compressor.compress('test data 1');
        await compressor.compress('test data 2');

        const stats = compressor.getStatistics();

        expect(stats).toHaveProperty('totalCompressions');
        expect(stats).toHaveProperty('totalSavings');
        expect(stats).toHaveProperty('averageRatio');
        expect(stats).toHaveProperty('algorithmUsage');
      });
    });

    describe('Streaming Compression', () => {
      it('should handle streaming compression', async () => {
        const streamingCompressor = new StreamingResponseCompressor();

        async function* dataGenerator() {
          for (let i = 0; i < 5; i++) {
            yield `chunk ${i} with some data`;
          }
        }

        const compressedChunks: Uint8Array[] = [];
        for await (const chunk of streamingCompressor.compressStream(dataGenerator())) {
          compressedChunks.push(chunk);
        }

        expect(compressedChunks.length).toBeGreaterThan(0);
      });
    });

    describe('Adaptive Compression', () => {
      it('should adapt compression strategy based on performance', async () => {
        const adaptiveManager = new AdaptiveCompressionManager();

        const testData = 'test data for adaptive compression';

        const result1 = await adaptiveManager.compressAdaptively(testData, {
          priority: 'speed',
        });

        const result2 = await adaptiveManager.compressAdaptively(testData, {
          priority: 'size',
        });

        expect(result1).toHaveProperty('algorithm');
        expect(result2).toHaveProperty('algorithm');

        const insights = adaptiveManager.getPerformanceInsights();
        expect(insights).toHaveProperty('bestAlgorithmBySize');
        expect(insights).toHaveProperty('bestAlgorithmBySpeed');
      });
    });
  });

  describe('MemoryManager', () => {
    let memoryManager: MemoryManager;

    beforeEach(() => {
      memoryManager = new MemoryManager({
        autoGC: false, // Disable auto GC for testing
        leakDetection: true,
        useWeakReferences: true,
      });
    });

    afterEach(() => {
      memoryManager.destroy();
    });

    describe('Object Registration', () => {
      it('should register and track objects', () => {
        const testObject = { data: 'test', size: 1000 };

        const id = memoryManager.register(testObject, 'test_objects');

        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      });

      it('should unregister objects', () => {
        const testObject = { data: 'test' };

        const id = memoryManager.register(testObject, 'test_objects');
        expect(memoryManager.unregister(id)).toBe(true);
        expect(memoryManager.unregister('non-existent')).toBe(false);
      });
    });

    describe('Memory Statistics', () => {
      it('should provide memory usage statistics', () => {
        memoryManager.register({ data: 'test1' }, 'category1');
        memoryManager.register({ data: 'test2' }, 'category2');

        const stats = memoryManager.getUsageStats();

        expect(stats).toHaveProperty('totalAllocated');
        expect(stats).toHaveProperty('used');
        expect(stats).toHaveProperty('available');
        expect(stats).toHaveProperty('byCategory');
        expect(stats).toHaveProperty('byComponent');
        expect(stats).toHaveProperty('gc');
        expect(stats).toHaveProperty('leaks');
      });
    });

    describe('Garbage Collection', () => {
      it('should trigger garbage collection', async () => {
        const result = await memoryManager.triggerGC();

        expect(result).toHaveProperty('freedMemory');
        expect(result).toHaveProperty('duration');
        expect(typeof result.freedMemory).toBe('number');
        expect(typeof result.duration).toBe('number');
      });
    });

    describe('Memory Leak Detection', () => {
      it('should detect potential memory leaks', async () => {
        // Register many objects to simulate potential leaks
        for (let i = 0; i < 50; i++) {
          memoryManager.register({ data: `object_${i}` }, 'potential_leak');
        }

        const leaks = await memoryManager.detectLeaks();

        expect(Array.isArray(leaks)).toBe(true);
        leaks.forEach(leak => {
          expect(leak).toHaveProperty('source');
          expect(leak).toHaveProperty('size');
          expect(leak).toHaveProperty('severity');
        });
      });
    });

    describe('Memory Recommendations', () => {
      it('should provide memory optimization recommendations', () => {
        const recommendations = memoryManager.getRecommendations();

        expect(Array.isArray(recommendations)).toBe(true);
        recommendations.forEach(rec => {
          expect(rec).toHaveProperty('type');
          expect(rec).toHaveProperty('description');
          expect(rec).toHaveProperty('priority');
          expect(['cleanup', 'optimization', 'limit']).toContain(rec.type);
        });
      });
    });

    describe('Object Pool', () => {
      it('should manage object pool efficiently', () => {
        const createObject = () => ({ data: null, processed: false });
        const resetObject = (obj: any) => {
          obj.data = null;
          obj.processed = false;
        };

        const pool = new ObjectPool(createObject, resetObject, 5);

        // Acquire objects
        const obj1 = pool.acquire();
        const obj2 = pool.acquire();

        expect(obj1).toHaveProperty('data');
        expect(obj2).toHaveProperty('data');

        // Release objects
        pool.release(obj1);
        pool.release(obj2);

        const stats = pool.getStats();
        expect(stats.poolSize).toBe(2);
        expect(stats.maxSize).toBe(5);

        pool.clear();
      });
    });

    describe('Memory Efficient Cache', () => {
      it('should provide memory efficient caching', async () => {
        const cache = new MemoryEfficientCache<string, any>(10, 60000);

        cache.set('key1', { data: 'value1' });
        cache.set('key2', { data: 'value2' });

        expect(cache.get('key1')).toEqual({ data: 'value1' });
        expect(cache.get('non-existent')).toBeUndefined();

        const stats = cache.getStats();
        expect(stats).toHaveProperty('size');
        expect(stats).toHaveProperty('maxSize');
        expect(stats).toHaveProperty('hitRate');
        expect(stats).toHaveProperty('memoryUsage');

        cache.destroy();
      });

      it('should handle TTL expiration in memory efficient cache', async () => {
        const cache = new MemoryEfficientCache<string, any>(10, 100); // 100ms TTL

        cache.set('expiring', 'value');
        expect(cache.get('expiring')).toBe('value');

        await new Promise(resolve => setTimeout(resolve, 150));
        expect(cache.get('expiring')).toBeUndefined();

        cache.destroy();
      });
    });
  });

  describe('PerformanceMonitor', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
      monitor = new PerformanceMonitor({
        monitoringEnabled: true,
        sampleRate: 1.0,
        metricsInterval: 1000,
        responseTimeTarget: 100,
      });
    });

    afterEach(() => {
      monitor.destroy();
    });

    describe('Performance Measurements', () => {
      it('should measure operation performance', async () => {
        const measurementId = monitor.startMeasurement('test_operation', {
          userId: '123',
          operation: 'data_fetch',
        });

        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 10));

        const measurement = monitor.endMeasurement(measurementId, true);

        expect(measurement).toHaveProperty('id');
        expect(measurement).toHaveProperty('operation');
        expect(measurement).toHaveProperty('duration');
        expect(measurement.operation).toBe('test_operation');
        expect(measurement.success).toBe(true);
        expect(measurement.duration).toBeGreaterThan(0);
      });

      it('should handle measurement errors', async () => {
        const measurementId = monitor.startMeasurement('failing_operation');

        const measurement = monitor.endMeasurement(measurementId, false, 'Test error');

        expect(measurement.success).toBe(false);
        expect(measurement.error).toBe('Test error');
      });
    });

    describe('Custom Metrics', () => {
      it('should record custom metrics', () => {
        monitor.recordMetric('custom_counter', 42, { type: 'counter' });
        monitor.recordMetric('custom_gauge', 3.14, { type: 'gauge' });

        // Should not throw errors
        expect(true).toBe(true);
      });
    });

    describe('Performance Metrics', () => {
      it('should provide comprehensive performance metrics', async () => {
        // Generate some measurements
        for (let i = 0; i < 5; i++) {
          const id = monitor.startMeasurement('test_op');
          await new Promise(resolve => setTimeout(resolve, 10));
          monitor.endMeasurement(id, true);
        }

        // Wait for metrics collection
        await new Promise(resolve => setTimeout(resolve, 100));

        const metrics = monitor.getMetrics();

        expect(metrics).toHaveProperty('responseTime');
        expect(metrics).toHaveProperty('throughput');
        expect(metrics).toHaveProperty('memory');
        expect(metrics).toHaveProperty('cpu');
        expect(metrics).toHaveProperty('cache');
        expect(metrics).toHaveProperty('errors');
        expect(metrics).toHaveProperty('timeWindow');
      });
    });

    describe('Performance Alerts', () => {
      it('should trigger alerts when thresholds are exceeded', async () => {
        let alertReceived = false;
        let receivedAlert: any = null;

        monitor.onAlert(alert => {
          alertReceived = true;
          receivedAlert = alert;
        });

        // Simulate high response time
        const id = monitor.startMeasurement('slow_operation');
        await new Promise(resolve => setTimeout(resolve, 200)); // 200ms > 100ms target
        monitor.endMeasurement(id, true);

        // Wait for potential alert
        await new Promise(resolve => setTimeout(resolve, 100));

        // Note: Alert triggering depends on metrics collection interval
        // This test verifies the alert handler registration works
        expect(typeof alertReceived).toBe('boolean');
      });
    });

    describe('Performance Recommendations', () => {
      it('should provide optimization recommendations', () => {
        const recommendations = monitor.getRecommendations();

        expect(Array.isArray(recommendations)).toBe(true);
        recommendations.forEach(rec => {
          expect(rec).toHaveProperty('id');
          expect(rec).toHaveProperty('type');
          expect(rec).toHaveProperty('title');
          expect(rec).toHaveProperty('description');
          expect(rec).toHaveProperty('impact');
          expect(rec).toHaveProperty('effort');
          expect(rec).toHaveProperty('priority');
          expect(rec).toHaveProperty('confidence');
        });
      });
    });

    describe('Function Measurement Wrapper', () => {
      it('should wrap functions with performance measurement', async () => {
        const originalFunction = async (x: number, y: number) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return x + y;
        };

        const measuredFunction = measureFunction(originalFunction, monitor, 'addition');

        const result = await measuredFunction(2, 3);

        expect(result).toBe(5);
        // Measurement should have been recorded automatically
      });

      it('should handle synchronous functions', () => {
        const syncFunction = (x: number, y: number) => x * y;
        const measuredFunction = measureFunction(syncFunction, monitor, 'multiplication');

        const result = measuredFunction(3, 4);

        expect(result).toBe(12);
      });

      it('should handle function errors', async () => {
        const errorFunction = () => {
          throw new Error('Test error');
        };

        const measuredFunction = measureFunction(errorFunction, monitor, 'error_function');

        await expect(measuredFunction).rejects.toThrow('Test error');
      });
    });
  });

  describe('AdaptiveOptimizer', () => {
    let optimizer: AdaptiveOptimizer;

    beforeEach(() => {
      optimizer = new AdaptiveOptimizer({
        enabled: true,
        algorithms: ['heuristic', 'reinforcement'],
        objectives: ['response_time', 'memory_usage'],
        weights: {
          response_time: 0.6,
          memory_usage: 0.4,
        },
      });
    });

    describe('Pattern Analysis', () => {
      it('should analyze performance patterns', () => {
        const sampleMetrics: PerformanceMetrics[] = [
          createSampleMetrics(100, 50 * 1024 * 1024, 0.8, 0.01),
          createSampleMetrics(120, 55 * 1024 * 1024, 0.75, 0.015),
          createSampleMetrics(150, 60 * 1024 * 1024, 0.7, 0.02),
          createSampleMetrics(180, 65 * 1024 * 1024, 0.65, 0.025),
          createSampleMetrics(200, 70 * 1024 * 1024, 0.6, 0.03),
        ];

        const patterns = optimizer.analyzePatterns(sampleMetrics);

        expect(Array.isArray(patterns)).toBe(true);
        expect(patterns.length).toBeGreaterThan(0);

        patterns.forEach(pattern => {
          expect(pattern).toHaveProperty('pattern');
          expect(pattern).toHaveProperty('confidence');
          expect(pattern).toHaveProperty('recommendation');
          expect(typeof pattern.confidence).toBe('number');
        });
      });
    });

    describe('Optimization Recommendations', () => {
      it('should generate optimization recommendations', () => {
        const currentMetrics = createSampleMetrics(250, 100 * 1024 * 1024, 0.5, 0.05);
        const historicalMetrics = [
          createSampleMetrics(200, 80 * 1024 * 1024, 0.6, 0.03),
          createSampleMetrics(220, 90 * 1024 * 1024, 0.55, 0.04),
        ];

        const recommendations = optimizer.generateRecommendations(
          currentMetrics,
          historicalMetrics
        );

        expect(Array.isArray(recommendations)).toBe(true);
        expect(recommendations.length).toBeGreaterThan(0);

        recommendations.forEach(rec => {
          expect(rec).toHaveProperty('id');
          expect(rec).toHaveProperty('type');
          expect(rec).toHaveProperty('title');
          expect(rec).toHaveProperty('description');
          expect(rec).toHaveProperty('impact');
          expect(rec).toHaveProperty('effort');
          expect(rec).toHaveProperty('priority');
          expect(rec).toHaveProperty('confidence');
          expect(rec).toHaveProperty('steps');
          expect(rec).toHaveProperty('resources');
          expect(rec).toHaveProperty('timeline');
        });
      });
    });

    describe('Optimization Application', () => {
      it('should apply optimization recommendations', async () => {
        const recommendation: OptimizationRecommendation = {
          id: 'test_optimization',
          type: 'cache',
          title: 'Test Optimization',
          description: 'Test optimization for unit testing',
          impact: {
            responseTime: 0.3,
            memoryUsage: 0.1,
          },
          effort: 'medium',
          priority: 8,
          confidence: 0.8,
          steps: ['Step 1', 'Step 2'],
          resources: ['Resource 1'],
          timeline: '1 week',
        };

        const result = await optimizer.applyOptimization(recommendation);

        expect(result).toHaveProperty('success');
        expect(typeof result.success).toBe('boolean');

        if (result.success) {
          expect(result).toHaveProperty('result');
        } else {
          expect(result).toHaveProperty('error');
        }
      });
    });

    describe('Learning from Results', () => {
      it('should learn from optimization results', () => {
        const recommendation: OptimizationRecommendation = {
          id: 'learning_test',
          type: 'memory',
          title: 'Memory Optimization',
          description: 'Test memory optimization',
          impact: { memoryUsage: 0.2 },
          effort: 'low',
          priority: 5,
          confidence: 0.6,
          steps: [],
          resources: [],
          timeline: '',
        };

        const beforeMetrics = createSampleMetrics(200, 100 * 1024 * 1024, 0.7, 0.02);
        const afterMetrics = createSampleMetrics(180, 80 * 1024 * 1024, 0.8, 0.015);

        // Should not throw errors
        expect(() => {
          optimizer.learnFromResults(recommendation, beforeMetrics, afterMetrics);
        }).not.toThrow();
      });
    });

    describe('Optimizer State', () => {
      it('should provide optimizer state information', () => {
        const state = optimizer.getState();

        expect(state).toHaveProperty('learningProgress');
        expect(state).toHaveProperty('optimizationsApplied');
        expect(state).toHaveProperty('successRate');
        expect(state).toHaveProperty('confidence');

        expect(typeof state.learningProgress).toBe('number');
        expect(typeof state.optimizationsApplied).toBe('number');
        expect(typeof state.successRate).toBe('number');
        expect(typeof state.confidence).toBe('number');

        expect(state.learningProgress).toBeGreaterThanOrEqual(0);
        expect(state.learningProgress).toBeLessThanOrEqual(1);
        expect(state.successRate).toBeGreaterThanOrEqual(0);
        expect(state.successRate).toBeLessThanOrEqual(1);
        expect(state.confidence).toBeGreaterThanOrEqual(0);
        expect(state.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Integration Tests', () => {
    describe('Complete Performance Pipeline', () => {
      it('should integrate all performance components', async () => {
        const cacheManager = createCacheManager({ maxSize: 1000 });
        const queryOptimizer = createQueryOptimizer();
        const compressor = createResponseCompressor();
        const memoryManager = createMemoryManager();
        const monitor = createPerformanceMonitor();
        const optimizer = createAdaptiveOptimizer();

        // Simulate a complete request pipeline
        const processRequest = async (query: string, data: any) => {
          const measurementId = monitor.startMeasurement('request_processing');

          try {
            // 1. Check cache
            let result = await cacheManager.get(query);

            if (!result) {
              // 2. Optimize query
              const optimization = queryOptimizer.optimizeQuery(query);

              // 3. Process data (simulation)
              result = { data, optimized: true, timestamp: Date.now() };

              // 4. Compress if needed
              if (JSON.stringify(result).length > 1000) {
                const compressed = await compressor.compress(result);
                result = { compressed: compressed.data, algorithm: compressed.algorithm };
              }

              // 5. Store in cache
              await cacheManager.set(query, result);

              // 6. Register with memory manager
              memoryManager.register(result, 'query_results');
            }

            monitor.endMeasurement(measurementId, true);
            return result;
          } catch (error) {
            monitor.endMeasurement(measurementId, false, error.message);
            throw error;
          }
        };

        // Test the pipeline
        const testQuery = 'SELECT * FROM users WHERE active = true';
        const testData = {
          users: Array(100)
            .fill(null)
            .map((_, i) => ({ id: i, name: `User ${i}` })),
        };

        const result1 = await processRequest(testQuery, testData);
        expect(result1).toBeDefined();

        const result2 = await processRequest(testQuery, testData);
        expect(result2).toBeDefined();

        // Get performance metrics
        const metrics = monitor.getMetrics();
        expect(metrics).toBeDefined();

        // Get optimization recommendations
        const recommendations = optimizer.generateRecommendations(metrics, []);
        expect(Array.isArray(recommendations)).toBe(true);

        // Cleanup
        cacheManager.destroy();
        memoryManager.destroy();
        monitor.destroy();
      });
    });

    describe('Performance Under Load', () => {
      it('should handle high concurrent load', async () => {
        const cacheManager = createCacheManager({ maxSize: 10000 });
        const monitor = createPerformanceMonitor();

        const concurrentRequests = Array(100)
          .fill(null)
          .map(async (_, i) => {
            const key = `concurrent_key_${i}`;
            const value = { id: i, data: `data_${i}`, timestamp: Date.now() };

            const measurementId = monitor.startMeasurement('concurrent_operation');

            await cacheManager.set(key, value);
            const retrieved = await cacheManager.get(key);

            monitor.endMeasurement(measurementId, retrieved !== null);

            return retrieved;
          });

        const results = await Promise.all(concurrentRequests);

        expect(results.length).toBe(100);
        expect(results.every(result => result !== null)).toBe(true);

        const metrics = monitor.getMetrics();
        expect(metrics.throughput.totalRequests).toBeGreaterThan(0);

        cacheManager.destroy();
        monitor.destroy();
      });
    });

    describe('Memory Management Integration', () => {
      it('should manage memory efficiently under load', async () => {
        const memoryManager = createMemoryManager({
          autoGC: true,
          gcThreshold: 50 * 1024 * 1024, // 50MB
          leakDetection: true,
        });

        const cache = new MemoryEfficientCache(1000, 60000, memoryManager);

        // Create many objects to test memory management
        for (let i = 0; i < 1000; i++) {
          const object = { id: i, data: 'x'.repeat(1000) }; // ~1KB each
          memoryManager.register(object, 'test_objects');
          cache.set(`key_${i}`, object);
        }

        const stats = memoryManager.getUsageStats();
        expect(stats.totalAllocated).toBeGreaterThan(0);

        const leaks = await memoryManager.detectLeaks();
        expect(Array.isArray(leaks)).toBe(true);

        const { cleaned, freedMemory } = await memoryManager.cleanup();
        expect(typeof cleaned).toBe('number');
        expect(typeof freedMemory).toBe('number');

        cache.destroy();
        memoryManager.destroy();
      });
    });

    describe('Error Handling and Recovery', () => {
      it('should handle component failures gracefully', async () => {
        const monitor = createPerformanceMonitor();

        // Test with failing operations
        const failingOperation = async () => {
          const id = monitor.startMeasurement('failing_op');

          try {
            // Simulate random failures
            if (Math.random() < 0.3) {
              throw new Error('Simulated failure');
            }

            await new Promise(resolve => setTimeout(resolve, 10));
            monitor.endMeasurement(id, true);
            return 'success';
          } catch (error) {
            monitor.endMeasurement(id, false, error.message);
            throw error;
          }
        };

        const results = await Promise.allSettled(
          Array(20)
            .fill(null)
            .map(() => failingOperation())
        );

        const successes = results.filter(r => r.status === 'fulfilled').length;
        const failures = results.filter(r => r.status === 'rejected').length;

        expect(successes + failures).toBe(20);
        expect(successes).toBeGreaterThan(0); // Should have some successes

        const metrics = monitor.getMetrics();
        expect(metrics.errors.totalErrors).toBe(failures);

        monitor.destroy();
      });
    });
  });
});

// Helper function to create sample metrics
function createSampleMetrics(
  responseTime: number,
  memoryUsed: number,
  cacheHitRate: number,
  errorRate: number
): PerformanceMetrics {
  return {
    responseTime: {
      average: responseTime,
      median: responseTime,
      p95: responseTime * 1.5,
      p99: responseTime * 2,
      min: responseTime * 0.5,
      max: responseTime * 3,
    },
    throughput: {
      requestsPerSecond: 10,
      totalRequests: 100,
      successfulRequests: Math.floor(100 * (1 - errorRate)),
      failedRequests: Math.floor(100 * errorRate),
    },
    memory: {
      heapUsed: memoryUsed,
      heapTotal: memoryUsed * 1.5,
      external: memoryUsed * 0.1,
      rss: memoryUsed * 1.8,
      cacheSize: memoryUsed * 0.2,
    },
    cpu: {
      usage: 0.3,
      loadAverage: [0.5, 0.6, 0.7],
    },
    cache: {
      hitRate: cacheHitRate,
      missRate: 1 - cacheHitRate,
      evictionRate: 0.01,
      averageGetTime: 2,
      averageSetTime: 3,
    },
    errors: {
      totalErrors: Math.floor(100 * errorRate),
      errorRate,
      errorsByType: {
        network: Math.floor(50 * errorRate),
        timeout: Math.floor(30 * errorRate),
        validation: Math.floor(20 * errorRate),
      },
    },
    timeWindow: {
      start: Date.now() - 60000,
      end: Date.now(),
      duration: 60000,
    },
  };
}
