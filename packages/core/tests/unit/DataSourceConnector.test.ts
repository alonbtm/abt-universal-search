/**
 * DataSourceConnector Unit Tests
 * Tests for data source connector architecture with comprehensive scenarios
 */

import { DataSourceConnector } from '../../src/pipeline/DataSourceConnector';
import { MemoryAdapter } from '../../src/adapters/MemoryAdapter';
import type { MemoryDataSourceConfig, APIDataSourceConfig } from '../../src/types/Config';
import type { ProcessedQuery, Connection, RawResult, SearchError } from '../../src/types/Results';
import { ValidationError } from '../../src/utils/validation';

// Mock adapter for testing
class MockAPIAdapter {
  public readonly type = 'api';
  private connections = new Map();

  async connect(config: APIDataSourceConfig): Promise<Connection> {
    if (config.url === 'http://invalid-url') {
      throw new Error('ENOTFOUND');
    }
    
    const connection: Connection = {
      id: `api-${Date.now()}`,
      adapterType: 'api',
      status: 'connected',
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      metadata: { url: config.url }
    };
    
    this.connections.set(connection.id, connection);
    return connection;
  }

  async query(_connection: Connection, query: ProcessedQuery): Promise<RawResult[]> {
    if (query.normalized === 'error-query') {
      throw new Error('Query failed');
    }
    
    return [
      {
        id: 'api-result-1',
        data: { title: `API Result for ${query.normalized}`, id: 1 },
        score: 0.9,
        matchedFields: ['title'],
        metadata: { source: 'api' }
      }
    ];
  }

  async disconnect(connection: Connection): Promise<void> {
    this.connections.delete(connection.id);
  }

  async validateConfig(config: APIDataSourceConfig): Promise<void> {
    if (!config.url) {
      throw new ValidationError('URL is required for API adapter');
    }
  }

  async healthCheck(_connection: Connection): Promise<boolean> {
    return true;
  }

  getCapabilities() {
    return {
      supportsPooling: true,
      supportsRealTime: false,
      supportsPagination: true,
      supportsSorting: true,
      supportsFiltering: true,
      maxConcurrentConnections: 50,
      supportedQueryTypes: ['text', 'structured']
    };
  }

  async destroy(): Promise<void> {
    this.connections.clear();
  }
}

describe('DataSourceConnector', () => {
  let connector: DataSourceConnector;
  let mockAPIAdapter: MockAPIAdapter;

  const testMemoryConfig: MemoryDataSourceConfig = {
    type: 'memory',
    data: [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
    ],
    searchFields: ['name', 'email']
  };

  const testAPIConfig: APIDataSourceConfig = {
    type: 'api',
    url: 'http://api.example.com/search'
  };

  const testQuery: ProcessedQuery = {
    original: 'john',
    normalized: 'john',
    isValid: true,
    metadata: {
      processingTime: 1,
      originalQuery: 'john',
      length: 4,
      trimmed: false,
      timestamp: Date.now(),
      caseNormalized: 'lowercase'
    }
  };

  beforeEach(() => {
    connector = new DataSourceConnector({
      validateInput: true,
      sanitizeQueries: true,
      rateLimitRpm: 1000,
      logSecurityEvents: false
    });
    
    mockAPIAdapter = new MockAPIAdapter();
  });

  afterEach(async () => {
    await connector.destroy();
  });

  describe('Adapter Registration', () => {
    it('should register and create adapters', () => {
      connector.registerAdapter('memory', MemoryAdapter);
      connector.registerAdapter('api', MockAPIAdapter as any);

      const types = connector.getRegisteredTypes();
      expect(types).toContain('memory');
      expect(types).toContain('api');
    });

    it('should throw error for unregistered adapter type', async () => {
      await expect(connector.connect({
        type: 'unknown',
        data: [],
        searchFields: []
      } as any)).rejects.toThrow('Unsupported data source type: unknown');
    });
  });

  describe('Connection Management', () => {
    beforeEach(() => {
      connector.registerAdapter('memory', MemoryAdapter);
      connector.registerAdapter('api', MockAPIAdapter as any);
    });

    it('should connect to memory adapter', async () => {
      const connection = await connector.connect(testMemoryConfig);
      
      expect(connection).toBeDefined();
      expect(connection.adapterType).toBe('memory');
      expect(connection.status).toBe('connected');
      expect(connection.id).toContain('memory-');
    });

    it('should connect to API adapter', async () => {
      const connection = await connector.connect(testAPIConfig);
      
      expect(connection).toBeDefined();
      expect(connection.adapterType).toBe('api');
      expect(connection.status).toBe('connected');
    });

    it('should handle connection failures', async () => {
      const invalidConfig: APIDataSourceConfig = {
        type: 'api',
        url: 'http://invalid-url'
      };

      await expect(connector.connect(invalidConfig)).rejects.toThrow();
    });

    it('should disconnect connections', async () => {
      const connection = await connector.connect(testMemoryConfig);
      await expect(connector.disconnect(connection)).resolves.not.toThrow();
    });
  });

  describe('Query Execution', () => {
    let memoryConnection: Connection;
    let apiConnection: Connection;

    beforeEach(async () => {
      connector.registerAdapter('memory', MemoryAdapter);
      connector.registerAdapter('api', MockAPIAdapter as any);
      
      memoryConnection = await connector.connect(testMemoryConfig);
      apiConnection = await connector.connect(testAPIConfig);
    });

    it('should execute query on memory adapter', async () => {
      const results = await connector.query(memoryConnection, testQuery);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('data');
      expect(results[0]).toHaveProperty('score');
      expect(results[0]).toHaveProperty('metadata');
      expect(results[0].metadata).toHaveProperty('matchedFields');
    });

    it('should execute query on API adapter', async () => {
      const results = await connector.query(apiConnection, testQuery);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].data).toHaveProperty('title');
    });

    it('should handle query failures', async () => {
      const errorQuery: ProcessedQuery = {
        ...testQuery,
        normalized: 'error-query'
      };

      await expect(connector.query(apiConnection, errorQuery)).rejects.toThrow();
    });

    it('should execute full pipeline with memory adapter', async () => {
      const results = await connector.executeQuery(testMemoryConfig, testQuery);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Configuration Validation', () => {
    beforeEach(() => {
      connector.registerAdapter('memory', MemoryAdapter);
      connector.registerAdapter('api', MockAPIAdapter as any);
    });

    it('should validate memory configuration', async () => {
      const validConfig = testMemoryConfig;
      await expect(connector.connect(validConfig)).resolves.toBeDefined();
    });

    it('should reject invalid memory configuration', async () => {
      const invalidConfig = {
        type: 'memory',
        data: 'not-an-array',
        searchFields: ['name']
      } as any;

      await expect(connector.connect(invalidConfig)).rejects.toThrow();
    });

    it('should validate API configuration', async () => {
      const validConfig = testAPIConfig;
      await expect(connector.connect(validConfig)).resolves.toBeDefined();
    });

    it('should reject configuration without type', async () => {
      const invalidConfig = {
        data: [],
        searchFields: ['name']
      } as any;

      await expect(connector.connect(invalidConfig)).rejects.toThrow('Data source type is required');
    });
  });

  describe('Security Features', () => {
    beforeEach(() => {
      connector.registerAdapter('memory', MemoryAdapter);
    });

    it('should block XSS attempts', async () => {
      const connection = await connector.connect(testMemoryConfig);
      const maliciousQuery: ProcessedQuery = {
        original: '<script>alert("xss")</script>',
        normalized: '<script>alert("xss")</script>',
        isValid: true,
        metadata: {
          processingTime: 1,
          originalQuery: '<script>alert("xss")</script>',
          length: 26,
          trimmed: false,
          timestamp: Date.now(),
          caseNormalized: 'lowercase'
        }
      };

      await expect(connector.query(connection, maliciousQuery)).rejects.toThrow(/Security threats detected/);
    });

    it('should block SQL injection attempts', async () => {
      const connection = await connector.connect(testMemoryConfig);
      const maliciousQuery: ProcessedQuery = {
        original: "'; DROP TABLE users; --",
        normalized: "'; DROP TABLE users; --",
        isValid: true,
        metadata: {
          processingTime: 1,
          originalQuery: "'; DROP TABLE users; --",
          length: 23,
          trimmed: false,
          timestamp: Date.now(),
          caseNormalized: 'lowercase'
        }
      };

      await expect(connector.query(connection, maliciousQuery)).rejects.toThrow(/Security threats detected/);
    });

    it('should allow safe queries', async () => {
      const connection = await connector.connect(testMemoryConfig);
      const safeQuery: ProcessedQuery = {
        original: 'safe query',
        normalized: 'safe query',
        isValid: true,
        metadata: {
          processingTime: 1,
          originalQuery: 'safe query',
          length: 10,
          trimmed: false,
          timestamp: Date.now(),
          caseNormalization: 'lowercase'
        }
      };

      await expect(connector.query(connection, safeQuery)).resolves.toBeDefined();
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(() => {
      connector.registerAdapter('memory', MemoryAdapter);
    });

    it('should track connection metrics', async () => {
      const connection = await connector.connect(testMemoryConfig);
      await connector.query(connection, testQuery);
      
      const metrics = connector.getPerformanceMetrics();
      expect(metrics).toBeDefined();
      expect(Array.isArray(metrics)).toBe(true);
      expect(metrics.length).toBeGreaterThan(0);
      
      const metric = metrics[0];
      expect(metric).toHaveProperty('connectionTime');
      expect(metric).toHaveProperty('queryTime');
      expect(metric).toHaveProperty('totalTime');
      expect(metric).toHaveProperty('success');
      expect(metric).toHaveProperty('resultCount');
    });

    it('should clear performance metrics', async () => {
      const connection = await connector.connect(testMemoryConfig);
      await connector.query(connection, testQuery);
      
      expect(connector.getPerformanceMetrics().length).toBeGreaterThan(0);
      
      connector.clearPerformanceMetrics();
      expect(connector.getPerformanceMetrics().length).toBe(0);
    });
  });

  describe('Connection Testing', () => {
    beforeEach(() => {
      connector.registerAdapter('memory', MemoryAdapter);
      connector.registerAdapter('api', MockAPIAdapter as any);
    });

    it('should test memory connection', async () => {
      const result = await connector.testConnection(testMemoryConfig);
      
      expect(result.success).toBe(true);
      expect(result.latency).toBeDefined();
      expect(result.capabilities).toBeDefined();
    });

    it('should test API connection', async () => {
      const result = await connector.testConnection(testAPIConfig);
      
      expect(result.success).toBe(true);
      expect(result.latency).toBeDefined();
      expect(result.capabilities).toBeDefined();
    });

    it('should handle connection test failures', async () => {
      const invalidConfig: APIDataSourceConfig = {
        type: 'api',
        url: 'http://invalid-url'
      };

      const result = await connector.testConnection(invalidConfig);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.latency).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      connector = new DataSourceConnector({
        rateLimitRpm: 2 // Very low limit for testing
      });
      connector.registerAdapter('memory', MemoryAdapter);
    });

    it('should enforce rate limits', async () => {
      const connection = await connector.connect(testMemoryConfig);
      
      // First two queries should succeed
      await connector.query(connection, testQuery);
      await connector.query(connection, testQuery);
      
      // Third query should be rate limited
      await expect(connector.query(connection, testQuery)).rejects.toThrow(/Rate limit exceeded/);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      connector.registerAdapter('memory', MemoryAdapter);
      connector.registerAdapter('api', MockAPIAdapter as any);
    });

    it('should map adapter-specific errors', async () => {
      const invalidConfig: APIDataSourceConfig = {
        type: 'api',
        url: 'http://invalid-url'
      };

      try {
        await connector.connect(invalidConfig);
        fail('Should have thrown an error');
      } catch (error) {
        const searchError = error as SearchError;
        expect(searchError.type).toBeDefined();
        expect(searchError.code).toBeDefined();
        expect(searchError.context).toBeDefined();
        expect(searchError.recovery).toBeDefined();
      }
    });

    it('should provide recovery suggestions', async () => {
      try {
        await connector.connect({
          type: 'unknown'
        } as any);
        fail('Should have thrown an error');
      } catch (error) {
        const searchError = error as SearchError;
        expect(searchError.recovery?.suggestions).toBeDefined();
        expect(Array.isArray(searchError.recovery?.suggestions)).toBe(true);
      }
    });
  });

  describe('Resource Cleanup', () => {
    beforeEach(() => {
      connector.registerAdapter('memory', MemoryAdapter);
      connector.registerAdapter('api', MockAPIAdapter as any);
    });

    it('should cleanup resources on destroy', async () => {
      const connection1 = await connector.connect(testMemoryConfig);
      const connection2 = await connector.connect(testAPIConfig);
      
      await connector.query(connection1, testQuery);
      await connector.query(connection2, testQuery);
      
      // Should not throw
      await expect(connector.destroy()).resolves.not.toThrow();
    });

    it('should clear metrics on destroy', async () => {
      const connection = await connector.connect(testMemoryConfig);
      await connector.query(connection, testQuery);
      
      expect(connector.getPerformanceMetrics().length).toBeGreaterThan(0);
      
      await connector.destroy();
      expect(connector.getPerformanceMetrics().length).toBe(0);
    });
  });

  describe('Connection Pool Integration', () => {
    const poolingConfig: MemoryDataSourceConfig = {
      ...testMemoryConfig,
      pooling: {
        enabled: true,
        maxConnections: 5,
        idleTimeoutMs: 10000
      }
    };

    beforeEach(() => {
      connector.registerAdapter('memory', MemoryAdapter);
    });

    it('should handle pooled connections', async () => {
      const results = await connector.executeQuery(poolingConfig, testQuery);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should show connection pool stats', async () => {
      await connector.executeQuery(poolingConfig, testQuery);
      
      const stats = connector.getConnectionPoolStats();
      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
    });
  });
});