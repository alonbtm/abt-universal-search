import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals';
import { ErrorClassifier } from '../error/ErrorClassifier';
import { RetryManager } from '../error/RetryManager';
import { FallbackManager } from '../error/FallbackManager';
import { ErrorMessageGenerator } from '../error/ErrorMessageGenerator';
import { ErrorLogger } from '../error/ErrorLogger';
import { RecoveryOrchestrator } from '../error/RecoveryOrchestrator';
import {
  SearchError,
  ErrorContext,
  ErrorType,
  ErrorSeverity,
  ErrorRecoverability,
  RetryConfig,
  FallbackConfig,
  ErrorReportingConfig,
} from '../types/ErrorHandling';
import { RecoveryWorkflow } from '../types/ErrorHandling';

// Mock global APIs
global.fetch = jest.fn();
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
} as any;

// Helper functions
function createTestError(
  type: ErrorType = 'network',
  severity: ErrorSeverity = 'medium',
  recoverability: ErrorRecoverability = 'transient',
  message = 'Test error'
): SearchError {
  return {
    name: 'TestError',
    message,
    type,
    code: 'TEST_ERROR',
    severity,
    recoverability,
    timestamp: Date.now(),
    correlationId: `test-${Date.now()}`,
  };
}

function createTestContext(adapter = 'test-adapter'): ErrorContext {
  return {
    adapter,
    query: 'test query',
    user: { id: 'test-user', session: 'test-session' },
    system: { environment: 'test', version: '1.0.0' },
    operation: { name: 'test-operation', duration: 100 },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('ErrorClassifier', () => {
  let errorClassifier: ErrorClassifier;

  beforeEach(() => {
    errorClassifier = new ErrorClassifier();
  });

  describe('Error Classification', () => {
    test('should classify network timeout errors correctly', () => {
      const error = new Error('Request timeout occurred');
      error.name = 'TimeoutError';

      const classification = errorClassifier.classify(error);

      expect(classification.type).toBe('timeout');
      expect(classification.severity).toBe('medium');
      expect(classification.recoverability).toBe('transient');
      expect(classification.confidence).toBeGreaterThan(0.8);
    });

    test('should classify authentication errors correctly', () => {
      const error = new Error('Unauthorized access');
      (error as any).statusCode = 401;

      const classification = errorClassifier.classify(error);

      expect(classification.type).toBe('authentication');
      expect(classification.severity).toBe('high');
      expect(classification.recoverability).toBe('recoverable');
    });

    test('should classify validation errors correctly', () => {
      const error = new Error('Invalid input provided');
      (error as any).statusCode = 400;

      const classification = errorClassifier.classify(error);

      expect(classification.type).toBe('validation');
      expect(classification.severity).toBe('medium');
      expect(classification.recoverability).toBe('recoverable');
    });

    test('should handle unknown errors with fallback classification', () => {
      const error = new Error('Unknown error occurred');

      const classification = errorClassifier.classify(error);

      expect(classification.type).toBe('unknown');
      expect(classification.confidence).toBeLessThan(0.5);
    });

    test('should use context to enhance classification', () => {
      const error = new Error('Configuration missing');
      const context = createTestContext('database-adapter');

      const classification = errorClassifier.classify(error, context);

      expect(classification.type).toBe('configuration');
      expect(classification.severity).toBe('high');
    });
  });

  describe('Custom Rules', () => {
    test('should register and use custom classification rules', () => {
      const customRule = {
        id: 'custom-api-error',
        name: 'Custom API Error',
        priority: 10,
        weight: 1.0,
        matcher: {
          messagePattern: /api.*failed/i,
        },
        classification: {
          type: 'system' as ErrorType,
          severity: 'high' as ErrorSeverity,
          recoverability: 'transient' as ErrorRecoverability,
          category: 'api',
          confidence: 0.9,
        },
        enabled: true,
      };

      errorClassifier.registerRule(customRule);

      const error = new Error('API call failed');
      const classification = errorClassifier.classify(error);

      expect(classification.type).toBe('system');
      expect(classification.severity).toBe('high');
      expect(classification.category).toBe('api');
    });

    test('should prioritize rules correctly', () => {
      const highPriorityRule = {
        id: 'high-priority',
        name: 'High Priority Rule',
        priority: 20,
        weight: 1.0,
        matcher: { messagePattern: /priority/i },
        classification: {
          type: 'system' as ErrorType,
          severity: 'critical' as ErrorSeverity,
          recoverability: 'permanent' as ErrorRecoverability,
          category: 'high-priority',
          confidence: 0.95,
        },
        enabled: true,
      };

      const lowPriorityRule = {
        id: 'low-priority',
        name: 'Low Priority Rule',
        priority: 5,
        weight: 1.0,
        matcher: { messagePattern: /priority/i },
        classification: {
          type: 'validation' as ErrorType,
          severity: 'low' as ErrorSeverity,
          recoverability: 'recoverable' as ErrorRecoverability,
          category: 'low-priority',
          confidence: 0.7,
        },
        enabled: true,
      };

      errorClassifier.registerRule(highPriorityRule);
      errorClassifier.registerRule(lowPriorityRule);

      const error = new Error('Priority test error');
      const classification = errorClassifier.classify(error);

      expect(classification.category).toBe('high-priority');
      expect(classification.severity).toBe('critical');
    });
  });

  describe('Metrics and Analysis', () => {
    test('should track classification metrics', () => {
      const errors = [
        new Error('Network error'),
        new Error('Authentication failed'),
        new Error('Invalid input'),
        new Error('Network timeout'),
      ];

      errors.forEach(error => errorClassifier.classify(error));

      const metrics = errorClassifier.getMetrics();

      expect(metrics.totalClassifications).toBe(4);
      expect(metrics.classificationsByType.network).toBeGreaterThan(0);
      expect(metrics.averageConfidence).toBeGreaterThan(0);
    });

    test('should provide error analysis with suggestions', () => {
      const error = new Error('Network connection failed');
      const context = createTestContext();

      const analysis = errorClassifier.analyzeError(error, context);

      expect(analysis.classification).toBeDefined();
      expect(analysis.matchingRules).toBeInstanceOf(Array);
      expect(analysis.suggestions).toBeInstanceOf(Array);
      expect(analysis.suggestions.length).toBeGreaterThan(0);
    });
  });
});

describe('RetryManager', () => {
  let retryManager: RetryManager;
  let mockOperation: jest.Mock;

  beforeEach(() => {
    retryManager = new RetryManager();
    mockOperation = jest.fn();
  });

  afterEach(() => {
    retryManager.reset();
  });

  describe('Basic Retry Logic', () => {
    test('should succeed on first attempt', async () => {
      mockOperation.mockResolvedValue('success');

      const result = await retryManager.retry(mockOperation);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    test('should retry transient errors', async () => {
      const error = createTestError('network', 'medium', 'transient');
      mockOperation
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const result = await retryManager.retry(mockOperation, { maxAttempts: 3 });

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    test('should not retry permanent errors', async () => {
      const error = createTestError('validation', 'medium', 'permanent');
      mockOperation.mockRejectedValue(error);

      await expect(retryManager.retry(mockOperation)).rejects.toThrow();
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    test('should respect max attempts limit', async () => {
      const error = createTestError('network', 'medium', 'transient');
      mockOperation.mockRejectedValue(error);

      await expect(retryManager.retry(mockOperation, { maxAttempts: 3 })).rejects.toThrow();

      expect(mockOperation).toHaveBeenCalledTimes(3);
    });
  });

  describe('Backoff Strategies', () => {
    test('should calculate exponential backoff delays correctly', () => {
      const config: RetryConfig = {
        maxAttempts: 5,
        initialDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        jitterType: 'none',
        jitterAmount: 0,
      };

      const delay1 = retryManager.calculateDelay(1, config);
      const delay2 = retryManager.calculateDelay(2, config);
      const delay3 = retryManager.calculateDelay(3, config);

      expect(delay1).toBe(1000);
      expect(delay2).toBe(2000);
      expect(delay3).toBe(4000);
    });

    test('should apply jitter to delays', () => {
      const config: RetryConfig = {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitterType: 'full',
        jitterAmount: 0.1,
      };

      const delays = Array.from({ length: 10 }, () => retryManager.calculateDelay(2, config));

      // With full jitter, delays should vary
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);

      // All delays should be less than or equal to the base delay
      delays.forEach(delay => {
        expect(delay).toBeLessThanOrEqual(2000);
        expect(delay).toBeGreaterThan(0);
      });
    });

    test('should respect maximum delay limit', () => {
      const config: RetryConfig = {
        maxAttempts: 10,
        initialDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2,
        jitterType: 'none',
        jitterAmount: 0,
      };

      const delay = retryManager.calculateDelay(10, config); // Would be 1024000 without limit
      expect(delay).toBe(5000);
    });
  });

  describe('Retry Conditions', () => {
    test('should use custom retry condition', async () => {
      const customCondition = jest.fn().mockReturnValue(false);
      const error = createTestError('network', 'medium', 'transient');
      mockOperation.mockRejectedValue(error);

      await expect(
        retryManager.retry(mockOperation, {
          maxAttempts: 3,
          retryCondition: customCondition,
        })
      ).rejects.toThrow();

      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(customCondition).toHaveBeenCalledWith(error, 1);
    });

    test('should handle timeout during retry', async () => {
      mockOperation.mockImplementation(() => sleep(2000));

      await expect(
        retryManager.retry(mockOperation, {
          maxAttempts: 2,
          timeout: 1000,
        })
      ).rejects.toThrow('timeout');
    }, 10000);
  });

  describe('Metrics and State', () => {
    test('should track retry metrics', async () => {
      const error = createTestError('network', 'medium', 'transient');
      mockOperation.mockRejectedValueOnce(error).mockResolvedValue('success');

      await retryManager.retry(mockOperation, { maxAttempts: 3 });

      const metrics = retryManager.getMetrics();
      expect(metrics.totalRetries).toBe(1);
      expect(metrics.successfulRetries).toBe(1);
      expect(metrics.retrySuccessRate).toBe(1);
    });

    test('should provide retry state during execution', async () => {
      const error = createTestError('network', 'medium', 'transient');
      let capturedState: any = null;

      mockOperation.mockImplementation(() => {
        capturedState = retryManager.getRetryState();
        throw error;
      });

      try {
        await retryManager.retry(mockOperation, { maxAttempts: 2 });
      } catch (e) {
        // Expected to fail
      }

      expect(capturedState).not.toBeNull();
      expect(capturedState.attempt).toBe(0); // First attempt
      expect(capturedState.isRetrying).toBe(false);
    });
  });

  describe('Predefined Strategies', () => {
    test('should provide network retry configuration', () => {
      const config = RetryManager.networkRetry();

      expect(config.maxAttempts).toBe(5);
      expect(config.jitterType).toBe('decorrelated');
      expect(config.retryCondition).toBeDefined();
    });

    test('should provide rate limit retry configuration', () => {
      const config = RetryManager.rateLimitRetry();

      expect(config.maxAttempts).toBe(4);
      expect(config.initialDelay).toBe(5000);
      expect(config.retryCondition).toBeDefined();
    });
  });
});

describe('FallbackManager', () => {
  let fallbackManager: FallbackManager;

  beforeEach(() => {
    fallbackManager = new FallbackManager();
  });

  describe('Fallback Strategies', () => {
    test('should execute cached results fallback', async () => {
      const query = 'test query';
      const context = createTestContext();
      const error = createTestError('network');

      // Cache some results first
      fallbackManager.cacheResults(query, context, [
        { id: 1, label: 'Test Result 1' },
        { id: 2, label: 'Test Result 2' },
      ]);

      const result = await fallbackManager.executeStrategy(error, query, context);

      expect(result.success).toBe(true);
      expect(result.source).toBe('cache');
      expect(result.isCached).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    test('should execute simplified mode fallback', async () => {
      const query = 'test';
      const context = createTestContext();
      const error = createTestError('system');

      // Cache some data for simplified search
      fallbackManager.cacheResults('other query', context, [
        { id: 1, label: 'Test Item', description: 'Contains test keyword' },
      ]);

      const result = await fallbackManager.executeStrategy(error, query, context);

      expect(result.success).toBe(true);
      expect(result.source).toBe('simplified-mode');
      expect(result.isPartial).toBe(true);
    });

    test('should execute offline mode fallback', async () => {
      const query = 'offline test';
      const context = createTestContext();
      const error = createTestError('network');

      fallbackManager.enableOfflineMode();

      // Cache some offline data
      fallbackManager.cacheResults('offline', context, [{ id: 1, label: 'Offline Item' }]);

      const result = await fallbackManager.executeStrategy(error, query, context);

      expect(result.success).toBe(true);
      expect(result.source).toBe('offline-mode');
      expect(result.suggestions).toContain('You are currently offline');
    });

    test('should fallback to empty results when no other options available', async () => {
      const query = 'no results';
      const context = createTestContext();
      const error = createTestError('system');

      const result = await fallbackManager.executeStrategy(error, query, context);

      expect(result.success).toBe(false);
      expect(result.source).toBe('empty-results');
      expect(result.data).toHaveLength(0);
      expect(result.suggestions?.length || 0).toBeGreaterThan(0);
    });
  });

  describe('Custom Strategies', () => {
    test('should register and use custom fallback strategy', async () => {
      const customStrategy = {
        name: 'custom-fallback',
        priority: 1,
        enabled: true,
        executor: {
          execute: async () => ({
            success: true,
            data: [{ id: 1, label: 'Custom Result' }],
            source: 'custom',
            isPartial: false,
            isCached: false,
            reliability: 1.0,
            fallbackReason: 'Custom strategy executed',
          }),
          canExecute: () => true,
          description: 'Custom test strategy',
        },
      };

      fallbackManager.registerStrategy(customStrategy);

      const result = await fallbackManager.executeStrategy(
        createTestError(),
        'test',
        createTestContext()
      );

      expect(result.source).toBe('custom');
      expect(result.data[0].label).toBe('Custom Result');
    });

    test('should handle strategy timeouts', async () => {
      const slowStrategy = {
        name: 'slow-strategy',
        priority: 1,
        enabled: true,
        timeout: 100,
        executor: {
          execute: async () => {
            await sleep(200);
            return {
              success: true,
              data: [],
              source: 'slow',
              isPartial: false,
              isCached: false,
              reliability: 1.0,
              fallbackReason: 'Slow strategy',
            };
          },
          canExecute: () => true,
          description: 'Slow test strategy',
        },
      };

      fallbackManager.registerStrategy(slowStrategy);

      // Should fallback to next available strategy due to timeout
      const result = await fallbackManager.executeStrategy(
        createTestError(),
        'test',
        createTestContext()
      );

      expect(result.source).not.toBe('slow');
    });
  });

  describe('Cache Management', () => {
    test('should manage cache expiration', async () => {
      const query = 'expire test';
      const context = createTestContext();

      // Cache with very short TTL
      fallbackManager = new FallbackManager({ cacheMaxAge: 50 });
      fallbackManager.cacheResults(query, context, [{ id: 1, label: 'Test' }]);

      // Wait for cache to expire
      await sleep(60);

      const error = createTestError('network');
      const result = await fallbackManager.executeStrategy(error, query, context);

      // Should not use expired cache, should fallback to simplified mode
      expect(result.source).not.toBe('cache');
    });

    test('should provide cache statistics', () => {
      fallbackManager.cacheResults('test1', createTestContext(), [{ id: 1 }]);
      fallbackManager.cacheResults('test2', createTestContext(), [{ id: 2 }, { id: 3 }]);

      const stats = fallbackManager.getCacheStats();

      expect(stats.entries).toBe(2);
      expect(stats.totalSize).toBe(3);
    });
  });

  describe('Offline Mode', () => {
    test('should track offline mode state', () => {
      expect(fallbackManager.isOfflineMode()).toBe(false);

      fallbackManager.enableOfflineMode();
      expect(fallbackManager.isOfflineMode()).toBe(true);

      fallbackManager.disableOfflineMode();
      expect(fallbackManager.isOfflineMode()).toBe(false);
    });

    test('should track metrics', async () => {
      const error = createTestError('network');

      try {
        await fallbackManager.executeStrategy(error, 'test', createTestContext());
      } catch (e) {
        // May fail, but should track metrics
      }

      const metrics = fallbackManager.getMetrics();
      expect(metrics.totalFallbacks).toBeGreaterThan(0);
    });
  });
});

describe('ErrorMessageGenerator', () => {
  let messageGenerator: ErrorMessageGenerator;

  beforeEach(() => {
    messageGenerator = new ErrorMessageGenerator();
  });

  describe('Message Generation', () => {
    test('should generate appropriate message for network errors', () => {
      const error = createTestError('network', 'high');

      const message = messageGenerator.generateMessage(error);

      expect(message.title).toBe('Connection Problem');
      expect(message.severity).toBe('high');
      expect(message.category).toBe('error');
      expect(message.message).toContain('connect');
    });

    test('should generate appropriate message for authentication errors', () => {
      const error = createTestError('authentication', 'high');

      const message = messageGenerator.generateMessage(error);

      expect(message.title).toBe('Authentication Required');
      expect(message.actions).toBeDefined();
      expect(message.actions?.some(action => action.action === 'signin')).toBe(true);
    });

    test('should generate appropriate message for validation errors', () => {
      const error = createTestError('validation', 'medium');

      const message = messageGenerator.generateMessage(error);

      expect(message.title).toBe('Invalid Input');
      expect(message.category).toBe('warning');
    });
  });

  describe('Localization', () => {
    test('should support multiple locales', () => {
      expect(messageGenerator.getAvailableLocales()).toContain('en');
      expect(messageGenerator.getAvailableLocales()).toContain('es');
      expect(messageGenerator.getAvailableLocales()).toContain('fr');
    });

    test('should change locale and generate localized messages', () => {
      messageGenerator.setLocale('es');
      expect(messageGenerator.getLocale()).toBe('es');

      const error = createTestError('network');
      const message = messageGenerator.generateMessage(error);

      // Should use Spanish text
      expect(message.message).toContain('conexión');
    });

    test('should fallback to default locale for missing translations', () => {
      messageGenerator.setLocale('unsupported');

      const error = createTestError('network');
      const message = messageGenerator.generateMessage(error);

      // Should still generate a message using default locale
      expect(message.message).toBeDefined();
      expect(message.message.length).toBeGreaterThan(0);
    });
  });

  describe('Custom Templates', () => {
    test('should register and use custom templates', () => {
      const customTemplate = {
        id: 'custom-network',
        errorType: 'network' as ErrorType,
        severity: 'high' as ErrorSeverity,
        template: 'Custom network error message',
        placeholders: [],
        localization: {
          en: 'Custom network error message',
        },
      };

      messageGenerator.registerTemplate(customTemplate);

      const error = createTestError('network', 'high');
      const message = messageGenerator.generateMessage(error);

      expect(message.message).toBe('Custom network error message');
    });

    test('should validate templates before registration', () => {
      const invalidTemplate = {
        id: '',
        errorType: 'network' as ErrorType,
        severity: 'high' as ErrorSeverity,
        template: '',
        placeholders: [],
        localization: {},
      };

      const errors = messageGenerator.validateTemplate(invalidTemplate);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('Template ID is required');
      expect(errors).toContain('Template text is required');
    });
  });

  describe('Progressive Details', () => {
    test('should include progressive details when enabled', () => {
      const error = createTestError();
      error.correlationId = 'test-correlation-id';

      const context = createTestContext();
      context.operation = { name: 'test-op', duration: 150 };

      const message = messageGenerator.generateMessage(error, context);

      expect(message.details).toContain('test-correlation-id');
      expect(message.details).toContain('150ms');
    });
  });

  describe('Actions and Interactivity', () => {
    test('should generate appropriate actions for different error types', () => {
      const networkError = createTestError('network', 'medium', 'transient');
      const message = messageGenerator.generateMessage(networkError);

      expect(message.actions).toBeDefined();
      expect(message.actions?.some(action => action.action === 'retry')).toBe(true);
      expect(message.actions?.some(action => action.action === 'offline')).toBe(true);
    });

    test('should handle auto-hide settings correctly', () => {
      const infoError = createTestError('system', 'info');
      const message = messageGenerator.generateMessage(infoError);

      expect(message.autoHide).toBe(true);
      expect(message.autoHideDelay).toBe(3000);
    });

    test('should make critical errors non-dismissible', () => {
      const criticalError = createTestError('security', 'critical');
      const message = messageGenerator.generateMessage(criticalError);

      expect(message.dismissible).toBe(false);
    });
  });
});

describe('ErrorLogger', () => {
  let errorLogger: ErrorLogger;
  let consoleErrorSpy: jest.SpyInstance<void, [message?: any, ...optionalParams: any[]]>;
  let consoleWarnSpy: jest.SpyInstance<void, [message?: any, ...optionalParams: any[]]>;

  beforeEach(() => {
    errorLogger = new ErrorLogger();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    errorLogger.dispose();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('Basic Logging', () => {
    test('should log errors to console by default', async () => {
      const error = createTestError();

      errorLogger.logError(error);
      await errorLogger.flush();

      expect(consoleErrorSpy).toHaveBeenCalled();

      const stats = errorLogger.getStats();
      expect(stats.totalErrors).toBe(1);
      expect(stats.errorsByType.network).toBe(1);
    });

    test('should respect logging levels', () => {
      const config: Partial<ErrorReportingConfig> = {
        reportingLevel: 'error',
      };
      errorLogger.setConfig(config);

      errorLogger.logWarning('Test warning');
      errorLogger.logInfo('Test info');
      errorLogger.logError(createTestError());

      const stats = errorLogger.getStats();
      expect(stats.totalErrors).toBe(1); // Only error should be logged
    });
  });

  describe('Data Sanitization', () => {
    test('should sanitize sensitive information from error messages', () => {
      const sensitiveMessage = 'Error with password="secret123" and token="abc123"';

      const sanitized = errorLogger.testSanitization(sensitiveMessage);

      expect(sanitized).not.toContain('secret123');
      expect(sanitized).not.toContain('abc123');
      expect(sanitized).toContain('[REMOVED]');
    });

    test('should sanitize PII when user data is disabled', () => {
      const config: Partial<ErrorReportingConfig> = {
        sanitization: {
          enableStackTrace: true,
          enableContext: true,
          enableUserData: false,
          removePatterns: [],
          replacePatterns: [],
        },
      };
      errorLogger.setConfig(config);

      const piiMessage = 'User email: user@example.com, IP: 192.168.1.1';
      const sanitized = errorLogger.testSanitization(piiMessage);

      expect(sanitized).toContain('[PII]');
    });

    test('should preserve context while sanitizing sensitive data', () => {
      const error = createTestError();
      const context = createTestContext();
      context.request = {
        method: 'POST',
        url: 'https://api.example.com/users?token=secret',
        headers: { authorization: 'Bearer token123' },
      };

      errorLogger.logError(error, context);

      const stats = errorLogger.getStats();
      const recentError = stats.recentErrors[0];

      expect(recentError?.context.request?.method).toBe('POST');
      expect(recentError?.context.request?.path).toBe('/users');
      expect(recentError?.context.request?.path).not.toContain('token');
    });
  });

  describe('Error Aggregation', () => {
    test('should aggregate duplicate errors', () => {
      const config: Partial<ErrorReportingConfig> = {
        aggregation: {
          enableAggregation: true,
          aggregationWindow: 60000,
          maxDuplicates: 3,
        },
      };
      errorLogger.setConfig(config);

      const error = createTestError('network', 'medium', 'transient', 'Same error message');

      // Log the same error multiple times
      for (let i = 0; i < 10; i++) {
        errorLogger.logError(error);
      }

      const stats = errorLogger.getStats();
      // Should aggregate after maxDuplicates
      expect(stats.totalErrors).toBeLessThan(10);
    });
  });

  describe('Remote Logging', () => {
    test('should send logs to remote endpoint', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
      });

      const config: Partial<ErrorReportingConfig> = {
        destination: {
          console: false,
          storage: false,
          remote: {
            endpoint: 'https://api.example.com/errors',
            batchSize: 5,
            flushInterval: 1000,
          },
        },
      };
      errorLogger.setConfig(config);

      const error = createTestError();
      errorLogger.logError(error);
      await errorLogger.flush();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/errors',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    test('should handle remote logging failures gracefully', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockRejectedValue(new Error('Network error'));

      const config: Partial<ErrorReportingConfig> = {
        destination: {
          console: false,
          storage: false,
          remote: {
            endpoint: 'https://api.example.com/errors',
            batchSize: 1,
            flushInterval: 1000,
          },
        },
      };
      errorLogger.setConfig(config);

      const error = createTestError();
      errorLogger.logError(error);

      await expect(errorLogger.flush()).rejects.toThrow();
    });
  });

  describe('Storage Logging', () => {
    test('should store logs in localStorage when enabled', async () => {
      const mockLocalStorage = global.localStorage;
      const getItemSpy = mockLocalStorage.getItem as jest.Mock;
      const setItemSpy = mockLocalStorage.setItem as jest.Mock;

      getItemSpy.mockReturnValue(null);

      const config: Partial<ErrorReportingConfig> = {
        destination: {
          console: false,
          storage: true,
          remote: undefined,
        },
      };
      errorLogger.setConfig(config);

      const error = createTestError();
      errorLogger.logError(error);
      await errorLogger.flush();

      expect(setItemSpy).toHaveBeenCalledWith('error-logs', expect.stringContaining(error.message));
    });
  });

  describe('Performance and Statistics', () => {
    test('should track comprehensive error statistics', () => {
      const errors = [
        createTestError('network', 'high'),
        createTestError('network', 'medium'),
        createTestError('authentication', 'high'),
        createTestError('validation', 'low'),
      ];

      errors.forEach(error => errorLogger.logError(error));

      const stats = errorLogger.getStats();

      expect(stats.totalErrors).toBe(4);
      expect(stats.errorsByType.network).toBe(2);
      expect(stats.errorsByType.authentication).toBe(1);
      expect(stats.errorsBySeverity.high).toBe(2);
      expect(stats.recentErrors).toHaveLength(4);
    });

    test('should maintain top errors list', () => {
      // Create errors with same fingerprint
      const sameErrors = Array.from({ length: 5 }, () =>
        createTestError('network', 'medium', 'transient', 'Same error message')
      );

      sameErrors.forEach(error => errorLogger.logError(error));

      const stats = errorLogger.getStats();
      expect(stats.topErrors.length).toBeGreaterThan(0);
      expect(stats.topErrors?.[0]?.count).toBe(5);
    });
  });
});

describe('RecoveryOrchestrator', () => {
  let recoveryOrchestrator: RecoveryOrchestrator;

  beforeEach(() => {
    recoveryOrchestrator = new RecoveryOrchestrator();
  });

  describe('Workflow Registration', () => {
    test('should register custom workflows', () => {
      const workflow: RecoveryWorkflow = {
        id: 'test-workflow',
        name: 'Test Recovery Workflow',
        description: 'Test workflow for unit testing',
        triggers: [
          {
            errorType: 'network',
            severity: 'high',
            threshold: { count: 1, timeWindow: 60000 },
          },
        ],
        steps: [
          {
            id: 'test-step',
            name: 'Test Step',
            type: 'retry',
            config: { maxAttempts: 3 },
          },
        ],
        timeout: 30000,
        maxExecutions: 5,
        cooldownPeriod: 60000,
        enabled: true,
      };

      recoveryOrchestrator.registerWorkflow(workflow);

      const registeredWorkflow = recoveryOrchestrator.getWorkflow('test-workflow');
      expect(registeredWorkflow).toBeDefined();
      expect(registeredWorkflow?.name).toBe('Test Recovery Workflow');
    });

    test('should validate workflows before registration', () => {
      const invalidWorkflow = {
        id: '',
        name: '',
        description: '',
        triggers: [],
        steps: [],
        timeout: 0,
        maxExecutions: 0,
        cooldownPeriod: 0,
        enabled: true,
      };

      expect(() => recoveryOrchestrator.registerWorkflow(invalidWorkflow)).toThrow();
    });
  });

  describe('Recovery Execution', () => {
    test('should execute matching recovery workflow', async () => {
      const error = createTestError('network', 'medium', 'transient');
      const context = createTestContext();

      const execution = await recoveryOrchestrator.executeRecovery(error, context);

      expect(execution.status).toBe('success');
      expect(execution.workflowId).toBe('default-retry');
      expect(execution.completedSteps.length).toBeGreaterThan(0);
    });

    test('should handle workflow execution timeout', async () => {
      const timeoutWorkflow: RecoveryWorkflow = {
        id: 'timeout-workflow',
        name: 'Timeout Test',
        description: 'Test workflow timeout',
        triggers: [
          {
            errorType: 'system',
            severity: 'high',
          },
        ],
        steps: [
          {
            id: 'slow-step',
            name: 'Slow Step',
            type: 'custom',
            config: { delay: 2000 },
            timeout: 3000,
          },
        ],
        timeout: 100, // Very short timeout
        maxExecutions: 1,
        cooldownPeriod: 0,
        enabled: true,
      };

      recoveryOrchestrator.registerWorkflow(timeoutWorkflow);

      const error = createTestError('system', 'high');
      const context = createTestContext();

      await expect(recoveryOrchestrator.executeRecovery(error, context)).rejects.toThrow(
        'timed out'
      );
    });

    test('should respect workflow execution limits', async () => {
      const limitedWorkflow: RecoveryWorkflow = {
        id: 'limited-workflow',
        name: 'Limited Executions',
        description: 'Test execution limits',
        triggers: [
          {
            errorType: 'validation',
            severity: 'medium',
          },
        ],
        steps: [
          {
            id: 'simple-step',
            name: 'Simple Step',
            type: 'custom',
            config: {},
          },
        ],
        timeout: 10000,
        maxExecutions: 1,
        cooldownPeriod: 0,
        enabled: true,
      };

      recoveryOrchestrator.registerWorkflow(limitedWorkflow);

      const error = createTestError('validation', 'medium');
      const context = createTestContext();

      // First execution should succeed
      await recoveryOrchestrator.executeRecovery(error, context);

      // Second execution should fail due to limit
      await expect(recoveryOrchestrator.executeRecovery(error, context)).rejects.toThrow(
        'exceeded execution limit'
      );
    });

    test('should respect cooldown periods', async () => {
      const cooldownWorkflow: RecoveryWorkflow = {
        id: 'cooldown-workflow',
        name: 'Cooldown Test',
        description: 'Test cooldown period',
        triggers: [
          {
            errorType: 'timeout',
            severity: 'medium',
          },
        ],
        steps: [
          {
            id: 'quick-step',
            name: 'Quick Step',
            type: 'custom',
            config: {},
          },
        ],
        timeout: 10000,
        maxExecutions: 5,
        cooldownPeriod: 5000, // 5 second cooldown
        enabled: true,
      };

      recoveryOrchestrator.registerWorkflow(cooldownWorkflow);

      const error = createTestError('timeout', 'medium');
      const context = createTestContext();

      // First execution should succeed
      await recoveryOrchestrator.executeRecovery(error, context);

      // Immediate second execution should fail due to cooldown
      await expect(recoveryOrchestrator.executeRecovery(error, context)).rejects.toThrow(
        'cooldown period'
      );
    });
  });

  describe('Step Execution', () => {
    test('should execute different step types correctly', async () => {
      const complexWorkflow: RecoveryWorkflow = {
        id: 'complex-workflow',
        name: 'Complex Recovery',
        description: 'Test different step types',
        triggers: [
          {
            errorType: 'data',
            severity: 'medium',
          },
        ],
        steps: [
          {
            id: 'retry-step',
            name: 'Retry Operation',
            type: 'retry',
            config: { maxAttempts: 2 },
          },
          {
            id: 'fallback-step',
            name: 'Enable Fallback',
            type: 'fallback',
            config: { mode: 'offline' },
          },
          {
            id: 'notify-step',
            name: 'Send Notification',
            type: 'notify',
            config: {
              message: 'Recovery completed',
              severity: 'info',
            },
          },
        ],
        timeout: 30000,
        maxExecutions: 3,
        cooldownPeriod: 60000,
        enabled: true,
      };

      recoveryOrchestrator.registerWorkflow(complexWorkflow);

      const error = createTestError('data', 'medium');
      const context = createTestContext();

      const execution = await recoveryOrchestrator.executeRecovery(error, context);

      expect(execution.status).toBe('success');
      expect(execution.completedSteps).toHaveLength(3);
      expect(execution.completedSteps).toContain('retry-step');
      expect(execution.completedSteps).toContain('fallback-step');
      expect(execution.completedSteps).toContain('notify-step');
    });

    test('should handle step failures with skipOnFailure', async () => {
      const faultTolerantWorkflow: RecoveryWorkflow = {
        id: 'fault-tolerant',
        name: 'Fault Tolerant Recovery',
        description: 'Test skipOnFailure behavior',
        triggers: [
          {
            errorType: 'user_input',
            severity: 'low',
          },
        ],
        steps: [
          {
            id: 'failing-step',
            name: 'Failing Step',
            type: 'reset',
            config: { component: 'nonexistent' },
            skipOnFailure: true,
          },
          {
            id: 'success-step',
            name: 'Success Step',
            type: 'custom',
            config: {},
          },
        ],
        timeout: 30000,
        maxExecutions: 3,
        cooldownPeriod: 0,
        enabled: true,
      };

      recoveryOrchestrator.registerWorkflow(faultTolerantWorkflow);

      const error = createTestError('user_input', 'low');
      const context = createTestContext();

      const execution = await recoveryOrchestrator.executeRecovery(error, context);

      expect(execution.status).toBe('success');
      expect(execution.completedSteps).toContain('success-step');
    });
  });

  describe('Metrics and Monitoring', () => {
    test('should track recovery statistics', async () => {
      const error = createTestError('network', 'medium', 'transient');
      const context = createTestContext();

      await recoveryOrchestrator.executeRecovery(error, context);

      const stats = recoveryOrchestrator.getRecoveryStats();

      expect(stats.totalExecutions).toBe(1);
      expect(stats.successfulRecoveries).toBe(1);
      expect(stats.recoverySuccessRate).toBe(1);
      expect(stats.averageRecoveryTime).toBeGreaterThan(0);
    });

    test('should track workflow-specific performance', async () => {
      const error = createTestError('network', 'medium', 'transient');
      const context = createTestContext();

      await recoveryOrchestrator.executeRecovery(error, context);

      const stats = recoveryOrchestrator.getRecoveryStats();
      const workflowPerf = stats.workflowPerformance['default-retry'];

      expect(workflowPerf).toBeDefined();
      expect(workflowPerf?.executions).toBe(1);
      expect(workflowPerf?.successes).toBe(1);
      expect(workflowPerf?.successRate).toBe(1);
    });

    test('should maintain execution history', async () => {
      const error = createTestError('network', 'medium', 'transient');
      const context = createTestContext();

      await recoveryOrchestrator.executeRecovery(error, context);

      const history = recoveryOrchestrator.getExecutionHistory();

      expect(history).toHaveLength(1);
      expect(history[0]?.status).toBe('success');
      expect(history[0]?.workflowId).toBe('default-retry');
    });
  });

  describe('Concurrent Execution Management', () => {
    test('should limit concurrent recoveries', async () => {
      const config = { maxConcurrentExecutions: 1 };
      recoveryOrchestrator = new RecoveryOrchestrator(config);

      const error = createTestError('network', 'medium', 'transient');
      const context = createTestContext();

      // Start first recovery (don't await)
      const recovery1 = recoveryOrchestrator.executeRecovery(error, context);

      // Try to start second recovery immediately
      await expect(recoveryOrchestrator.executeRecovery(error, context)).rejects.toThrow(
        'Maximum concurrent recoveries reached'
      );

      // Wait for first recovery to complete
      await recovery1;
    });

    test('should track active recoveries', async () => {
      const error = createTestError('network', 'medium', 'transient');
      const context = createTestContext();

      const recoveryPromise = recoveryOrchestrator.executeRecovery(error, context);

      const activeRecoveries = recoveryOrchestrator.getActiveRecoveries();
      expect(activeRecoveries).toHaveLength(1);
      expect(activeRecoveries[0]?.status).toBe('running');

      await recoveryPromise;

      const completedRecoveries = recoveryOrchestrator.getActiveRecoveries();
      expect(completedRecoveries).toHaveLength(0);
    });

    test('should support recovery cancellation', async () => {
      const slowWorkflow: RecoveryWorkflow = {
        id: 'slow-workflow',
        name: 'Slow Recovery',
        description: 'Slow recovery for testing cancellation',
        triggers: [
          {
            errorType: 'configuration',
            severity: 'high',
          },
        ],
        steps: [
          {
            id: 'slow-step',
            name: 'Slow Step',
            type: 'custom',
            config: { delay: 5000 }, // 5 second delay
            timeout: 10000,
          },
        ],
        timeout: 15000,
        maxExecutions: 1,
        cooldownPeriod: 0,
        enabled: true,
      };

      recoveryOrchestrator.registerWorkflow(slowWorkflow);

      const error = createTestError('configuration', 'high');
      const context = createTestContext();

      const recoveryPromise = recoveryOrchestrator.executeRecovery(error, context);

      // Get the execution ID and cancel it
      const activeRecoveries = recoveryOrchestrator.getActiveRecoveries();
      expect(activeRecoveries).toHaveLength(1);

      const executionId = activeRecoveries[0]?.executionId;
      recoveryOrchestrator.cancelRecovery(executionId);

      const cancelledRecoveries = recoveryOrchestrator.getActiveRecoveries();
      expect(cancelledRecoveries).toHaveLength(0);

      // The promise should still resolve/reject
      try {
        await recoveryPromise;
      } catch (error) {
        // Expected if cancellation causes failure
      }
    });
  });
});

describe('Integration Tests', () => {
  describe('Error Handling Pipeline', () => {
    test('should handle complete error processing pipeline', async () => {
      const errorClassifier = new ErrorClassifier();
      const retryManager = new RetryManager();
      const fallbackManager = new FallbackManager();
      const messageGenerator = new ErrorMessageGenerator();
      const errorLogger = new ErrorLogger({ destination: { console: false, storage: false } });

      // Simulate a network error
      const originalError = new Error('Network connection failed');
      (originalError as any).code = 'ECONNREFUSED';

      // Step 1: Classify the error
      const classification = errorClassifier.classify(originalError);
      expect(classification.type).toBe('network');
      expect(classification.recoverability).toBe('transient');

      // Step 2: Create SearchError from classification
      const searchError: SearchError = {
        name: originalError.name,
        message: originalError.message,
        type: classification.type,
        code: (originalError as any).code,
        severity: classification.severity,
        recoverability: classification.recoverability,
        originalError,
        timestamp: Date.now(),
        correlationId: 'integration-test',
      };

      // Step 3: Try retry (simulate failure)
      let retryAttempted = false;
      try {
        await retryManager.retry(
          async () => {
            retryAttempted = true;
            throw searchError;
          },
          { maxAttempts: 2 }
        );
      } catch (error) {
        // Expected to fail after retries
      }

      expect(retryAttempted).toBe(true);

      // Step 4: Execute fallback
      const context = createTestContext();
      const fallbackResult = await fallbackManager.executeStrategy(
        searchError,
        'test query',
        context
      );

      expect(fallbackResult.success).toBeDefined();

      // Step 5: Generate user message
      const userMessage = messageGenerator.generateMessage(searchError, context);
      expect(userMessage.title).toBeDefined();
      expect(userMessage.message).toBeDefined();

      // Step 6: Log the error
      errorLogger.logError(searchError, context);
      const stats = errorLogger.getStats();
      expect(stats.totalErrors).toBe(1);

      // Cleanup
      errorLogger.dispose();
    });

    test('should demonstrate recovery orchestration with multiple systems', async () => {
      const errorClassifier = new ErrorClassifier();
      const recoveryOrchestrator = new RecoveryOrchestrator();

      // Create a custom workflow that integrates with other components
      const integratedWorkflow: RecoveryWorkflow = {
        id: 'integrated-recovery',
        name: 'Integrated Recovery Workflow',
        description: 'Recovery workflow that uses multiple error handling components',
        triggers: [
          {
            errorType: 'system',
            severity: 'critical',
          },
        ],
        steps: [
          {
            id: 'classify-error',
            name: 'Classify Error',
            type: 'custom',
            config: { action: 'classify' },
          },
          {
            id: 'attempt-retry',
            name: 'Retry Operation',
            type: 'retry',
            config: { maxAttempts: 2 },
          },
          {
            id: 'enable-fallback',
            name: 'Enable Fallback Mode',
            type: 'fallback',
            config: { mode: 'degraded' },
          },
          {
            id: 'notify-users',
            name: 'Notify Users',
            type: 'notify',
            config: {
              message: 'System is in recovery mode',
              severity: 'warning',
            },
          },
        ],
        timeout: 60000,
        maxExecutions: 1,
        cooldownPeriod: 300000,
        enabled: true,
      };

      recoveryOrchestrator.registerWorkflow(integratedWorkflow);

      const criticalError = createTestError('system', 'critical');
      const context = createTestContext();

      const execution = await recoveryOrchestrator.executeRecovery(criticalError, context);

      expect(execution.status).toBe('success');
      expect(execution.completedSteps).toHaveLength(4);
      expect(execution.result).toBeDefined();
    });
  });

  describe('Performance Under Load', () => {
    test('should handle high-volume error processing efficiently', async () => {
      const errorClassifier = new ErrorClassifier();
      const messageGenerator = new ErrorMessageGenerator();

      const startTime = Date.now();
      const errorCount = 1000;

      // Process many errors quickly
      const errors = Array.from({ length: errorCount }, (_, i) => {
        const errorTypes: ErrorType[] = ['network', 'validation', 'authentication', 'system'];
        const type = errorTypes[i % errorTypes.length];
        return createTestError(type, 'medium', 'transient', `Error ${i}`);
      });

      const results = await Promise.all(
        errors.map(async error => {
          const classification = errorClassifier.classify(error);
          const message = messageGenerator.generateMessage(error);
          return { classification, message };
        })
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(results).toHaveLength(errorCount);
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Verify all results are valid
      results.forEach(result => {
        expect(result.classification.type).toBeDefined();
        expect(result.message.title).toBeDefined();
      });
    });

    test('should maintain performance with concurrent retry operations', async () => {
      const retryManager = new RetryManager();
      const concurrentRetries = 50;

      const startTime = Date.now();

      const retryPromises = Array.from({ length: concurrentRetries }, async (_, i) => {
        const shouldSucceed = i % 3 === 0; // 1/3 will succeed after retry
        let attemptCount = 0;

        return retryManager.retry(
          async () => {
            attemptCount++;
            if (shouldSucceed && attemptCount >= 2) {
              return `Success ${i}`;
            }
            throw createTestError('network', 'medium', 'transient');
          },
          { maxAttempts: 3 }
        );
      });

      const results = await Promise.allSettled(retryPromises);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      expect(successful).toBeGreaterThan(0);
      expect(failed).toBeGreaterThan(0);
      expect(successful + failed).toBe(concurrentRetries);
    });
  });
});

describe('Error Handling Resilience', () => {
  describe('Cascading Failure Prevention', () => {
    test('should prevent error handling components from causing additional errors', async () => {
      // Test that error handling itself doesn't throw
      const faultyErrorLogger = new ErrorLogger({
        destination: {
          console: false,
          storage: false,
          remote: {
            endpoint: 'invalid-url',
            batchSize: 1,
            flushInterval: 1000,
          },
        },
      });

      const error = createTestError();

      // This should not throw even with invalid remote endpoint
      expect(() => {
        faultyErrorLogger.logError(error);
      }).not.toThrow();

      faultyErrorLogger.dispose();
    });

    test('should gracefully degrade when components fail', async () => {
      const fallbackManager = new FallbackManager();

      // Register a strategy that will fail
      fallbackManager.registerStrategy({
        name: 'failing-strategy',
        priority: 1,
        enabled: true,
        executor: {
          execute: async () => {
            throw new Error('Strategy failed');
          },
          canExecute: () => true,
          description: 'Failing strategy for testing',
        },
        timeout: 1000,
      });

      const error = createTestError('network');
      const context = createTestContext();

      // Should fall back to next available strategy
      const result = await fallbackManager.executeStrategy(error, 'test', context);

      expect(result.success).toBeDefined(); // Should still get a result
      expect(result.source).not.toBe('failing-strategy');
    });
  });

  describe('Memory Management', () => {
    test('should clean up resources properly', () => {
      const components = [new ErrorLogger(), new FallbackManager(), new RecoveryOrchestrator()];

      // Use components
      components.forEach(component => {
        if ('dispose' in component && typeof component.dispose === 'function') {
          expect(() => component.dispose()).not.toThrow();
        }
      });
    });

    test('should limit memory usage in long-running scenarios', () => {
      const errorLogger = new ErrorLogger();
      const _initialStats = errorLogger.getStats();

      // Log many errors
      for (let i = 0; i < 2000; i++) {
        errorLogger.logError(createTestError());
      }

      const stats = errorLogger.getStats();

      // Recent errors should be limited to prevent unbounded growth
      expect(stats.recentErrors.length).toBeLessThanOrEqual(100);

      errorLogger.dispose();
    });
  });
});
