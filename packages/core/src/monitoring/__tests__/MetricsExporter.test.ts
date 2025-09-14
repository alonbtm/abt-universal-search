import { MetricsExporter, MetricsExportOptions, DashboardMetrics, AlertRule } from '../MetricsExporter';

describe('MetricsExporter', () => {
  let exporter: MetricsExporter;
  let mockPerformanceTracker: any;
  let mockAnalyticsCollector: any;
  let mockBrowserProfiler: any;
  let mockExperimentManager: any;
  let mockPrivacyManager: any;

  beforeEach(() => {
    mockPerformanceTracker = {
      getMetricsSummary: jest.fn(() => Promise.resolve({
        averageResponseTime: 150,
        averageRenderTime: 75,
        averageInteractionLatency: 25,
        averageFPS: 58,
        memoryUsage: 45000000,
        cacheHitRate: 0.82
      }))
    };

    mockAnalyticsCollector = {
      getAnalyticsSummary: jest.fn(() => Promise.resolve({
        activeUsers: 1250,
        pageViews: 8500,
        searchQueries: 3200,
        conversionRate: 0.15,
        bounceRate: 0.32,
        averageSessionDuration: 420
      }))
    };

    mockBrowserProfiler = {
      getCurrentProfile: jest.fn(() => Promise.resolve({
        compatibilityScore: 88,
        performanceScore: 92,
        recommendations: ['enable-webgl', 'optimize-images']
      }))
    };

    mockExperimentManager = {
      getExperimentSummary: jest.fn(() => Promise.resolve({
        activeCount: 5,
        completedCount: 12,
        significantResults: 8
      }))
    };

    mockPrivacyManager = {
      getPrivacyMetrics: jest.fn(() => Promise.resolve({
        consentRate: 0.94,
        dataProcessed: 125000,
        complianceScore: 98
      }))
    };

    exporter = new MetricsExporter(
      mockPerformanceTracker,
      mockAnalyticsCollector,
      mockBrowserProfiler,
      mockExperimentManager,
      mockPrivacyManager
    );

    // Mock WebSocket
    global.WebSocket = jest.fn(() => ({
      send: jest.fn(),
      close: jest.fn(),
      on: jest.fn()
    })) as any;

    // Mock fetch
    global.fetch = jest.fn(() => 
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK'
      } as Response)
    );
  });

  afterEach(() => {
    exporter.dispose();
    jest.clearAllMocks();
  });

  describe('metrics collection', () => {
    test('should collect comprehensive dashboard metrics', async () => {
      const options: MetricsExportOptions = {
        format: { format: 'json' },
        destination: { type: 'file', endpoint: '/tmp/metrics.json' }
      };

      await exporter.exportMetrics(options);

      expect(mockPerformanceTracker.getMetricsSummary).toHaveBeenCalled();
      expect(mockAnalyticsCollector.getAnalyticsSummary).toHaveBeenCalled();
      expect(mockBrowserProfiler.getCurrentProfile).toHaveBeenCalled();
      expect(mockExperimentManager.getExperimentSummary).toHaveBeenCalled();
      expect(mockPrivacyManager.getPrivacyMetrics).toHaveBeenCalled();
    });

    test('should apply time range filters', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600000);
      
      const options: MetricsExportOptions = {
        format: { format: 'json' },
        destination: { type: 'file', endpoint: '/tmp/metrics.json' },
        filter: {
          timeRange: {
            start: oneHourAgo,
            end: now
          }
        }
      };

      await exporter.exportMetrics(options);
      
      // Metrics should be collected within the time range
      expect(mockPerformanceTracker.getMetricsSummary).toHaveBeenCalled();
    });

    test('should apply threshold filters', async () => {
      const options: MetricsExportOptions = {
        format: { format: 'json' },
        destination: { type: 'file', endpoint: '/tmp/metrics.json' },
        filter: {
          threshold: {
            metric: 'performance.responseTime',
            operator: '>',
            value: 100
          }
        }
      };

      await exporter.exportMetrics(options);
      expect(mockPerformanceTracker.getMetricsSummary).toHaveBeenCalled();
    });
  });

  describe('export formats', () => {
    let sampleMetrics: DashboardMetrics;

    beforeEach(() => {
      sampleMetrics = {
        timestamp: new Date('2024-01-01T12:00:00Z'),
        performance: {
          responseTime: 150,
          renderTime: 75,
          interactionLatency: 25,
          fps: 58,
          memoryUsage: 45000000,
          cacheHitRate: 0.82
        },
        usage: {
          activeUsers: 1250,
          pageViews: 8500,
          searchQueries: 3200,
          conversionRate: 0.15,
          bounceRate: 0.32,
          sessionDuration: 420
        },
        browser: {
          compatibilityScore: 88,
          performanceScore: 92,
          recommendations: ['enable-webgl', 'optimize-images']
        },
        experiments: {
          activeExperiments: 5,
          completedTests: 12,
          significantResults: 8
        },
        privacy: {
          consentRate: 0.94,
          dataProcessed: 125000,
          complianceScore: 98
        }
      };
    });

    test('should export to JSON format', async () => {
      const options: MetricsExportOptions = {
        format: { format: 'json' },
        destination: { type: 'file', endpoint: '/tmp/metrics.json' }
      };

      await exporter.exportMetrics(options);
      
      // Verify JSON format structure
      expect(mockPerformanceTracker.getMetricsSummary).toHaveBeenCalled();
    });

    test('should export to CSV format', async () => {
      const options: MetricsExportOptions = {
        format: { format: 'csv' },
        destination: { type: 'file', endpoint: '/tmp/metrics.csv' }
      };

      await exporter.exportMetrics(options);
      expect(mockPerformanceTracker.getMetricsSummary).toHaveBeenCalled();
    });

    test('should export to Prometheus format', async () => {
      const options: MetricsExportOptions = {
        format: { format: 'prometheus' },
        destination: { type: 'file', endpoint: '/tmp/metrics.prom' }
      };

      await exporter.exportMetrics(options);
      expect(mockPerformanceTracker.getMetricsSummary).toHaveBeenCalled();
    });

    test('should export to Elasticsearch format', async () => {
      const options: MetricsExportOptions = {
        format: { format: 'elasticsearch' },
        destination: { type: 'http', endpoint: 'http://localhost:9200/_bulk' }
      };

      await exporter.exportMetrics(options);
      expect(mockPerformanceTracker.getMetricsSummary).toHaveBeenCalled();
    });
  });

  describe('export destinations', () => {
    test('should export to HTTP endpoint', async () => {
      const options: MetricsExportOptions = {
        format: { format: 'json' },
        destination: {
          type: 'http',
          endpoint: 'https://api.example.com/metrics',
          authentication: {
            type: 'bearer',
            credentials: { token: 'test-token' }
          }
        }
      };

      await exporter.exportMetrics(options);

      expect(fetch).toHaveBeenCalledWith(
        'https://api.example.com/metrics',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );
    });

    test('should handle HTTP export failures', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const options: MetricsExportOptions = {
        format: { format: 'json' },
        destination: { type: 'http', endpoint: 'https://api.example.com/metrics' }
      };

      await expect(exporter.exportMetrics(options)).rejects.toThrow('HTTP export failed: 500 Internal Server Error');
    });

    test('should support basic authentication', async () => {
      const options: MetricsExportOptions = {
        format: { format: 'json' },
        destination: {
          type: 'http',
          endpoint: 'https://api.example.com/metrics',
          authentication: {
            type: 'basic',
            credentials: { username: 'user', password: 'pass' }
          }
        }
      };

      await exporter.exportMetrics(options);

      expect(fetch).toHaveBeenCalledWith(
        'https://api.example.com/metrics',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringMatching(/^Basic /)
          })
        })
      );
    });
  });

  describe('scheduled exports', () => {
    test('should schedule recurring exports', async () => {
      jest.useFakeTimers();

      const options: MetricsExportOptions = {
        format: { format: 'json' },
        destination: { type: 'file', endpoint: '/tmp/metrics.json' },
        schedule: {
          cron: '0 * * * *', // Every hour
          timezone: 'UTC'
        }
      };

      await exporter.scheduleExport('hourly-export', options);

      // Fast forward time
      jest.advanceTimersByTime(3600000); // 1 hour

      expect(mockPerformanceTracker.getMetricsSummary).toHaveBeenCalled();

      jest.useRealTimers();
    });

    test('should cancel scheduled exports', async () => {
      const options: MetricsExportOptions = {
        format: { format: 'json' },
        destination: { type: 'file', endpoint: '/tmp/metrics.json' },
        schedule: {
          cron: '0 * * * *',
          timezone: 'UTC'
        }
      };

      await exporter.scheduleExport('test-export', options);
      exporter.cancelScheduledExport('test-export');

      // Should not throw error for non-existent export
      exporter.cancelScheduledExport('non-existent');
    });
  });

  describe('streaming exports', () => {
    test('should start streaming metrics', async () => {
      const options: MetricsExportOptions = {
        format: { format: 'json' },
        destination: { type: 'stream', endpoint: 'ws://localhost:8080/metrics' },
        streaming: {
          enabled: true,
          bufferSize: 10,
          flushInterval: 1000,
          backpressure: {
            enabled: true,
            maxBuffer: 100,
            dropStrategy: 'oldest'
          }
        }
      };

      await exporter.startStreaming('test-stream', options);

      expect(WebSocket).toHaveBeenCalledWith('ws://localhost:8080/metrics');
    });

    test('should stop streaming metrics', async () => {
      const mockWs = {
        send: jest.fn(),
        close: jest.fn(),
        on: jest.fn()
      };
      (global.WebSocket as jest.Mock).mockReturnValueOnce(mockWs);

      const options: MetricsExportOptions = {
        format: { format: 'json' },
        destination: { type: 'stream', endpoint: 'ws://localhost:8080/metrics' },
        streaming: {
          enabled: true,
          bufferSize: 10,
          flushInterval: 1000,
          backpressure: {
            enabled: true,
            maxBuffer: 100,
            dropStrategy: 'oldest'
          }
        }
      };

      await exporter.startStreaming('test-stream', options);
      exporter.stopStreaming('test-stream');

      expect(mockWs.close).toHaveBeenCalled();
    });
  });

  describe('alerting', () => {
    test('should add and evaluate alert rules', async () => {
      const rule: AlertRule = {
        id: 'high-response-time',
        name: 'High Response Time Alert',
        metric: 'performance.responseTime',
        condition: {
          operator: '>',
          threshold: 200
        },
        severity: 'warning',
        channels: ['email', 'slack'],
        enabled: true
      };

      exporter.addAlertRule(rule);

      const metrics: DashboardMetrics = {
        timestamp: new Date(),
        performance: {
          responseTime: 250, // Above threshold
          renderTime: 75,
          interactionLatency: 25,
          fps: 58,
          memoryUsage: 45000000,
          cacheHitRate: 0.82
        },
        usage: {
          activeUsers: 1250,
          pageViews: 8500,
          searchQueries: 3200,
          conversionRate: 0.15,
          bounceRate: 0.32,
          sessionDuration: 420
        },
        browser: {
          compatibilityScore: 88,
          performanceScore: 92,
          recommendations: []
        },
        experiments: {
          activeExperiments: 5,
          completedTests: 12,
          significantResults: 8
        },
        privacy: {
          consentRate: 0.94,
          dataProcessed: 125000,
          complianceScore: 98
        }
      };

      const notifications = await exporter.checkAlerts(metrics);

      expect(notifications).toHaveLength(1);
      expect(notifications[0].ruleId).toBe('high-response-time');
      expect(notifications[0].severity).toBe('warning');
      expect(notifications[0].currentValue).toBe(250);
    });

    test('should not trigger disabled alerts', async () => {
      const rule: AlertRule = {
        id: 'disabled-alert',
        name: 'Disabled Alert',
        metric: 'performance.responseTime',
        condition: {
          operator: '>',
          threshold: 100
        },
        severity: 'error',
        channels: ['email'],
        enabled: false
      };

      exporter.addAlertRule(rule);

      const metrics: DashboardMetrics = {
        timestamp: new Date(),
        performance: {
          responseTime: 200,
          renderTime: 75,
          interactionLatency: 25,
          fps: 58,
          memoryUsage: 45000000,
          cacheHitRate: 0.82
        },
        usage: {
          activeUsers: 1250,
          pageViews: 8500,
          searchQueries: 3200,
          conversionRate: 0.15,
          bounceRate: 0.32,
          sessionDuration: 420
        },
        browser: {
          compatibilityScore: 88,
          performanceScore: 92,
          recommendations: []
        },
        experiments: {
          activeExperiments: 5,
          completedTests: 12,
          significantResults: 8
        },
        privacy: {
          consentRate: 0.94,
          dataProcessed: 125000,
          complianceScore: 98
        }
      };

      const notifications = await exporter.checkAlerts(metrics);
      expect(notifications).toHaveLength(0);
    });

    test('should remove alert rules', () => {
      const rule: AlertRule = {
        id: 'test-rule',
        name: 'Test Rule',
        metric: 'performance.responseTime',
        condition: { operator: '>', threshold: 100 },
        severity: 'info',
        channels: ['email'],
        enabled: true
      };

      exporter.addAlertRule(rule);
      exporter.removeAlertRule('test-rule');
      
      // Rule should be removed (tested implicitly)
    });
  });

  describe('sampling strategies', () => {
    test('should apply random sampling', async () => {
      const options: MetricsExportOptions = {
        format: { format: 'json' },
        destination: { type: 'file', endpoint: '/tmp/metrics.json' },
        filter: {
          sampling: {
            rate: 0.5,
            strategy: 'random'
          }
        }
      };

      await exporter.exportMetrics(options);
      expect(mockPerformanceTracker.getMetricsSummary).toHaveBeenCalled();
    });

    test('should apply systematic sampling', async () => {
      const options: MetricsExportOptions = {
        format: { format: 'json' },
        destination: { type: 'file', endpoint: '/tmp/metrics.json' },
        filter: {
          sampling: {
            rate: 0.25,
            strategy: 'systematic'
          }
        }
      };

      await exporter.exportMetrics(options);
      expect(mockPerformanceTracker.getMetricsSummary).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('should handle export errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const options: MetricsExportOptions = {
        format: { format: 'json' },
        destination: { type: 'http', endpoint: 'https://api.example.com/metrics' }
      };

      await expect(exporter.exportMetrics(options)).rejects.toThrow('Network error');
    });

    test('should handle unsupported export formats', async () => {
      const options: MetricsExportOptions = {
        format: { format: 'xml' as any },
        destination: { type: 'file', endpoint: '/tmp/metrics.xml' }
      };

      await expect(exporter.exportMetrics(options)).rejects.toThrow('Unsupported export format: xml');
    });

    test('should handle missing schedule configuration', async () => {
      const options: MetricsExportOptions = {
        format: { format: 'json' },
        destination: { type: 'file', endpoint: '/tmp/metrics.json' }
      };

      await expect(exporter.scheduleExport('test', options))
        .rejects.toThrow('Schedule configuration required for scheduled exports');
    });

    test('should handle missing streaming configuration', async () => {
      const options: MetricsExportOptions = {
        format: { format: 'json' },
        destination: { type: 'stream', endpoint: 'ws://localhost:8080/metrics' }
      };

      await expect(exporter.startStreaming('test', options))
        .rejects.toThrow('Streaming configuration required');
    });
  });

  describe('cleanup', () => {
    test('should dispose resources properly', () => {
      jest.useFakeTimers();
      
      const mockWs = {
        send: jest.fn(),
        close: jest.fn(),
        on: jest.fn()
      };
      (global.WebSocket as jest.Mock).mockReturnValueOnce(mockWs);

      // Schedule an export and start streaming
      exporter.scheduleExport('test', {
        format: { format: 'json' },
        destination: { type: 'file', endpoint: '/tmp/test.json' },
        schedule: { cron: '* * * * *', timezone: 'UTC' }
      });

      exporter.startStreaming('test', {
        format: { format: 'json' },
        destination: { type: 'stream', endpoint: 'ws://localhost:8080' },
        streaming: { enabled: true, bufferSize: 10, flushInterval: 1000, backpressure: { enabled: false, maxBuffer: 100, dropStrategy: 'oldest' } }
      });

      exporter.dispose();

      expect(mockWs.close).toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });
});