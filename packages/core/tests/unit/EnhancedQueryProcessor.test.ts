/**
 * Enhanced QueryProcessor Tests - Story 2.1 Features
 * @description Tests for security integration, performance monitoring, and enhanced validation
 */

import { QueryProcessor, type QueryConfig } from '../../src/pipeline/QueryProcessor';

describe('Enhanced QueryProcessor (Story 2.1)', () => {
  let defaultConfig: QueryConfig;

  beforeEach(() => {
    defaultConfig = {
      minLength: 3,
      debounceMs: 300,
      triggerOn: 'change',
      caseSensitive: false,
      matchMode: 'partial'
    };
  });

  describe('Security Integration (AC 1)', () => {
    it('should integrate security validation by default', () => {
      const processor = new QueryProcessor(defaultConfig);
      const config = processor.getConfig();
      
      expect(config.enableSecurityValidation).toBe(true);
      expect(config.enableXSSProtection).toBe(true);
      expect(config.enableSQLInjectionProtection).toBe(true);
    });

    it('should detect and sanitize XSS patterns', () => {
      const processor = new QueryProcessor(defaultConfig);
      const maliciousQuery = '<script>alert("xss")</script>test';
      
      const result = processor.processQuery(maliciousQuery);
      
      expect(result.securityInfo).toBeDefined();
      expect(result.securityInfo?.threats.xss).toBe(true);
      expect(result.sanitized).toBeDefined();
      expect(result.sanitized).not.toContain('<script>');
    });

    it('should detect SQL injection patterns', () => {
      const processor = new QueryProcessor(defaultConfig);
      const sqlInjectionQuery = "test'; DROP TABLE users; --";
      
      const result = processor.processQuery(sqlInjectionQuery);
      
      expect(result.securityInfo?.threats.sqlInjection).toBe(true);
      expect(result.sanitized).toBeDefined();
      expect(result.sanitized).not.toContain('DROP TABLE');
    });

    it('should allow disabling security features', () => {
      const configWithoutSecurity = {
        ...defaultConfig,
        enableSecurityValidation: false
      };
      
      const processor = new QueryProcessor(configWithoutSecurity);
      const result = processor.processQuery('<script>test</script>');
      
      expect(result.securityInfo).toBeUndefined();
    });
  });

  describe('Performance Monitoring (AC 6)', () => {
    it('should enable performance monitoring by default', () => {
      const processor = new QueryProcessor(defaultConfig);
      const config = processor.getConfig();
      
      expect(config.enablePerformanceMonitoring).toBe(true);
    });

    it('should track performance metrics for query processing', () => {
      const processor = new QueryProcessor(defaultConfig);
      
      const result = processor.processQuery('test query');
      
      expect(result.metadata.performanceId).toBeDefined();
      expect(result.metadata.processingTime).toBeGreaterThan(0);
      
      const metrics = processor.getPerformanceMetrics();
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should provide performance recommendations', () => {
      const processor = new QueryProcessor(defaultConfig);
      
      // Generate some metrics
      processor.processQuery('test query 1');
      processor.processQuery('test query 2');
      
      const recommendations = processor.getPerformanceRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should allow disabling performance monitoring', () => {
      const configWithoutPerformance = {
        ...defaultConfig,
        enablePerformanceMonitoring: false
      };
      
      const processor = new QueryProcessor(configWithoutPerformance);
      const result = processor.processQuery('test');
      
      expect(result.metadata.performanceId).toBeUndefined();
    });
  });

  describe('Enhanced Validation (AC 1 & 5)', () => {
    it('should use default minimum length of 3 characters', () => {
      const processor = new QueryProcessor(defaultConfig);
      
      const result = processor.processQuery('ab'); // 2 chars
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least 3 characters');
    });

    it('should provide user-friendly validation messages', () => {
      const processor = new QueryProcessor(defaultConfig);
      
      const validation = processor.validateInput('ab');
      
      expect(validation.userFriendlyMessage).toBeDefined();
      expect(validation.userFriendlyMessage).toContain('Please enter at least 3 characters');
    });

    it('should support localized validation messages', () => {
      const configWithLocalization = {
        ...defaultConfig,
        localization: {
          language: 'es',
          messages: {
            'minLength': 'Por favor ingrese al menos {minLength} caracteres'
          }
        }
      };
      
      const processor = new QueryProcessor(configWithLocalization);
      const validation = processor.validateInput('ab');
      
      expect(validation.localizedMessages).toBeDefined();
      expect(validation.localizedMessages?.es).toContain('Por favor ingrese al menos 3 caracteres');
    });

    it('should support custom validation rules', () => {
      const configWithCustomValidation = {
        ...defaultConfig,
        customValidators: [
          {
            name: 'no-numbers',
            validator: (query: string) => !/\d/.test(query),
            errorMessage: 'Numbers are not allowed'
          }
        ]
      };
      
      const processor = new QueryProcessor(configWithCustomValidation);
      const result = processor.processQuery('test123');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Numbers are not allowed');
    });
  });

  describe('Enhanced Query Normalization (AC 4)', () => {
    it('should support different case normalization strategies', () => {
      const uppercaseConfig = {
        ...defaultConfig,
        caseNormalization: 'uppercase' as const
      };
      
      const processor = new QueryProcessor(uppercaseConfig);
      const result = processor.processQuery('Test Query');
      
      expect(result.normalized).toBe('TEST QUERY');
    });

    it('should support case preservation', () => {
      const preserveCaseConfig = {
        ...defaultConfig,
        caseNormalization: 'preserve' as const
      };
      
      const processor = new QueryProcessor(preserveCaseConfig);
      const result = processor.processQuery('Test Query');
      
      expect(result.normalized).toBe('Test Query');
    });

    it('should perform preprocessing by default', () => {
      const processor = new QueryProcessor(defaultConfig);
      const result = processor.processQuery('test,  query!  with   spaces');
      
      expect(result.normalized).not.toContain(',');
      expect(result.normalized).not.toContain('!');
      expect(result.normalized).not.toMatch(/\s{2,}/); // No multiple spaces
    });

    it('should support stemming when enabled', () => {
      const stemmingConfig = {
        ...defaultConfig,
        enableStemming: true
      };
      
      const processor = new QueryProcessor(stemmingConfig);
      const result = processor.processQuery('running quickly');
      
      expect(result.normalized).toBe('runn quick'); // Basic stemming applied
    });

    it('should allow disabling preprocessing', () => {
      const noPreprocessingConfig = {
        ...defaultConfig,
        enablePreprocessing: false
      };
      
      const processor = new QueryProcessor(noPreprocessingConfig);
      const result = processor.processQuery('test,  query!');
      
      expect(result.normalized).toContain(',');
      expect(result.normalized).toContain('!');
    });
  });

  describe('Advanced Debouncing (AC 2)', () => {
    it('should support trailing debounce strategy by default', (done) => {
      const processor = new QueryProcessor({
        ...defaultConfig,
        debounceMs: 50
      });
      
      let callCount = 0;
      const callback = () => { callCount++; };
      
      processor.debouncedProcess('test1', callback);
      processor.debouncedProcess('test2', callback);
      processor.debouncedProcess('test3', callback);
      
      setTimeout(() => {
        expect(callCount).toBe(1); // Only last call should execute
        done();
      }, 100);
    });

    it('should support leading debounce strategy', (done) => {
      const leadingConfig = {
        ...defaultConfig,
        debounceMs: 50,
        debounceStrategy: 'leading' as const
      };
      
      const processor = new QueryProcessor(leadingConfig);
      let callCount = 0;
      const callback = () => { callCount++; };
      
      processor.debouncedProcess('test1', callback);
      processor.debouncedProcess('test2', callback);
      processor.debouncedProcess('test3', callback);
      
      setTimeout(() => {
        expect(callCount).toBe(1); // Only first call should execute
        done();
      }, 100);
    });

    it('should support both debounce strategy', (done) => {
      const bothConfig = {
        ...defaultConfig,
        debounceMs: 30,
        debounceStrategy: 'both' as const
      };
      
      const processor = new QueryProcessor(bothConfig);
      let callCount = 0;
      const callback = () => { callCount++; };
      
      processor.debouncedProcess('test1', callback);
      
      setTimeout(() => {
        processor.debouncedProcess('test2', callback);
      }, 10);
      
      setTimeout(() => {
        expect(callCount).toBe(2); // Both leading and trailing should execute
        done();
      }, 80);
    });

    it('should support cancelling pending operations', () => {
      const processor = new QueryProcessor({
        ...defaultConfig,
        debounceMs: 100
      });
      
      let callCount = 0;
      const callback = () => { callCount++; };
      
      processor.debouncedProcess('test', callback);
      processor.cancelPendingOperations();
      
      setTimeout(() => {
        expect(callCount).toBe(0); // Should not execute after cancellation
      }, 150);
    });
  });

  describe('Trigger Modes (AC 3)', () => {
    it('should support change trigger mode', () => {
      const processor = new QueryProcessor({
        ...defaultConfig,
        triggerOn: 'change'
      });
      
      expect(processor.shouldTriggerSearch('test', 'change')).toBe(true);
      expect(processor.shouldTriggerSearch('test', 'enter')).toBe(false);
    });

    it('should support enter trigger mode', () => {
      const processor = new QueryProcessor({
        ...defaultConfig,
        triggerOn: 'enter'
      });
      
      expect(processor.shouldTriggerSearch('test', 'change')).toBe(false);
      expect(processor.shouldTriggerSearch('test', 'enter')).toBe(true);
    });

    it('should support both trigger modes', () => {
      const processor = new QueryProcessor({
        ...defaultConfig,
        triggerOn: 'both'
      });
      
      expect(processor.shouldTriggerSearch('test', 'change')).toBe(true);
      expect(processor.shouldTriggerSearch('test', 'enter')).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should process queries with all features enabled', () => {
      const fullFeaturesConfig = {
        ...defaultConfig,
        enableSecurityValidation: true,
        enablePerformanceMonitoring: true,
        enableStemming: true,
        enablePreprocessing: true,
        customValidators: [
          {
            name: 'no-profanity',
            validator: (query: string) => !query.includes('badword'),
            errorMessage: 'Profanity not allowed'
          }
        ]
      };
      
      const processor = new QueryProcessor(fullFeaturesConfig);
      const result = processor.processQuery('searching for information...');
      
      expect(result.isValid).toBe(true);
      expect(result.securityInfo).toBeDefined();
      expect(result.metadata.performanceId).toBeDefined();
      expect(result.metadata.validationRulesApplied).toContain('security-validation');
      expect(result.metadata.validationRulesApplied).toContain('normalization');
    });
  });
});