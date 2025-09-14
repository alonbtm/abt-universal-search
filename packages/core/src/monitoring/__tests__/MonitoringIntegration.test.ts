/**
 * Monitoring Integration Tests
 * @description Integration tests for the complete monitoring and analytics pipeline
 */

import { PerformanceTracker } from '../PerformanceTracker';
import { AnalyticsCollector } from '../AnalyticsCollector';
import { BrowserProfiler } from '../BrowserProfiler';
import { ExperimentManager } from '../ExperimentManager';
import { PrivacyManager } from '../PrivacyManager';
import { MetricsExporter } from '../MetricsExporter';
import type { AnalyticsConfig } from '../../types/Analytics';
import type { PrivacyConfig } from '../../types/Privacy';

describe('Monitoring Integration', () => {
  let performanceTracker: PerformanceTracker;
  let analyticsCollector: AnalyticsCollector;
  let browserProfiler: BrowserProfiler;
  let experimentManager: ExperimentManager;
  let privacyManager: PrivacyManager;
  let metricsExporter: MetricsExporter;

  beforeEach(async () => {
    // Initialize all monitoring components
    performanceTracker = new PerformanceTracker();
    analyticsCollector = new AnalyticsCollector();
    browserProfiler = new BrowserProfiler();
    experimentManager = new ExperimentManager();
    privacyManager = new PrivacyManager();
    metricsExporter = new MetricsExporter();

    // Configure components
    const analyticsConfig: AnalyticsConfig = {
      enabled: true,
      sampleRate: 1.0,
      privacyMode: 'balanced',
      retentionDays: 30,
      intervals: {
        metrics: 1000,
        usage: 2000,
        performance: 500
      },
      export: {
        enabled: true,
        interval: 5000,
        formats: ['json', 'prometheus'],
        destinations: ['local']
      },
      privacy: {
        requireConsent: true,
        anonymize: true,
        anonymizeIp: true,
        hashUserId: true
      }
    };

    const privacyConfig: PrivacyConfig = {
      regulations: ['GDPR'],
      requireConsent: true,
      consentExpirationDays: 365,
      retention: {
        retentionDays: 30,
        autoDelete: true,
        archiveBeforeDelete: false,
        minRetentionDays: 1,
        maxRetentionDays: 365,
        purposeSpecific: {
          necessary: 365,
          analytics: 30,
          performance: 90,
          functional: 180,
          targeting: 30,
          social: 30,
          security: 365
        }
      },
      anonymization: {
        enabled: true,
        anonymizeIp: true,
        hashUserIds: true,
        pseudonymize: true
      },
      dataSubjectRights: {
        access: true,
        rectification: true,
        erasure: true,
        portability: true,
        restriction: true,
        objection: true
      },
      dataTransfer: {
        allowInternational: false,
        mechanisms: ['standard_clauses'],
        approvedDestinations: ['EU']
      }
    };

    await analyticsCollector.configure(analyticsConfig);
    await privacyManager.init(privacyConfig);

    // Mock browser APIs
    global.performance = {
      now: jest.fn(() => Date.now()),
      mark: jest.fn(),
      measure: jest.fn(),
      getEntriesByType: jest.fn(() => []),
      memory: {
        usedJSHeapSize: 10000000,
        totalJSHeapSize: 20000000,
        jsHeapSizeLimit: 100000000
      }
    } as any;

    global.navigator = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0',
      hardwareConcurrency: 8,
      deviceMemory: 8
    } as any;
  });

  afterEach(() => {
    performanceTracker.cleanup();
    analyticsCollector.cleanup();
    browserProfiler.cleanup();
    experimentManager.cleanup();
    privacyManager.cleanup();
    metricsExporter.cleanup();
  });

  describe('end-to-end search analytics flow', () => {
    test('should track complete search workflow with privacy compliance', async () => {
      const userId = 'user_e2e_test';
      const sessionId = 'session_e2e_test';

      // 1. Record user consent
      await privacyManager.recordConsent({
        userId,
        purpose: 'analytics',
        status: 'granted',
        source: 'explicit',
        legalBasis: 'consent',
        details: {
          userAgent: 'Test Browser',
          mechanism: 'checkbox'
        }
      });

      // 2. Start performance measurement
      const performanceId = performanceTracker.startMeasurement('search_query', {
        userId,
        sessionId,
        query: 'test search'
      });

      // 3. Track analytics event
      analyticsCollector.track({
        id: 'search_initiated',
        type: 'search_initiated',
        timestamp: Date.now(),
        properties: {
          query: 'test search',
          userId
        },
        context: {
          sessionId,
          timestamp: Date.now()
        },
        privacy: {
          anonymized: true,
          consented: true
        }
      });

      // 4. Record browser performance
      browserProfiler.recordPerformance({
        responseTime: 150,
        renderTime: 20,
        interactionLatency: 30,
        frameRate: 60
      });

      // 5. Complete performance measurement
      performanceTracker.endMeasurement(performanceId, true, {
        resultCount: 10,
        cacheStatus: 'miss'
      });

      // 6. Track result selection
      analyticsCollector.track({
        id: 'result_selected',
        type: 'result_selected',
        timestamp: Date.now(),
        properties: {
          resultIndex: 0,
          resultId: 'result_123',
          userId
        },
        context: {
          sessionId,
          timestamp: Date.now()
        },
        privacy: {
          anonymized: true,
          consented: true
        }
      });

      // 7. Export metrics
      const exportedMetrics = await metricsExporter.export('json', {
        start: Date.now() - 60000,
        end: Date.now()
      });

      // Verify the complete flow
      expect(exportedMetrics).toBeDefined();
      const metrics = JSON.parse(exportedMetrics);
      expect(metrics.performance).toBeDefined();
      expect(metrics.analytics).toBeDefined();

      // Verify privacy compliance
      const consentStatus = await privacyManager.checkConsent(userId, 'analytics');
      expect(consentStatus).toBe('granted');
    });

    test('should handle A/B testing with performance tracking', async () => {
      // Create experiment
      const experimentConfig = {
        id: 'search_algorithm_ab_test',
        name: 'Search Algorithm A/B Test',
        description: 'Testing new search algorithm performance',
        variations: [
          {
            id: 'control',
            name: 'Current Algorithm',
            allocation: 0.5,
            config: { algorithm: 'current' }
          },
          {
            id: 'optimized',
            name: 'Optimized Algorithm',
            allocation: 0.5,
            config: { algorithm: 'optimized' }
          }
        ],
        allocation: {
          splits: { control: 0.5, optimized: 0.5 },
          method: 'random' as const
        },
        metrics: [
          {
            name: 'response_time',
            type: 'numeric',
            goal: 'minimize',
            primaryMetric: true
          }
        ],
        duration: {
          startTime: Date.now(),
          endTime: Date.now() + (7 * 24 * 60 * 60 * 1000),
          minSampleSize: 100
        },
        statistics: {
          confidenceLevel: 0.95,
          minimumDetectableEffect: 0.1,
          power: 0.8
        }
      };

      experimentManager.createExperiment(experimentConfig);
      experimentManager.startExperiment('search_algorithm_ab_test');

      // Simulate users in both variations
      for (let i = 0; i < 50; i++) {
        const userId = `user_ab_${i}`;
        const assignment = experimentManager.assignUserToVariation('search_algorithm_ab_test', userId);
        
        if (assignment) {
          // Record consent
          await privacyManager.recordConsent({
            userId,
            purpose: 'analytics',
            status: 'granted',
            source: 'explicit',
            legalBasis: 'consent',
            details: {
              userAgent: 'Test Browser',
              mechanism: 'checkbox'
            }
          });

          // Simulate different performance based on variation
          const baseResponseTime = assignment.variationId === 'control' ? 200 : 150;
          const responseTime = baseResponseTime + Math.random() * 50;

          // Track performance
          const performanceId = performanceTracker.startMeasurement('search_query', {
            userId,
            experimentId: 'search_algorithm_ab_test',
            variationId: assignment.variationId
          });

          performanceTracker.endMeasurement(performanceId, true, {
            resultCount: Math.floor(Math.random() * 20) + 5
          });

          // Track experiment metric
          experimentManager.trackMetric(
            'search_algorithm_ab_test',
            assignment.variationId,
            'response_time',
            responseTime
          );

          // Track analytics
          analyticsCollector.track({
            id: `search_${i}`,
            type: 'search_completed',
            timestamp: Date.now(),
            properties: {
              userId,
              experimentId: 'search_algorithm_ab_test',
              variationId: assignment.variationId,
              responseTime
            },
            context: {
              sessionId: `session_${i}`,
              timestamp: Date.now()
            },
            privacy: {
              anonymized: true,
              consented: true
            }
          });
        }
      }

      // Analyze experiment results
      const results = experimentManager.getExperimentResults('search_algorithm_ab_test');
      expect(results?.variations.control.metrics.response_time.count).toBeGreaterThan(0);
      expect(results?.variations.optimized.metrics.response_time.count).toBeGreaterThan(0);

      // Check if optimized version is performing better
      const controlMean = results?.variations.control.metrics.response_time.mean || 0;
      const optimizedMean = results?.variations.optimized.metrics.response_time.mean || 0;
      expect(optimizedMean).toBeLessThan(controlMean);
    });
  });

  describe('privacy-compliant data pipeline', () => {
    test('should respect user consent throughout the pipeline', async () => {
      const userId = 'user_privacy_test';

      // Initially no consent
      let consentStatus = await privacyManager.checkConsent(userId, 'analytics');
      expect(['denied', 'pending', 'not_required']).toContain(consentStatus);

      // Track event without consent - should be filtered
      analyticsCollector.track({
        id: 'test_no_consent',
        type: 'search_initiated',
        timestamp: Date.now(),
        properties: { userId },
        context: {
          sessionId: 'session_no_consent',
          timestamp: Date.now()
        },
        privacy: {
          anonymized: true,
          consented: false
        }
      });

      // Grant consent
      await privacyManager.recordConsent({
        userId,
        purpose: 'analytics',
        status: 'granted',
        source: 'explicit',
        legalBasis: 'consent',
        details: {
          userAgent: 'Test Browser',
          mechanism: 'checkbox'
        }
      });

      consentStatus = await privacyManager.checkConsent(userId, 'analytics');
      expect(consentStatus).toBe('granted');

      // Track event with consent - should be processed
      analyticsCollector.track({
        id: 'test_with_consent',
        type: 'search_initiated',
        timestamp: Date.now(),
        properties: { userId },
        context: {
          sessionId: 'session_with_consent',
          timestamp: Date.now()
        },
        privacy: {
          anonymized: true,
          consented: true
        }
      });

      // Withdraw consent
      await privacyManager.withdrawConsent(userId, 'analytics');

      consentStatus = await privacyManager.checkConsent(userId, 'analytics');
      expect(consentStatus).toBe('withdrawn');

      // Subsequent events should be filtered again
      analyticsCollector.track({
        id: 'test_after_withdrawal',
        type: 'search_initiated',
        timestamp: Date.now(),
        properties: { userId },
        context: {
          sessionId: 'session_after_withdrawal',
          timestamp: Date.now()
        },
        privacy: {
          anonymized: true,
          consented: false
        }
      });
    });

    test('should anonymize data consistently across components', () => {
      const testData = {
        userId: 'user_anonymization_test',
        ipAddress: '192.168.1.100',
        email: 'test@example.com',
        searchQuery: 'sensitive query',
        timestamp: Date.now()
      };

      // Anonymize through privacy manager
      const anonymizedByPrivacy = privacyManager.anonymizeData(testData);

      // Anonymize through analytics collector
      const anonymizedByAnalytics = analyticsCollector.anonymizeData(testData);

      // Both should produce consistent anonymization
      expect(anonymizedByPrivacy.userId).toBe(anonymizedByAnalytics.userId);
      expect(anonymizedByPrivacy.email).toBeUndefined();
      expect(anonymizedByAnalytics.email).toBeUndefined();
      expect(anonymizedByPrivacy.searchQuery).toBe(testData.searchQuery);
      expect(anonymizedByAnalytics.searchQuery).toBe(testData.searchQuery);
    });
  });

  describe('performance correlation and optimization', () => {
    test('should correlate browser capabilities with performance metrics', async () => {
      const browserInfo = browserProfiler.getBrowserInfo();
      const deviceCapabilities = browserProfiler.getDeviceCapabilities();

      // Record performance data for different device types
      const performanceData = [
        { responseTime: 100, renderTime: 16, device: 'high-end' },
        { responseTime: 200, renderTime: 33, device: 'mid-range' },
        { responseTime: 400, renderTime: 50, device: 'low-end' }
      ];

      performanceData.forEach((data, index) => {
        const measurementId = performanceTracker.startMeasurement('search_query', {
          deviceType: data.device,
          browserName: browserInfo.name
        });

        performanceTracker.endMeasurement(measurementId, true, {
          resultCount: 10,
          frameRate: 1000 / data.renderTime
        });

        browserProfiler.recordPerformance({
          responseTime: data.responseTime,
          renderTime: data.renderTime,
          interactionLatency: 30,
          frameRate: 1000 / data.renderTime
        });
      });

      // Get performance correlation
      const correlation = await browserProfiler.getPerformanceCorrelation();
      expect(correlation.deviceScore).toBeGreaterThan(0);
      expect(correlation.browserScore).toBeGreaterThan(0);

      // Get optimization recommendations
      const recommendations = browserProfiler.getOptimizationRecommendations({
        hardware: { cores: 2, memory: 4 },
        network: { effectiveType: '3g' }
      });

      expect(recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('metrics export and reporting', () => {
    test('should export comprehensive metrics in multiple formats', async () => {
      // Generate some test data
      const userId = 'user_export_test';
      
      // Record consent
      await privacyManager.recordConsent({
        userId,
        purpose: 'analytics',
        status: 'granted',
        source: 'explicit',
        legalBasis: 'consent',
        details: {
          userAgent: 'Test Browser',
          mechanism: 'checkbox'
        }
      });

      // Track performance
      const performanceId = performanceTracker.startMeasurement('search_query');
      performanceTracker.endMeasurement(performanceId, true, {
        resultCount: 15,
        cacheStatus: 'hit'
      });

      // Track analytics
      analyticsCollector.track({
        id: 'export_test_event',
        type: 'search_completed',
        timestamp: Date.now(),
        properties: { userId, resultCount: 15 },
        context: {
          sessionId: 'export_test_session',
          timestamp: Date.now()
        },
        privacy: {
          anonymized: true,
          consented: true
        }
      });

      // Export in different formats
      const jsonExport = await metricsExporter.export('json', {
        start: Date.now() - 60000,
        end: Date.now()
      });

      const csvExport = await metricsExporter.export('csv', {
        start: Date.now() - 60000,
        end: Date.now()
      });

      const prometheusExport = await metricsExporter.export('prometheus', {
        start: Date.now() - 60000,
        end: Date.now()
      });

      // Verify exports
      expect(jsonExport).toBeDefined();
      expect(csvExport).toBeDefined();
      expect(prometheusExport).toBeDefined();

      // JSON should be valid JSON
      expect(() => JSON.parse(jsonExport)).not.toThrow();

      // CSV should contain headers
      expect(csvExport).toContain(',');

      // Prometheus should contain metrics
      expect(prometheusExport).toContain('# HELP');
    });
  });

  describe('error handling and resilience', () => {
    test('should handle component failures gracefully', async () => {
      // Simulate analytics collector failure
      jest.spyOn(analyticsCollector, 'track').mockImplementation(() => {
        throw new Error('Analytics service unavailable');
      });

      // Should not break the overall system
      expect(() => {
        analyticsCollector.track({
          id: 'error_test',
          type: 'search_initiated',
          timestamp: Date.now(),
          properties: {},
          context: {
            sessionId: 'error_session',
            timestamp: Date.now()
          },
          privacy: {
            anonymized: true,
            consented: true
          }
        });
      }).toThrow();

      // Other components should still work
      const performanceId = performanceTracker.startMeasurement('search_query');
      const measurement = performanceTracker.endMeasurement(performanceId, true);

      expect(measurement).toBeDefined();
      expect(measurement.success).toBe(true);
    });
  });
});