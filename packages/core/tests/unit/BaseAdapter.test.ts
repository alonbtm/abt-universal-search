/**
 * BaseAdapter Unit Tests
 * Tests for base adapter abstract class and interface functionality
 */

import { BaseDataSourceAdapter, type AdapterCapabilities } from '../../src/adapters/BaseAdapter';
import type { DataSourceConfig } from '../../src/types/Config';
import type { ProcessedQuery, Connection, RawResult } from '../../src/types/Results';

// Mock concrete adapter for testing
class TestAdapter extends BaseDataSourceAdapter {
  private connectionCounter = 0;

  constructor() {
    super('test');
  }

  async connect(config: DataSourceConfig): Promise<Connection> {
    const connectionId = `test-${++this.connectionCounter}`;
    const connection = this.createConnection(connectionId, { config });
    this.updateConnectionStatus(connectionId, 'connected');
    return connection;
  }

  async query(connection: Connection, query: ProcessedQuery): Promise<RawResult[]> {
    // Update connection last used time
    this.updateConnectionStatus(connection.id, 'connected');
    
    return this.executeWithMetrics(connection.id, async () => {
      if (query.normalized === 'error') {
        throw new Error('Test query error');
      }
      
      return [
        {
          id: 'test-result-1',
          data: { title: `Test result for ${query.normalized}` },
          score: 0.8,
          matchedFields: ['title'],
          metadata: { source: 'test' }
        }
      ];
    }, 'query');
  }

  async disconnect(connection: Connection): Promise<void> {
    this.updateConnectionStatus(connection.id, 'disconnected');
    this.removeConnection(connection.id);
  }

  async validateConfig(config: DataSourceConfig): Promise<void> {
    if (!config.type) {
      throw new Error('Type is required');
    }
  }

  getCapabilities(): AdapterCapabilities {
    return {
      supportsPooling: true,
      supportsRealTime: false,
      supportsPagination: true,
      supportsSorting: true,
      supportsFiltering: true,
      maxConcurrentConnections: 10,
      supportedQueryTypes: ['text', 'exact']
    };
  }
}

describe('BaseDataSourceAdapter', () => {
  let adapter: TestAdapter;

  const testConfig: DataSourceConfig = {
    type: 'memory',
    data: [{ id: 1, name: 'test' }],
    searchFields: ['name']
  };

  const testQuery: ProcessedQuery = {
    original: 'test',
    normalized: 'test',
    isValid: true,
    metadata: {
      processingTime: 1,
      originalQuery: 'test',
      length: 4,
      trimmed: false,
      timestamp: Date.now(),
      caseNormalized: 'lowercase'
    }
  };

  beforeEach(() => {
    adapter = new TestAdapter();
  });

  afterEach(async () => {
    await adapter.destroy();
  });

  describe('Basic Properties', () => {
    it('should have correct adapter type', () => {
      expect(adapter.type).toBe('test');
    });

    it('should return capabilities', () => {
      const capabilities = adapter.getCapabilities();
      expect(capabilities).toBeDefined();
      expect(capabilities.supportsPooling).toBe(true);
      expect(capabilities.maxConcurrentConnections).toBe(10);
      expect(Array.isArray(capabilities.supportedQueryTypes)).toBe(true);
    });
  });

  describe('Connection Management', () => {
    it('should create and track connections', async () => {
      const connection = await adapter.connect(testConfig);
      
      expect(connection).toBeDefined();
      expect(connection.id).toContain('test-');
      expect(connection.adapterType).toBe('test');
      expect(connection.status).toBe('connected');
      expect(connection.createdAt).toBeDefined();
      expect(connection.lastUsedAt).toBeDefined();
    });

    it('should get active connections', async () => {
      const connection1 = await adapter.connect(testConfig);
      const connection2 = await adapter.connect(testConfig);
      
      const activeConnections = adapter.getActiveConnections();
      expect(activeConnections).toHaveLength(2);
      expect(activeConnections[0].status).toBe('connected');
      expect(activeConnections[1].status).toBe('connected');
    });

    it('should get connection by ID', async () => {
      const connection = await adapter.connect(testConfig);
      
      const retrieved = adapter.getConnection(connection.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(connection.id);
    });

    it('should perform health check', async () => {
      const connection = await adapter.connect(testConfig);
      
      const isHealthy = await adapter.healthCheck(connection);
      expect(isHealthy).toBe(true);
    });

    it('should disconnect and remove connections', async () => {
      const connection = await adapter.connect(testConfig);
      expect(adapter.getActiveConnections()).toHaveLength(1);
      
      await adapter.disconnect(connection);
      expect(adapter.getActiveConnections()).toHaveLength(0);
    });
  });

  describe('Query Execution', () => {
    let connection: Connection;

    beforeEach(async () => {
      connection = await adapter.connect(testConfig);
    });

    it('should execute queries successfully', async () => {
      const results = await adapter.query(connection, testQuery);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('data');
      expect(results[0]).toHaveProperty('score');
      expect(results[0]).toHaveProperty('matchedFields');
    });

    it('should handle query errors', async () => {
      const errorQuery: ProcessedQuery = {
        ...testQuery,
        normalized: 'error'
      };

      await expect(adapter.query(connection, errorQuery)).rejects.toThrow('Test query error');
    });

    it('should track query metrics', async () => {
      await adapter.query(connection, testQuery);
      
      const metrics = adapter.getConnectionMetrics(connection.id);
      expect(metrics).toBeDefined();
      expect(Array.isArray(metrics)).toBe(true);
      expect(metrics.length).toBeGreaterThan(0);
      
      const metric = metrics[0];
      expect(metric).toHaveProperty('totalTime');
      expect(metric).toHaveProperty('success');
      expect(metric.success).toBe(true);
    });

    it('should track failed query metrics', async () => {
      const errorQuery: ProcessedQuery = {
        ...testQuery,
        normalized: 'error'
      };

      try {
        await adapter.query(connection, errorQuery);
      } catch {
        // Expected error
      }
      
      const metrics = adapter.getConnectionMetrics(connection.id);
      expect(metrics.length).toBeGreaterThan(0);
      
      const metric = metrics[0];
      expect(metric.success).toBe(false);
    });
  });

  describe('Metrics Collection', () => {
    let connection: Connection;

    beforeEach(async () => {
      connection = await adapter.connect(testConfig);
    });

    it('should get metrics for specific connection', async () => {
      await adapter.query(connection, testQuery);
      
      const connectionMetrics = adapter.getConnectionMetrics(connection.id);
      expect(connectionMetrics).toHaveLength(1);
    });

    it('should get all metrics when no connection ID specified', async () => {
      const connection2 = await adapter.connect(testConfig);
      
      await adapter.query(connection, testQuery);
      await adapter.query(connection2, testQuery);
      
      const allMetrics = adapter.getConnectionMetrics();
      expect(allMetrics.length).toBeGreaterThanOrEqual(2);
    });

    it('should limit metrics history', async () => {
      // Execute many queries to test metric limit
      for (let i = 0; i < 105; i++) {
        await adapter.query(connection, testQuery);
      }
      
      const metrics = adapter.getConnectionMetrics(connection.id);
      expect(metrics.length).toBe(100); // Should be limited to 100
    });
  });

  describe('Error Creation', () => {
    it('should create standardized errors with context', async () => {
      const connection = await adapter.connect(testConfig);
      
      try {
        await adapter.query(connection, {
          ...testQuery,
          normalized: 'error'
        });
      } catch (error: any) {
        // The error should be wrapped but we can test the original structure
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('Resource Cleanup', () => {
    it('should cleanup all connections on destroy', async () => {
      const connection1 = await adapter.connect(testConfig);
      const connection2 = await adapter.connect(testConfig);
      
      expect(adapter.getActiveConnections()).toHaveLength(2);
      
      await adapter.destroy();
      
      expect(adapter.getActiveConnections()).toHaveLength(0);
    });

    it('should clear all metrics on destroy', async () => {
      const connection = await adapter.connect(testConfig);
      await adapter.query(connection, testQuery);
      
      expect(adapter.getConnectionMetrics().length).toBeGreaterThan(0);
      
      await adapter.destroy();
      
      expect(adapter.getConnectionMetrics().length).toBe(0);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate correct configuration', async () => {
      await expect(adapter.validateConfig(testConfig)).resolves.not.toThrow();
    });

    it('should reject invalid configuration', async () => {
      const invalidConfig = { /* missing type */ } as any;
      
      await expect(adapter.validateConfig(invalidConfig)).rejects.toThrow('Type is required');
    });
  });

  describe('Connection State Management', () => {
    it('should update connection status', async () => {
      const connection = await adapter.connect(testConfig);
      expect(connection.status).toBe('connected');
      
      const originalLastUsed = connection.lastUsedAt;
      
      // Add small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 2));
      
      // Update through query execution (indirectly tests updateConnectionStatus)
      await adapter.query(connection, testQuery);
      
      const updatedConnection = adapter.getConnection(connection.id);
      expect(updatedConnection?.lastUsedAt).toBeGreaterThan(originalLastUsed);
    });

    it('should handle multiple connections independently', async () => {
      const connection1 = await adapter.connect(testConfig);
      const connection2 = await adapter.connect(testConfig);
      
      expect(connection1.id).not.toBe(connection2.id);
      expect(adapter.getActiveConnections()).toHaveLength(2);
      
      await adapter.disconnect(connection1);
      expect(adapter.getActiveConnections()).toHaveLength(1);
      expect(adapter.getConnection(connection1.id)).toBeUndefined();
      expect(adapter.getConnection(connection2.id)).toBeDefined();
    });
  });
});