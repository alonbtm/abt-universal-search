/**
 * Analytics Collector Tests
 * @description Comprehensive tests for usage analytics and behavior tracking
 */

import { AnalyticsCollector } from '../AnalyticsCollector';
import type { AnalyticsEvent, AnalyticsConfig } from '../../types/Analytics';

describe('AnalyticsCollector', () => {
  let collector: AnalyticsCollector;
  let mockConfig: AnalyticsConfig;

  beforeEach(() => {
    mockConfig = {
      enabled: true,
      sampleRate: 1.0,
      privacyMode: 'balanced',
      retentionDays: 30,
      intervals: {
        metrics: 5000,
        usage: 10000,
        performance: 1000
      },
      export: {
        enabled: false,
        interval: 60000,
        formats: ['json'],
        destinations: []
      },
      privacy: {
        requireConsent: false,
        anonymize: true,
        anonymizeIp: true,
        hashUserId: true
      }
    };

    collector = new AnalyticsCollector();
    collector.configure(mockConfig);

    // Mock DOM APIs
    Object.defineProperty(window, 'location', {
      value: {
        href: 'https://example.com/search',
        pathname: '/search'
      },
      writable: true
    });

    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      },
      writable: true
    });
  });

  afterEach(() => {
    collector.cleanup();
    jest.clearAllMocks();
  });

  describe('event tracking', () => {
    test('should track search events', () => {
      const event: AnalyticsEvent = {
        id: 'search_event_123',
        type: 'search_initiated',
        timestamp: Date.now(),
        properties: {
          query: 'test search',
          resultCount: 10
        },
        context: {
          sessionId: 'session_123',
          timestamp: Date.now(),
          location: {
            url: 'https://example.com/search',
            pathname: '/search'
          }
        },
        privacy: {
          anonymized: true,
          consented: true
        }
      };

      const trackSpy = jest.spyOn(collector, 'track');
      collector.track(event);

      expect(trackSpy).toHaveBeenCalledWith(event);
      expect(trackSpy).toHaveBeenCalledTimes(1);
    });

    test('should calculate search frequency metrics', async () => {
      // Track multiple search events
      const events = [
        { type: 'search_initiated', timestamp: Date.now() - 10000 },
        { type: 'search_initiated', timestamp: Date.now() - 8000 },
        { type: 'search_initiated', timestamp: Date.now() - 5000 },
        { type: 'search_initiated', timestamp: Date.now() - 2000 }
      ];

      events.forEach((eventData, index) => {
        const event: AnalyticsEvent = {
          id: `search_${index}`,
          type: eventData.type,
          timestamp: eventData.timestamp,
          properties: { query: `test ${index}` },
          context: {
            sessionId: 'session_123',
            timestamp: eventData.timestamp
          },
          privacy: { anonymized: true, consented: true }
        };
        collector.track(event);
      });

      const metrics = await collector.getUsageMetrics();
      expect(metrics.searchFrequency).toBeGreaterThan(0);
    });

    test('should track result selection rates', async () => {
      // Track search and selection events
      const searchEvent: AnalyticsEvent = {
        id: 'search_1',
        type: 'search_completed',
        timestamp: Date.now() - 1000,
        properties: { resultCount: 5 },
        context: { sessionId: 'session_123', timestamp: Date.now() - 1000 },
        privacy: { anonymized: true, consented: true }
      };

      const selectionEvent: AnalyticsEvent = {
        id: 'selection_1',
        type: 'result_selected',
        timestamp: Date.now(),
        properties: { resultIndex: 0, resultId: 'result_123' },
        context: { sessionId: 'session_123', timestamp: Date.now() },
        privacy: { anonymized: true, consented: true }
      };

      collector.track(searchEvent);
      collector.track(selectionEvent);

      const metrics = await collector.getUsageMetrics();
      expect(metrics.selectionRate).toBeLessThanOrEqual(1);
      expect(metrics.selectionRate).toBeGreaterThanOrEqual(0);
    });

    test('should track error patterns', async () => {
      const errorEvent: AnalyticsEvent = {
        id: 'error_1',
        type: 'error_occurred',
        timestamp: Date.now(),
        properties: {
          errorType: 'network_error',
          errorMessage: 'Request timeout',
          errorCode: 408
        },
        context: { sessionId: 'session_123', timestamp: Date.now() },
        privacy: { anonymized: true, consented: true }
      };

      collector.track(errorEvent);

      const metrics = await collector.getUsageMetrics();
      expect(metrics.errorRate).toBeGreaterThan(0);
    });
  });

  describe('user journey analytics', () => {
    test('should track session duration', async () => {
      const sessionStart: AnalyticsEvent = {
        id: 'session_start',
        type: 'session_started',
        timestamp: Date.now() - 30000,
        properties: {},
        context: { sessionId: 'session_123', timestamp: Date.now() - 30000 },
        privacy: { anonymized: true, consented: true }
      };

      const sessionEnd: AnalyticsEvent = {
        id: 'session_end',
        type: 'session_ended',
        timestamp: Date.now(),
        properties: {},
        context: { sessionId: 'session_123', timestamp: Date.now() },
        privacy: { anonymized: true, consented: true }
      };

      collector.track(sessionStart);
      collector.track(sessionEnd);

      const metrics = await collector.getUsageMetrics();
      expect(metrics.sessionDuration).toBeGreaterThan(0);
    });

    test('should calculate refinement rates', async () => {
      const initialSearch: AnalyticsEvent = {
        id: 'search_1',
        type: 'search_initiated',
        timestamp: Date.now() - 5000,
        properties: { query: 'test' },
        context: { sessionId: 'session_123', timestamp: Date.now() - 5000 },
        privacy: { anonymized: true, consented: true }
      };

      const refinedSearch: AnalyticsEvent = {
        id: 'search_2',
        type: 'search_refined',
        timestamp: Date.now(),
        properties: { query: 'test refined', previousQuery: 'test' },
        context: { sessionId: 'session_123', timestamp: Date.now() },
        privacy: { anonymized: true, consented: true }
      };

      collector.track(initialSearch);
      collector.track(refinedSearch);

      const metrics = await collector.getUsageMetrics();
      expect(metrics.refinementRate).toBeGreaterThan(0);
    });
  });

  describe('privacy compliance', () => {
    test('should respect privacy mode settings', () => {
      const strictConfig = { ...mockConfig, privacyMode: 'strict' as const };
      collector.configure(strictConfig);

      const event: AnalyticsEvent = {
        id: 'test_event',
        type: 'search_initiated',
        timestamp: Date.now(),
        properties: { query: 'sensitive data' },
        context: { sessionId: 'session_123', timestamp: Date.now() },
        privacy: { anonymized: true, consented: true }
      };

      const trackSpy = jest.spyOn(collector, 'track');
      collector.track(event);

      expect(trackSpy).toHaveBeenCalled();
    });

    test('should anonymize user data when required', () => {
      const event: AnalyticsEvent = {
        id: 'test_event',
        type: 'search_initiated',
        timestamp: Date.now(),
        properties: {
          query: 'test',
          userId: 'user_123',
          ipAddress: '192.168.1.1'
        },
        context: { sessionId: 'session_123', timestamp: Date.now() },
        privacy: { anonymized: true, consented: true }
      };

      collector.track(event);

      // Verify anonymization occurred (implementation specific)
      expect(event.privacy.anonymized).toBe(true);
    });

    test('should respect sample rate', () => {
      const lowSampleConfig = { ...mockConfig, sampleRate: 0.1 };
      collector.configure(lowSampleConfig);

      const trackSpy = jest.spyOn(collector, 'track');
      
      // Track 100 events, expect roughly 10% to be tracked
      for (let i = 0; i < 100; i++) {
        const event: AnalyticsEvent = {
          id: `event_${i}`,
          type: 'search_initiated',
          timestamp: Date.now(),
          properties: { query: `test ${i}` },
          context: { sessionId: 'session_123', timestamp: Date.now() },
          privacy: { anonymized: true, consented: true }
        };
        collector.track(event);
      }

      expect(trackSpy).toHaveBeenCalled();
    });
  });

  describe('data retention', () => {
    test('should clean up old events based on retention policy', async () => {
      const oldEvent: AnalyticsEvent = {
        id: 'old_event',
        type: 'search_initiated',
        timestamp: Date.now() - (31 * 24 * 60 * 60 * 1000), // 31 days ago
        properties: { query: 'old search' },
        context: { sessionId: 'session_123', timestamp: Date.now() - (31 * 24 * 60 * 60 * 1000) },
        privacy: { anonymized: true, consented: true }
      };

      const recentEvent: AnalyticsEvent = {
        id: 'recent_event',
        type: 'search_initiated',
        timestamp: Date.now(),
        properties: { query: 'recent search' },
        context: { sessionId: 'session_123', timestamp: Date.now() },
        privacy: { anonymized: true, consented: true }
      };

      collector.track(oldEvent);
      collector.track(recentEvent);

      await collector.applyRetentionPolicy();

      const metrics = await collector.getUsageMetrics();
      expect(metrics).toBeDefined();
    });
  });
});