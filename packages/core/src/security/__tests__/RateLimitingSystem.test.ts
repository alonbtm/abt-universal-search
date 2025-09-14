/**
 * Rate Limiting System Tests - Comprehensive test suite for rate limiting and abuse prevention
 * @description Tests all rate limiting components with integration scenarios and edge cases
 */

import { AdaptiveDebouncer, defaultAdaptiveDebounceConfig } from '../AdaptiveDebouncer';
import { RequestDeduplicator, defaultDeduplicationConfig } from '../RequestDeduplicator';
import { CircuitBreaker, defaultCircuitBreakerConfig, CircuitOpenError } from '../CircuitBreaker';
import { ClientFingerprinter, defaultClientFingerprintConfig } from '../ClientFingerprinter';
import { GracefulDegradation, defaultGracefulDegradationConfig } from '../GracefulDegradation';

// Mock timers for testing
jest.useFakeTimers();

describe('AdaptiveDebouncer', () => {
  let debouncer: AdaptiveDebouncer;

  beforeEach(() => {
    debouncer = new AdaptiveDebouncer(defaultAdaptiveDebounceConfig);
  });

  afterEach(() => {
    debouncer.clearAll();
    jest.clearAllTimers();
  });

  describe('Pattern Recognition', () => {
    test('should recognize email patterns with high confidence', () => {
      const analysis = debouncer.getPatternAnalysis('user@example.com');
      expect(analysis.overallConfidence).toBeGreaterThan(0.9);
      expect(analysis.matchedPatterns.some(p => p.name === 'email')).toBe(true);
    });

    test('should recognize URL patterns', () => {
      const analysis = debouncer.getPatternAnalysis('https://example.com');
      expect(analysis.overallConfidence).toBeGreaterThan(0.8);
      expect(analysis.matchedPatterns.some(p => p.name === 'url')).toBe(true);
    });

    test('should have lower confidence for random strings', () => {
      const analysis = debouncer.getPatternAnalysis('asdf123xyz');
      expect(analysis.overallConfidence).toBeLessThan(0.7);
    });
  });

  describe('Adaptive Delay Calculation', () => {
    test('should bypass debounce for high confidence queries', () => {
      expect(debouncer.shouldBypass('user@example.com')).toBe(true);
    });

    test('should not bypass debounce for low confidence queries', () => {
      expect(debouncer.shouldBypass('a')).toBe(false);
    });

    test('should adapt delay based on typing patterns', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const debouncedFn = debouncer.debounce(mockFn, 'test query');

      // Simulate rapid typing
      debouncedFn();
      debouncedFn();
      debouncedFn();

      jest.advanceTimersByTime(500);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('State Management', () => {
    test('should track input frequency', () => {
      debouncer.shouldBypass('test1');
      debouncer.shouldBypass('test2');
      debouncer.shouldBypass('test3');

      const state = debouncer.getState();
      expect(state.inputFrequency).toBeGreaterThan(0);
    });

    test('should maintain input sequence', () => {
      debouncer.shouldBypass('query1');
      debouncer.shouldBypass('query2');

      const state = debouncer.getState();
      expect(state.inputSequence).toContain('query1');
      expect(state.inputSequence).toContain('query2');
    });
  });
});

describe('RequestDeduplicator', () => {
  let deduplicator: RequestDeduplicator;

  beforeEach(() => {
    deduplicator = new RequestDeduplicator(defaultDeduplicationConfig);
  });

  afterEach(() => {
    deduplicator.clear();
  });

  describe('Duplicate Detection', () => {
    test('should detect identical queries', () => {
      const query = 'test query';
      const params = { dataSource: 'api' };

      expect(deduplicator.shouldDeduplicate(query, params)).toBe(false);
      
      // Start a request
      const mockFn = jest.fn().mockResolvedValue('result');
      deduplicator.getOrCreateRequest(query, params, mockFn);

      expect(deduplicator.shouldDeduplicate(query, params)).toBe(true);
    });

    test('should handle different hash algorithms', () => {
      const configs = ['simple', 'djb2', 'fnv1a'] as const;
      
      configs.forEach(algorithm => {
        const testDeduplicator = new RequestDeduplicator({
          ...defaultDeduplicationConfig,
          hashAlgorithm: algorithm
        });

        const mockFn = jest.fn().mockResolvedValue('result');
        expect(() => {
          testDeduplicator.getOrCreateRequest('test', {}, mockFn);
        }).not.toThrow();

        testDeduplicator.clear();
      });
    });
  });

  describe('Request Coalescing', () => {
    test('should share results between identical requests', async () => {
      const query = 'shared query';
      const params = { dataSource: 'api' };
      const mockFn = jest.fn().mockResolvedValue('shared result');

      const promise1 = deduplicator.getOrCreateRequest(query, params, mockFn);
      const promise2 = deduplicator.getOrCreateRequest(query, params, mockFn);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBe('shared result');
      expect(result2).toBe('shared result');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('should handle request failures', async () => {
      const query = 'failing query';
      const params = { dataSource: 'api' };
      const mockFn = jest.fn().mockRejectedValue(new Error('Request failed'));

      const promise1 = deduplicator.getOrCreateRequest(query, params, mockFn);
      const promise2 = deduplicator.getOrCreateRequest(query, params, mockFn);

      await expect(promise1).rejects.toThrow('Request failed');
      await expect(promise2).rejects.toThrow('Request failed');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cache Management', () => {
    test('should respect cache size limits', () => {
      const smallCacheDeduplicator = new RequestDeduplicator({
        ...defaultDeduplicationConfig,
        cacheSize: 2
      });

      const mockFn = jest.fn().mockResolvedValue('result');

      // Fill cache beyond limit
      smallCacheDeduplicator.getOrCreateRequest('query1', {}, mockFn);
      smallCacheDeduplicator.getOrCreateRequest('query2', {}, mockFn);
      smallCacheDeduplicator.getOrCreateRequest('query3', {}, mockFn);

      const metrics = smallCacheDeduplicator.getMetrics();
      expect(metrics.cacheSize).toBeLessThanOrEqual(2);

      smallCacheDeduplicator.clear();
    });

    test('should clean up expired requests', () => {
      const shortTTLDeduplicator = new RequestDeduplicator({
        ...defaultDeduplicationConfig,
        requestTTL: 100
      });

      const mockFn = jest.fn().mockResolvedValue('result');
      shortTTLDeduplicator.getOrCreateRequest('test', {}, mockFn);

      jest.advanceTimersByTime(200);
      shortTTLDeduplicator.cleanup();

      const activeRequests = shortTTLDeduplicator.getActiveRequests();
      expect(activeRequests).toHaveLength(0);

      shortTTLDeduplicator.clear();
    });
  });
});

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      ...defaultCircuitBreakerConfig,
      failureThreshold: 3,
      recoveryTimeoutMs: 1000
    });
  });

  describe('State Transitions', () => {
    test('should open circuit after failure threshold', async () => {
      const failingFn = jest.fn().mockRejectedValue(new Error('Service error'));

      // Trigger failures to open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingFn);
        } catch (error) {
          // Expected failures
        }
      }

      expect(circuitBreaker.getState()).toBe('open');
    });

    test('should transition to half-open after recovery timeout', async () => {
      // Force circuit to open state
      circuitBreaker.forceState('open');
      expect(circuitBreaker.getState()).toBe('open');

      // Advance time past recovery timeout
      jest.advanceTimersByTime(1500);

      // Check state - should be half-open now
      expect(circuitBreaker.getState()).toBe('half-open');
    });

    test('should close circuit after successful requests in half-open', async () => {
      const successFn = jest.fn().mockResolvedValue('success');

      // Force to half-open state
      circuitBreaker.forceState('half-open');

      // Execute successful requests
      await circuitBreaker.execute(successFn);
      await circuitBreaker.execute(successFn);

      expect(circuitBreaker.getState()).toBe('closed');
    });
  });

  describe('Request Execution', () => {
    test('should reject requests when circuit is open', async () => {
      circuitBreaker.forceState('open');

      const mockFn = jest.fn().mockResolvedValue('result');

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow(CircuitOpenError);
      expect(mockFn).not.toHaveBeenCalled();
    });

    test('should handle request timeouts', async () => {
      const slowFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 35000))
      );

      await expect(circuitBreaker.execute(slowFn)).rejects.toThrow('Request timeout');
    });
  });

  describe('Metrics and Monitoring', () => {
    test('should track failure and success counts', async () => {
      const successFn = jest.fn().mockResolvedValue('success');
      const failFn = jest.fn().mockRejectedValue(new Error('fail'));

      await circuitBreaker.execute(successFn);
      try {
        await circuitBreaker.execute(failFn);
      } catch (error) {
        // Expected failure
      }

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.successCount).toBe(1);
      expect(metrics.failureCount).toBe(1);
      expect(metrics.totalRequests).toBe(2);
    });

    test('should maintain state history', () => {
      circuitBreaker.forceState('open');
      circuitBreaker.forceState('half-open');
      circuitBreaker.forceState('closed');

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.stateHistory.length).toBeGreaterThan(0);
    });
  });
});

describe('ClientFingerprinter', () => {
  let fingerprinter: ClientFingerprinter;

  beforeEach(() => {
    fingerprinter = new ClientFingerprinter(defaultClientFingerprintConfig);
  });

  afterEach(() => {
    fingerprinter.cleanup();
  });

  describe('Fingerprint Generation', () => {
    test('should generate unique client fingerprints', async () => {
      const fingerprint1 = await fingerprinter.generateFingerprint();
      const fingerprint2 = await fingerprinter.generateFingerprint();

      expect(fingerprint1.clientId).not.toBe(fingerprint2.clientId);
      expect(fingerprint1.createdAt).toBeLessThanOrEqual(fingerprint2.createdAt);
    });

    test('should respect privacy modes', async () => {
      const strictFingerprinter = new ClientFingerprinter({
        ...defaultClientFingerprintConfig,
        privacyMode: 'strict'
      });

      const fingerprint = await strictFingerprinter.generateFingerprint();
      
      // In strict mode, user agent should be simplified
      expect(['Chrome', 'Firefox', 'Safari', 'Edge', 'Unknown'])
        .toContain(fingerprint.browserFingerprint.userAgent);

      strictFingerprinter.cleanup();
    });
  });

  describe('Behavior Tracking', () => {
    test('should update behavior patterns', async () => {
      const fingerprint = await fingerprinter.generateFingerprint();
      const clientId = fingerprint.clientId;

      fingerprinter.updateBehavior(clientId, {
        avgQueryLength: 10,
        queryFrequency: 5,
        errorRate: 0.1
      });

      const updated = fingerprinter.getFingerprint(clientId);
      expect(updated?.behaviorFingerprint.avgQueryLength).toBe(10);
      expect(updated?.behaviorFingerprint.queryFrequency).toBe(5);
      expect(updated?.behaviorFingerprint.errorRate).toBe(0.1);
    });

    test('should calculate suspicious scores', async () => {
      const fingerprint = await fingerprinter.generateFingerprint();
      const clientId = fingerprint.clientId;

      // Update with suspicious behavior
      fingerprinter.updateBehavior(clientId, {
        queryFrequency: 15, // High frequency
        errorRate: 0.8,     // High error rate
        commonPatterns: ['pattern1'] // Low variation
      });

      const updated = fingerprinter.getFingerprint(clientId);
      expect(updated?.suspiciousScore).toBeGreaterThan(0.5);
    });
  });

  describe('Throttling Decisions', () => {
    test('should recommend throttling for suspicious clients', async () => {
      const fingerprint = await fingerprinter.generateFingerprint();
      const clientId = fingerprint.clientId;

      // Create highly suspicious behavior
      fingerprinter.updateBehavior(clientId, {
        queryFrequency: 20,
        errorRate: 0.9,
        commonPatterns: []
      });

      const throttleDecision = fingerprinter.shouldThrottle(clientId);
      expect(throttleDecision.shouldThrottle).toBe(true);
      expect(throttleDecision.throttleLevel).not.toBe('none');
    });

    test('should not throttle normal clients', async () => {
      const fingerprint = await fingerprinter.generateFingerprint();
      const clientId = fingerprint.clientId;

      // Normal behavior
      fingerprinter.updateBehavior(clientId, {
        queryFrequency: 2,
        errorRate: 0.1,
        commonPatterns: ['search', 'filter', 'sort']
      });

      const throttleDecision = fingerprinter.shouldThrottle(clientId);
      expect(throttleDecision.shouldThrottle).toBe(false);
      expect(throttleDecision.throttleLevel).toBe('none');
    });
  });
});

describe('GracefulDegradation', () => {
  let degradation: GracefulDegradation;

  beforeEach(() => {
    degradation = new GracefulDegradation(defaultGracefulDegradationConfig);
  });

  describe('Degradation Activation', () => {
    test('should activate degradation based on metrics', () => {
      const highBlockRateMetrics = {
        totalRequests: 100,
        blockedRequests: 40, // 40% block rate
        deduplicatedRequests: 0,
        circuitBreakerTrips: 0,
        avgProcessingTime: 100,
        activeClients: 10,
        abuseIncidents: 0,
        degradationActivations: 0,
        performance: {
          rateLimitCheckTime: 1,
          deduplicationTime: 1,
          fingerprintingTime: 1,
          memoryUsage: 1000
        }
      };

      expect(degradation.shouldDegrade(highBlockRateMetrics)).toBe(true);
    });

    test('should not degrade with normal metrics', () => {
      const normalMetrics = {
        totalRequests: 100,
        blockedRequests: 5, // 5% block rate
        deduplicatedRequests: 10,
        circuitBreakerTrips: 0,
        avgProcessingTime: 50,
        activeClients: 5,
        abuseIncidents: 0,
        degradationActivations: 0,
        performance: {
          rateLimitCheckTime: 1,
          deduplicationTime: 1,
          fingerprintingTime: 1,
          memoryUsage: 500
        }
      };

      expect(degradation.shouldDegrade(normalMetrics)).toBe(false);
    });
  });

  describe('Feature Management', () => {
    test('should disable features based on degradation level', () => {
      degradation.activateDegradation('rate_limit', 'moderate');

      expect(degradation.isFeatureAvailable('basic_search')).toBe(true);
      expect(degradation.isFeatureAvailable('auto_complete')).toBe(false);
      expect(degradation.isFeatureAvailable('real_time_search')).toBe(false);
    });

    test('should maintain essential features even in severe degradation', () => {
      degradation.activateDegradation('abuse_detected', 'severe');

      expect(degradation.isFeatureAvailable('basic_search')).toBe(true);
      expect(degradation.isFeatureAvailable('error_display')).toBe(true);
      expect(degradation.isFeatureAvailable('user_input')).toBe(true);
    });
  });

  describe('Fallback Cache', () => {
    test('should store and retrieve fallback results', () => {
      degradation.activateDegradation('rate_limit', 'light');
      
      const query = 'test query';
      const result = { data: 'cached result' };

      degradation.storeFallbackResult(query, result);
      const retrieved = degradation.getFallbackResult(query);

      expect(retrieved).toEqual(result);
    });

    test('should not provide fallback when not degraded', () => {
      const query = 'test query';
      const result = { data: 'cached result' };

      degradation.storeFallbackResult(query, result);
      const retrieved = degradation.getFallbackResult(query);

      expect(retrieved).toBeNull();
    });
  });

  describe('User Notifications', () => {
    test('should provide appropriate notification messages', () => {
      degradation.activateDegradation('rate_limit', 'moderate');

      const message = degradation.getNotificationMessage();
      expect(message).toContain('reduced mode');
      expect(message).toContain('high usage');
    });

    test('should estimate recovery time', () => {
      degradation.activateDegradation('circuit_open', 'severe');

      const state = degradation.getState();
      expect(state.estimatedRecoveryTime).toBeGreaterThan(Date.now());
    });
  });
});

describe('Integration Tests', () => {
  let debouncer: AdaptiveDebouncer;
  let deduplicator: RequestDeduplicator;
  let circuitBreaker: CircuitBreaker;
  let fingerprinter: ClientFingerprinter;
  let degradation: GracefulDegradation;

  beforeEach(() => {
    debouncer = new AdaptiveDebouncer(defaultAdaptiveDebounceConfig);
    deduplicator = new RequestDeduplicator(defaultDeduplicationConfig);
    circuitBreaker = new CircuitBreaker(defaultCircuitBreakerConfig);
    fingerprinter = new ClientFingerprinter(defaultClientFingerprintConfig);
    degradation = new GracefulDegradation(defaultGracefulDegradationConfig);
  });

  afterEach(() => {
    debouncer.clearAll();
    deduplicator.clear();
    circuitBreaker.reset();
    fingerprinter.cleanup();
    degradation.forceRecovery();
    jest.clearAllTimers();
  });

  test('should handle complete rate limiting pipeline', async () => {
    const mockApiCall = jest.fn().mockResolvedValue('api result');
    
    // Generate client fingerprint
    const fingerprint = await fingerprinter.generateFingerprint();
    const clientId = fingerprint.clientId;

    // Create debounced and deduplicated request
    const debouncedFn = debouncer.debounce(
      () => deduplicator.getOrCreateRequest(
        'test query',
        { clientId },
        () => circuitBreaker.execute(mockApiCall)
      ),
      'test query'
    );

    // Execute request
    const resultPromise = debouncedFn();
    
    // Fast-forward debounce timer
    jest.advanceTimersByTime(500);
    
    const result = await resultPromise;
    expect(result).toBe('api result');
    expect(mockApiCall).toHaveBeenCalledTimes(1);
  });

  test('should handle cascading failures gracefully', async () => {
    const failingApiCall = jest.fn().mockRejectedValue(new Error('API failure'));

    // Trigger circuit breaker
    for (let i = 0; i < 5; i++) {
      try {
        await circuitBreaker.execute(failingApiCall);
      } catch (error) {
        // Expected failures
      }
    }

    expect(circuitBreaker.getState()).toBe('open');

    // Check if degradation should activate
    const metrics = {
      totalRequests: 10,
      blockedRequests: 0,
      deduplicatedRequests: 0,
      circuitBreakerTrips: 1,
      avgProcessingTime: 100,
      activeClients: 1,
      abuseIncidents: 0,
      degradationActivations: 0,
      performance: {
        rateLimitCheckTime: 1,
        deduplicationTime: 1,
        fingerprintingTime: 1,
        memoryUsage: 1000
      }
    };

    if (degradation.shouldDegrade(metrics)) {
      degradation.activateDegradation('circuit_open', 'moderate');
      expect(degradation.getState().isDegraded).toBe(true);
    }
  });

  test('should coordinate between all components during abuse scenario', async () => {
    // Generate suspicious client
    const fingerprint = await fingerprinter.generateFingerprint();
    const clientId = fingerprint.clientId;

    // Simulate abusive behavior
    fingerprinter.updateBehavior(clientId, {
      queryFrequency: 25,
      errorRate: 0.7,
      commonPatterns: ['spam']
    });

    const throttleDecision = fingerprinter.shouldThrottle(clientId);
    expect(throttleDecision.shouldThrottle).toBe(true);

    // Activate degradation due to abuse
    degradation.activateDegradation('abuse_detected', 'heavy');

    // Verify system state
    expect(degradation.getState().isDegraded).toBe(true);
    expect(degradation.isFeatureAvailable('auto_complete')).toBe(false);
    expect(degradation.getNotificationMessage()).toContain('protection measures');
  });
});

describe('Performance Tests', () => {
  test('should meet performance requirements for rate limit checks', () => {
    const fingerprinter = new ClientFingerprinter(defaultClientFingerprintConfig);
    
    const startTime = performance.now();
    
    // Perform 1000 operations
    for (let i = 0; i < 1000; i++) {
      fingerprinter.shouldThrottle(`client-${i}`);
    }
    
    const endTime = performance.now();
    const avgTime = (endTime - startTime) / 1000;
    
    // Should be less than 1ms per operation
    expect(avgTime).toBeLessThan(1);
    
    fingerprinter.cleanup();
  });

  test('should handle high concurrency efficiently', async () => {
    const deduplicator = new RequestDeduplicator(defaultDeduplicationConfig);
    const mockFn = jest.fn().mockResolvedValue('result');

    const startTime = performance.now();

    // Create 100 concurrent identical requests
    const promises = Array.from({ length: 100 }, () =>
      deduplicator.getOrCreateRequest('concurrent test', {}, mockFn)
    );

    await Promise.all(promises);

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Should complete in reasonable time
    expect(totalTime).toBeLessThan(100); // 100ms
    
    // Should only call the function once due to deduplication
    expect(mockFn).toHaveBeenCalledTimes(1);

    deduplicator.clear();
  });
});
