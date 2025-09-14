/**
 * Performance Validation Tests - Validate rate limiting system meets <1ms per query requirement
 * @description Tests performance of all rate limiting components to ensure sub-millisecond response times
 */

import { EnhancedRateLimiter } from '../../utils/EnhancedRateLimiter';
import { AdaptiveDebouncer } from '../AdaptiveDebouncer';
import { RequestDeduplicator } from '../RequestDeduplicator';
import { CircuitBreaker } from '../CircuitBreaker';
import { ClientFingerprinter } from '../ClientFingerprinter';
import { GracefulDegradation } from '../GracefulDegradation';

// Performance test configuration
const PERFORMANCE_ITERATIONS = 1000;
const MAX_ALLOWED_TIME_MS = 1; // <1ms requirement

describe('Rate Limiting Performance Validation', () => {
  describe('EnhancedRateLimiter Performance', () => {
    test('should meet <1ms per checkLimit operation', async () => {
      const rateLimiter = new EnhancedRateLimiter();
      const times: number[] = [];

      for (let i = 0; i < PERFORMANCE_ITERATIONS; i++) {
        const start = performance.now();
        await rateLimiter.checkLimit(`client-${i % 100}`, `query-${i}`);
        const end = performance.now();
        times.push(end - start);
      }

      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      const p95Time = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

      console.log(`RateLimiter Performance:
        Average: ${avgTime.toFixed(3)}ms
        Max: ${maxTime.toFixed(3)}ms
        P95: ${p95Time.toFixed(3)}ms`);

      expect(avgTime).toBeLessThan(MAX_ALLOWED_TIME_MS);
      expect(p95Time).toBeLessThan(MAX_ALLOWED_TIME_MS * 2); // Allow 2ms for P95

      rateLimiter.destroy();
    });

    test('should handle high concurrency efficiently', async () => {
      const rateLimiter = new EnhancedRateLimiter();
      const concurrentRequests = 100;
      
      const start = performance.now();
      
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        rateLimiter.checkLimit(`client-${i}`, `concurrent-query-${i}`)
      );
      
      await Promise.all(promises);
      
      const end = performance.now();
      const totalTime = end - start;
      const avgTimePerRequest = totalTime / concurrentRequests;

      console.log(`Concurrent Performance:
        Total time: ${totalTime.toFixed(3)}ms
        Avg per request: ${avgTimePerRequest.toFixed(3)}ms`);

      expect(avgTimePerRequest).toBeLessThan(MAX_ALLOWED_TIME_MS);

      rateLimiter.destroy();
    });
  });

  describe('AdaptiveDebouncer Performance', () => {
    test('should meet <1ms per shouldBypass operation', () => {
      const debouncer = new AdaptiveDebouncer();
      const times: number[] = [];

      for (let i = 0; i < PERFORMANCE_ITERATIONS; i++) {
        const start = performance.now();
        debouncer.shouldBypass(`test-query-${i % 50}`);
        const end = performance.now();
        times.push(end - start);
      }

      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);

      console.log(`AdaptiveDebouncer Performance:
        Average: ${avgTime.toFixed(3)}ms
        Max: ${maxTime.toFixed(3)}ms`);

      expect(avgTime).toBeLessThan(MAX_ALLOWED_TIME_MS);

      debouncer.clearAll();
    });

    test('should meet <1ms per pattern analysis', () => {
      const debouncer = new AdaptiveDebouncer();
      const testQueries = [
        'user@example.com',
        'https://example.com',
        'SELECT * FROM users',
        'random text query',
        '12345'
      ];
      const times: number[] = [];

      for (let i = 0; i < PERFORMANCE_ITERATIONS; i++) {
        const query = testQueries[i % testQueries.length];
        const start = performance.now();
        debouncer.getPatternAnalysis(query);
        const end = performance.now();
        times.push(end - start);
      }

      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;

      console.log(`Pattern Analysis Performance:
        Average: ${avgTime.toFixed(3)}ms`);

      expect(avgTime).toBeLessThan(MAX_ALLOWED_TIME_MS);

      debouncer.clearAll();
    });
  });

  describe('RequestDeduplicator Performance', () => {
    test('should meet <1ms per shouldDeduplicate operation', () => {
      const deduplicator = new RequestDeduplicator();
      const times: number[] = [];

      for (let i = 0; i < PERFORMANCE_ITERATIONS; i++) {
        const start = performance.now();
        deduplicator.shouldDeduplicate(`query-${i % 100}`, { param: i });
        const end = performance.now();
        times.push(end - start);
      }

      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;

      console.log(`RequestDeduplicator Performance:
        Average: ${avgTime.toFixed(3)}ms`);

      expect(avgTime).toBeLessThan(MAX_ALLOWED_TIME_MS);

      deduplicator.clear();
    });
  });

  describe('CircuitBreaker Performance', () => {
    test('should meet <1ms per state check', () => {
      const circuitBreaker = new CircuitBreaker();
      const times: number[] = [];

      for (let i = 0; i < PERFORMANCE_ITERATIONS; i++) {
        const start = performance.now();
        circuitBreaker.getState();
        const end = performance.now();
        times.push(end - start);
      }

      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;

      console.log(`CircuitBreaker State Check Performance:
        Average: ${avgTime.toFixed(3)}ms`);

      expect(avgTime).toBeLessThan(MAX_ALLOWED_TIME_MS);
    });
  });

  describe('ClientFingerprinter Performance', () => {
    test('should meet <1ms per shouldThrottle operation', () => {
      const fingerprinter = new ClientFingerprinter();
      const times: number[] = [];

      for (let i = 0; i < PERFORMANCE_ITERATIONS; i++) {
        const start = performance.now();
        fingerprinter.shouldThrottle(`client-${i % 100}`);
        const end = performance.now();
        times.push(end - start);
      }

      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;

      console.log(`ClientFingerprinter Performance:
        Average: ${avgTime.toFixed(3)}ms`);

      expect(avgTime).toBeLessThan(MAX_ALLOWED_TIME_MS);

      fingerprinter.cleanup();
    });
  });

  describe('GracefulDegradation Performance', () => {
    test('should meet <1ms per shouldDegrade operation', () => {
      const degradation = new GracefulDegradation();
      const times: number[] = [];

      const testMetrics = {
        totalRequests: 100,
        blockedRequests: 10,
        deduplicatedRequests: 5,
        circuitBreakerTrips: 0,
        avgProcessingTime: 50,
        activeClients: 10,
        abuseIncidents: 0,
        degradationActivations: 0,
        performance: {
          rateLimitCheckTime: 0.5,
          deduplicationTime: 0.3,
          fingerprintingTime: 0.2,
          memoryUsage: 1000
        }
      };

      for (let i = 0; i < PERFORMANCE_ITERATIONS; i++) {
        const start = performance.now();
        degradation.shouldDegrade(testMetrics);
        const end = performance.now();
        times.push(end - start);
      }

      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;

      console.log(`GracefulDegradation Performance:
        Average: ${avgTime.toFixed(3)}ms`);

      expect(avgTime).toBeLessThan(MAX_ALLOWED_TIME_MS);
    });
  });

  describe('Integrated System Performance', () => {
    test('should meet <1ms for complete rate limiting pipeline', async () => {
      const rateLimiter = new EnhancedRateLimiter();
      const debouncer = new AdaptiveDebouncer();
      const deduplicator = new RequestDeduplicator();
      const circuitBreaker = new CircuitBreaker();
      const fingerprinter = new ClientFingerprinter();
      const degradation = new GracefulDegradation();

      const times: number[] = [];

      for (let i = 0; i < 100; i++) { // Fewer iterations for integrated test
        const clientId = `client-${i % 10}`;
        const query = `integrated-query-${i}`;

        const start = performance.now();

        // Simulate complete pipeline
        const shouldBypass = debouncer.shouldBypass(query);
        if (!shouldBypass) {
          const shouldDedupe = deduplicator.shouldDeduplicate(query, { clientId });
          if (!shouldDedupe) {
            const rateLimitResult = await rateLimiter.checkLimit(clientId, query);
            if (rateLimitResult.allowed) {
              const throttleDecision = fingerprinter.shouldThrottle(clientId);
              if (!throttleDecision.shouldThrottle) {
                // Request would proceed
              }
            }
          }
        }

        const end = performance.now();
        times.push(end - start);
      }

      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);

      console.log(`Integrated Pipeline Performance:
        Average: ${avgTime.toFixed(3)}ms
        Max: ${maxTime.toFixed(3)}ms`);

      expect(avgTime).toBeLessThan(MAX_ALLOWED_TIME_MS);

      // Cleanup
      rateLimiter.destroy();
      debouncer.clearAll();
      deduplicator.clear();
      fingerprinter.cleanup();
    });
  });

  describe('Memory Usage Performance', () => {
    test('should maintain reasonable memory usage under load', async () => {
      const rateLimiter = new EnhancedRateLimiter();
      
      // Generate load
      for (let i = 0; i < 10000; i++) {
        await rateLimiter.checkLimit(`client-${i % 1000}`, `query-${i}`);
      }

      const metrics = rateLimiter.getMetrics();
      
      console.log(`Memory Usage Metrics:
        Total Clients: ${metrics.totalClients}
        Active Windows: ${metrics.activeWindows}
        Memory Usage: ${metrics.memoryUsage} bytes
        Memory per Client: ${(metrics.memoryUsage / metrics.totalClients).toFixed(2)} bytes`);

      // Memory usage should be reasonable (less than 1MB for 1000 clients)
      expect(metrics.memoryUsage).toBeLessThan(1024 * 1024);
      
      // Memory per client should be reasonable (less than 1KB per client)
      expect(metrics.memoryUsage / metrics.totalClients).toBeLessThan(1024);

      rateLimiter.destroy();
    });
  });
});

describe('Performance Regression Tests', () => {
  test('should not degrade with repeated operations', async () => {
    const rateLimiter = new EnhancedRateLimiter();
    const iterations = [100, 500, 1000];
    const avgTimes: number[] = [];

    for (const iterCount of iterations) {
      const times: number[] = [];
      
      for (let i = 0; i < iterCount; i++) {
        const start = performance.now();
        await rateLimiter.checkLimit(`client-${i % 50}`, `query-${i}`);
        const end = performance.now();
        times.push(end - start);
      }

      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      avgTimes.push(avgTime);
      
      console.log(`${iterCount} iterations - Average: ${avgTime.toFixed(3)}ms`);
    }

    // Performance should not degrade significantly (within 50% variance)
    const firstAvg = avgTimes[0];
    const lastAvg = avgTimes[avgTimes.length - 1];
    const degradation = (lastAvg - firstAvg) / firstAvg;

    expect(degradation).toBeLessThan(0.5); // Less than 50% degradation
    expect(lastAvg).toBeLessThan(MAX_ALLOWED_TIME_MS * 2); // Still under 2ms

    rateLimiter.destroy();
  });
});
