/**
 * Comprehensive QueryProcessor Unit Tests
 * Tests for enhanced query processing pipeline with comprehensive validation, security, and performance
 */

import { QueryProcessor } from '../../src/pipeline/QueryProcessor';
import type { QueryConfig, ValidationRule } from '../../src/types/Config';
import type { ProcessedQuery } from '../../src/types/Results';
import { ValidationError } from '../../src/utils/validation';
import { performanceTracker } from '../../src/utils/performance';

describe('QueryProcessor', () => {
  const defaultConfig: QueryConfig = {
    minLength: 2,
    debounceMs: 300,
    triggerOn: 'change',
    caseSensitive: false,
    matchMode: 'partial',
    debounceStrategy: 'trailing',
    caseNormalization: 'lowercase',
    xssProtection: true,
    sqlInjectionProtection: true,
    performanceMonitoring: true
  };

  describe('Constructor and Configuration Validation', () => {
    it('should create processor with valid configuration', () => {
      const processor = new QueryProcessor(defaultConfig);
      expect(processor).toBeInstanceOf(QueryProcessor);
      expect(processor.getConfig()).toEqual(expect.objectContaining(defaultConfig));
    });

    it('should throw ValidationError for invalid minLength', () => {
      expect(() => {
        new QueryProcessor({
          ...defaultConfig,
          minLength: -1
        });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for excessive minLength', () => {
      expect(() => {
        new QueryProcessor({
          ...defaultConfig,
          minLength: 101
        });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid triggerOn', () => {
      expect(() => {
        new QueryProcessor({
          ...defaultConfig,
          triggerOn: 'invalid' as any
        });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid matchMode', () => {
      expect(() => {
        new QueryProcessor({
          ...defaultConfig,
          matchMode: 'invalid' as any
        });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid debounceStrategy', () => {
      expect(() => {
        new QueryProcessor({
          ...defaultConfig,
          debounceStrategy: 'invalid' as any
        });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid caseNormalization', () => {
      expect(() => {
        new QueryProcessor({
          ...defaultConfig,
          caseNormalization: 'invalid' as any
        });
      }).toThrow(ValidationError);
    });

    it('should validate custom validators array', () => {
      expect(() => {
        new QueryProcessor({
          ...defaultConfig,
          customValidators: 'invalid' as any
        });
      }).toThrow(ValidationError);
    });

    it('should validate custom validator structure', () => {
      expect(() => {
        new QueryProcessor({
          ...defaultConfig,
          customValidators: [{ invalid: true } as any]
        });
      }).toThrow(ValidationError);
    });
  });

  describe('Query Processing Core Functionality', () => {
    let processor: QueryProcessor;

    beforeEach(() => {
      processor = new QueryProcessor(defaultConfig);
      performanceTracker.clearMetrics();
    });

    afterEach(() => {
      processor.destroy();
    });

    it('should process valid query correctly', () => {
      const result = processor.processQuery('test query');
      
      expect(result.original).toBe('test query');
      expect(result.normalized).toBe('test query');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.metadata).toHaveProperty('processingTime');
      expect(result.metadata).toHaveProperty('timestamp');
      expect(result.metadata.length).toBe(10);
      expect(result.metadata.trimmed).toBe(false);
    });

    it('should handle trimming and normalization', () => {
      const result = processor.processQuery('  Test   Query  ');
      
      expect(result.original).toBe('  Test   Query  ');
      expect(result.normalized).toBe('test query');
      expect(result.metadata.trimmed).toBe(true);
      expect(result.metadata.caseNormalized).toBe('lowercase');
    });

    it('should handle non-string input', () => {
      const result = processor.processQuery(null as any);
      
      expect(result.original).toBe(null);
      expect(result.normalized).toBe('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Query must be a string');
    });

    it('should validate minimum length', () => {
      const result = processor.processQuery('a');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Query must be at least 2 characters long');
    });

    it('should validate maximum length', () => {
      const longQuery = 'a'.repeat(501);
      const result = processor.processQuery(longQuery);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Query is too long (maximum 500 characters)');
    });

    it('should include performance metadata when monitoring enabled', () => {
      const result = processor.processQuery('test query');
      
      expect(result.metadata.processingTime).toBeGreaterThan(0);
      expect(typeof result.metadata.timestamp).toBe('number');
    });
  });

  describe('Case Normalization', () => {
    it('should apply lowercase normalization', () => {
      const processor = new QueryProcessor({
        ...defaultConfig,
        caseNormalization: 'lowercase'
      });

      const result = processor.processQuery('TEST Query');
      expect(result.normalized).toBe('test query');
      expect(result.metadata.caseNormalized).toBe('lowercase');
      processor.destroy();
    });

    it('should apply uppercase normalization', () => {
      const processor = new QueryProcessor({
        ...defaultConfig,
        caseNormalization: 'uppercase'
      });

      const result = processor.processQuery('test Query');
      expect(result.normalized).toBe('TEST QUERY');
      expect(result.metadata.caseNormalized).toBe('uppercase');
      processor.destroy();
    });

    it('should preserve case when configured', () => {
      const processor = new QueryProcessor({
        ...defaultConfig,
        caseNormalization: 'preserve'
      });

      const result = processor.processQuery('Test Query');
      expect(result.normalized).toBe('Test Query');
      expect(result.metadata.caseNormalized).toBe('preserve');
      processor.destroy();
    });
  });

  describe('Security Features', () => {
    let processor: QueryProcessor;

    beforeEach(() => {
      processor = new QueryProcessor({
        ...defaultConfig,
        xssProtection: true,
        sqlInjectionProtection: true
      });
    });

    afterEach(() => {
      processor.destroy();
    });

    it('should detect and sanitize XSS patterns', () => {
      const xssQueries = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        'onclick="malicious()"',
        'style="background: url(javascript:alert())"'
      ];

      xssQueries.forEach(query => {
        const result = processor.processQuery(query);
        expect(result.metadata.xssProtected).toBe(true);
        expect(result.normalized).not.toContain('<script>');
        expect(result.normalized).not.toContain('javascript:');
      });
    });

    it('should detect and sanitize SQL injection patterns', () => {
      const sqlQueries = [
        "'; DROP TABLE users; --",
        'SELECT * FROM users',
        "admin' OR '1'='1",
        'UNION SELECT password FROM users'
      ];

      sqlQueries.forEach(query => {
        const result = processor.processQuery(query);
        expect(result.metadata.sqlInjectionProtected).toBe(true);
      });
    });

    it('should allow safe queries through security validation', () => {
      const safeQueries = [
        'user@domain.com',
        'programming',
        'price range',
        'How to code'
      ];

      safeQueries.forEach(query => {
        const result = processor.processQuery(query);
        if (query.length >= defaultConfig.minLength) {
          expect(result.isValid).toBe(true);
          expect(result.metadata.xssProtected).toBeUndefined();
          expect(result.metadata.sqlInjectionProtected).toBeUndefined();
        }
      });
    });

    it('should work with security features disabled', () => {
      const insecureProcessor = new QueryProcessor({
        ...defaultConfig,
        xssProtection: false,
        sqlInjectionProtection: false
      });

      const result = insecureProcessor.processQuery('<script>alert()</script>');
      expect(result.metadata.xssProtected).toBeUndefined();
      expect(result.metadata.sqlInjectionProtected).toBeUndefined();
      
      insecureProcessor.destroy();
    });
  });

  describe('Custom Validation Rules', () => {
    const customValidators: ValidationRule[] = [
      {
        id: 'no-numbers',
        validate: (query: string) => !/\d/.test(query),
        errorMessage: 'Query cannot contain numbers'
      },
      {
        id: 'min-words',
        validate: (query: string) => query.split(' ').length >= 2,
        errorMessage: 'Query must contain at least 2 words'
      }
    ];

    let processor: QueryProcessor;

    beforeEach(() => {
      processor = new QueryProcessor({
        ...defaultConfig,
        customValidators
      });
    });

    afterEach(() => {
      processor.destroy();
    });

    it('should apply custom validation rules', () => {
      const result = processor.processQuery('test123');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Query cannot contain numbers');
    });

    it('should apply multiple custom validation rules', () => {
      const result = processor.processQuery('test');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Query must contain at least 2 words');
    });

    it('should pass when all custom validations pass', () => {
      const result = processor.processQuery('test query');
      expect(result.isValid).toBe(true);
    });

    it('should handle custom validator errors gracefully', () => {
      const faultyValidator: ValidationRule = {
        id: 'faulty',
        validate: () => { throw new Error('Validator error'); },
        errorMessage: 'Faulty validator'
      };

      const faultyProcessor = new QueryProcessor({
        ...defaultConfig,
        customValidators: [faultyValidator]
      });

      const result = faultyProcessor.processQuery('test query');
      expect(result.isValid).toBe(true); // Should not fail due to validator error
      
      faultyProcessor.destroy();
    });
  });

  describe('Debounced Processing', () => {
    let processor: QueryProcessor;
    let callback: jest.Mock;

    beforeEach(() => {
      processor = new QueryProcessor({
        ...defaultConfig,
        debounceMs: 100,
        debounceStrategy: 'trailing'
      });
      callback = jest.fn();
    });

    afterEach(() => {
      processor.destroy();
    });

    it('should debounce query processing', (done) => {
      processor.debouncedProcess('test', callback);
      processor.debouncedProcess('test query', callback);
      
      expect(callback).not.toHaveBeenCalled();
      
      setTimeout(() => {
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({
            normalized: 'test query'
          })
        );
        done();
      }, 150);
    });

    it('should support leading debounce strategy', (done) => {
      const leadingProcessor = new QueryProcessor({
        ...defaultConfig,
        debounceMs: 100,
        debounceStrategy: 'leading'
      });
      const leadingCallback = jest.fn();

      leadingProcessor.debouncedProcess('test', leadingCallback);
      
      expect(leadingCallback).toHaveBeenCalledTimes(1);
      
      // Should not call again immediately due to leading debounce
      leadingProcessor.debouncedProcess('test query', leadingCallback);
      expect(leadingCallback).toHaveBeenCalledTimes(1);
      
      // After debounce period, should be ready for next leading call
      setTimeout(() => {
        leadingProcessor.debouncedProcess('another query', leadingCallback);
        expect(leadingCallback).toHaveBeenCalledTimes(2);
        leadingProcessor.destroy();
        done();
      }, 150);
    });

    it('should support both debounce strategy', (done) => {
      const bothProcessor = new QueryProcessor({
        ...defaultConfig,
        debounceMs: 100,
        debounceStrategy: 'both'
      });

      bothProcessor.debouncedProcess('test', callback);
      
      expect(callback).toHaveBeenCalledTimes(1); // Leading edge
      
      setTimeout(() => {
        expect(callback).toHaveBeenCalledTimes(2); // Trailing edge
        bothProcessor.destroy();
        done();
      }, 150);
    });

    it('should cancel pending operations', (done) => {
      processor.debouncedProcess('test', callback);
      processor.cancelPendingOperations();
      
      setTimeout(() => {
        expect(callback).not.toHaveBeenCalled();
        done();
      }, 150);
    });

    it('should execute immediately when no debouncing configured', () => {
      const immediateProcessor = new QueryProcessor({
        ...defaultConfig,
        debounceMs: 0
      });

      immediateProcessor.debouncedProcess('test query', callback);
      expect(callback).toHaveBeenCalledTimes(1);
      
      immediateProcessor.destroy();
    });
  });

  describe('Trigger Mode Support', () => {
    let processor: QueryProcessor;

    beforeEach(() => {
      processor = new QueryProcessor(defaultConfig);
    });

    afterEach(() => {
      processor.destroy();
    });

    it('should trigger on change when configured for change', () => {
      const changeProcessor = new QueryProcessor({
        ...defaultConfig,
        triggerOn: 'change'
      });

      expect(changeProcessor.shouldTriggerSearch('test', 'change')).toBe(true);
      expect(changeProcessor.shouldTriggerSearch('test', 'enter')).toBe(false);
      
      changeProcessor.destroy();
    });

    it('should trigger on enter when configured for enter', () => {
      const enterProcessor = new QueryProcessor({
        ...defaultConfig,
        triggerOn: 'enter'
      });

      expect(enterProcessor.shouldTriggerSearch('test', 'enter')).toBe(true);
      expect(enterProcessor.shouldTriggerSearch('test', 'change')).toBe(false);
      
      enterProcessor.destroy();
    });

    it('should trigger on both when configured for both', () => {
      const bothProcessor = new QueryProcessor({
        ...defaultConfig,
        triggerOn: 'both'
      });

      expect(bothProcessor.shouldTriggerSearch('test', 'change')).toBe(true);
      expect(bothProcessor.shouldTriggerSearch('test', 'enter')).toBe(true);
      
      bothProcessor.destroy();
    });

    it('should respect trigger mode in debounced processing', () => {
      const callback = jest.fn();
      const enterProcessor = new QueryProcessor({
        ...defaultConfig,
        triggerOn: 'enter',
        debounceMs: 0
      });

      enterProcessor.debouncedProcess('test', callback, 'change');
      expect(callback).not.toHaveBeenCalled();

      enterProcessor.debouncedProcess('test', callback, 'enter');
      expect(callback).toHaveBeenCalledTimes(1);
      
      enterProcessor.destroy();
    });
  });

  describe('Event System', () => {
    let processor: QueryProcessor;
    let validListener: jest.Mock;
    let invalidListener: jest.Mock;

    beforeEach(() => {
      processor = new QueryProcessor(defaultConfig);
      validListener = jest.fn();
      invalidListener = jest.fn();
    });

    afterEach(() => {
      processor.destroy();
    });

    it('should emit query:valid events', () => {
      processor.addEventListener('query:valid', validListener);
      processor.processQuery('valid query');
      
      expect(validListener).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            isValid: true,
            normalized: 'valid query'
          })
        })
      );
    });

    it('should emit query:invalid events', () => {
      processor.addEventListener('query:invalid', invalidListener);
      processor.processQuery('a'); // Too short
      
      expect(invalidListener).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            isValid: false
          })
        })
      );
    });

    it('should remove event listeners', () => {
      processor.addEventListener('query:valid', validListener);
      processor.removeEventListener('query:valid', validListener);
      processor.processQuery('valid query');
      
      expect(validListener).not.toHaveBeenCalled();
    });

    it('should handle event listener errors gracefully', () => {
      const faultyListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      
      processor.addEventListener('query:valid', faultyListener);
      
      expect(() => {
        processor.processQuery('valid query');
      }).not.toThrow();
    });

    it('should emit debounced events', (done) => {
      const debouncedListener = jest.fn();
      processor.addEventListener('query:debounced', debouncedListener);
      
      processor.debouncedProcess('test query', () => {});
      
      setTimeout(() => {
        expect(debouncedListener).toHaveBeenCalledTimes(1);
        done();
      }, 350);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics when enabled', () => {
      const processor = new QueryProcessor({
        ...defaultConfig,
        performanceMonitoring: true
      });

      processor.processQuery('test query');
      const metrics = processor.getPerformanceMetrics();
      
      expect(metrics.length).toBeGreaterThan(0);
      
      processor.destroy();
    });

    it('should not track performance metrics when disabled', () => {
      const processor = new QueryProcessor({
        ...defaultConfig,
        performanceMonitoring: false
      });

      processor.processQuery('test query');
      const metrics = processor.getPerformanceMetrics();
      
      expect(metrics).toEqual([]);
      
      processor.destroy();
    });
  });

  describe('Validation Methods', () => {
    let processor: QueryProcessor;

    beforeEach(() => {
      processor = new QueryProcessor(defaultConfig);
    });

    afterEach(() => {
      processor.destroy();
    });

    it('should validate input strings', () => {
      const result = processor.validateInput('valid query');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate input with errors', () => {
      const result = processor.validateInput('a');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Query must be at least 2 characters long');
    });

    it('should handle non-string input in validation', () => {
      const result = processor.validateInput(null as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Query must be a string');
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should clean up resources on destroy', (done) => {
      const cleanupProcessor = new QueryProcessor({
        ...defaultConfig,
        debounceMs: 100
      });

      const cleanupCallback = jest.fn();
      cleanupProcessor.debouncedProcess('test', cleanupCallback);
      cleanupProcessor.destroy();

      setTimeout(() => {
        expect(cleanupCallback).not.toHaveBeenCalled();
        done();
      }, 150);
    });

    it('should clear event listeners on destroy', () => {
      const processor = new QueryProcessor(defaultConfig);
      const listener = jest.fn();
      
      processor.addEventListener('query:valid', listener);
      processor.destroy();
      processor.processQuery('valid query');
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    let processor: QueryProcessor;

    beforeEach(() => {
      processor = new QueryProcessor(defaultConfig);
    });

    afterEach(() => {
      processor.destroy();
    });

    it('should handle empty string queries', () => {
      const result = processor.processQuery('');
      
      expect(result.isValid).toBe(false);
      expect(result.normalized).toBe('');
    });

    it('should handle whitespace-only queries', () => {
      const result = processor.processQuery('   ');
      
      expect(result.isValid).toBe(false);
      expect(result.normalized).toBe('');
      expect(result.metadata.trimmed).toBe(true);
    });

    it('should handle unicode characters', () => {
      const result = processor.processQuery('café naïve résumé');
      
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('café naïve résumé');
    });

    it('should normalize multiple spaces correctly', () => {
      const result = processor.processQuery('word1    word2     word3');
      
      expect(result.normalized).toBe('word1 word2 word3');
    });

    it('should handle special characters in newlines and tabs', () => {
      const result = processor.processQuery('word1\n\tword2\r\nword3');
      
      expect(result.normalized).toBe('word1 word2 word3');
    });

    it('should return immutable config', () => {
      const config = processor.getConfig();
      (config as any).minLength = 999;
      
      expect(processor.getConfig().minLength).toBe(2);
    });
  });
});