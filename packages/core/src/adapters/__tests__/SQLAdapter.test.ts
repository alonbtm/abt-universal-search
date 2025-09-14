/**
 * SQLAdapter Test Suite
 * @description Comprehensive tests for SQL database adapter
 */

import { SQLAdapter, sqlAdapterFactory } from '../SQLAdapter';
import type { SQLDataSourceConfig } from '../../types/Config';
import type { ProcessedQuery, SQLConnection } from '../../types/Results';
import { ValidationError } from '../../utils/validation';

describe('SQLAdapter', () => {
  let adapter: SQLAdapter;
  let mockConfig: SQLDataSourceConfig;

  beforeEach(() => {
    adapter = new SQLAdapter();
    mockConfig = {
      type: 'sql',
      connection: {
        databaseType: 'postgresql',
        connectionString: 'postgresql://user:password@localhost:5432/testdb',
        validationTimeout: 5000,
        ssl: true,
      },
      query: {
        tableName: 'test_table',
        searchColumns: ['name', 'description'],
        selectColumns: ['id', 'name', 'description', 'created_at'],
        orderBy: [{ column: 'created_at', direction: 'DESC' }],
      },
      pagination: {
        pageSize: 20,
        maxResults: 1000,
        enablePagination: true,
        paginationType: 'offset',
      },
      security: {
        preventSQLInjection: true,
        validateConnectionString: true,
        sanitizeInputs: true,
        maxQueryTime: 30000,
        allowedOperations: ['SELECT'],
        logQueries: true,
      },
      performance: {
        enableQueryCache: true,
        queryCacheTTL: 300,
        enableOptimization: true,
        enableExplain: false,
      },
    };
  });

  afterEach(async () => {
    await adapter.destroy();
  });

  describe('constructor', () => {
    it('should create SQLAdapter with correct type', () => {
      expect(adapter.type).toBe('sql');
    });

    it('should have correct capabilities', () => {
      const capabilities = adapter.getCapabilities();
      expect(capabilities).toEqual({
        supportsPooling: true,
        supportsRealTime: false,
        supportsPagination: true,
        supportsSorting: true,
        supportsFiltering: true,
        maxConcurrentConnections: 50,
        supportedQueryTypes: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
      });
    });
  });

  describe('validateConfig', () => {
    it('should validate valid configuration', async () => {
      await expect(adapter.validateConfig(mockConfig)).resolves.not.toThrow();
    });

    it('should reject non-sql configuration type', async () => {
      const invalidConfig = { ...mockConfig, type: 'api' as any };
      await expect(adapter.validateConfig(invalidConfig)).rejects.toThrow(
        'Configuration type must be "sql"'
      );
    });

    it('should require connection configuration', async () => {
      const invalidConfig = { ...mockConfig, connection: undefined as any };
      await expect(adapter.validateConfig(invalidConfig)).rejects.toThrow(
        'SQL connection configuration is required'
      );
    });

    it('should require query configuration', async () => {
      const invalidConfig = { ...mockConfig, query: undefined as any };
      await expect(adapter.validateConfig(invalidConfig)).rejects.toThrow(
        'SQL query configuration is required'
      );
    });

    it('should validate supported database types', async () => {
      const invalidConfig = {
        ...mockConfig,
        connection: { ...mockConfig.connection, databaseType: 'oracle' as any },
      };
      await expect(adapter.validateConfig(invalidConfig)).rejects.toThrow(
        /Unsupported database type: oracle/
      );
    });

    it('should require connection string or proxy endpoint', async () => {
      const invalidConfig = {
        ...mockConfig,
        connection: {
          ...mockConfig.connection,
          connectionString: undefined,
          proxyEndpoint: undefined,
        },
      };
      await expect(adapter.validateConfig(invalidConfig)).rejects.toThrow(
        'Either connectionString or proxyEndpoint is required'
      );
    });

    it('should require table name', async () => {
      const invalidConfig = {
        ...mockConfig,
        query: { ...mockConfig.query, tableName: '' },
      };
      await expect(adapter.validateConfig(invalidConfig)).rejects.toThrow('Table name is required');
    });

    it('should require search columns', async () => {
      const invalidConfig = {
        ...mockConfig,
        query: { ...mockConfig.query, searchColumns: [] },
      };
      await expect(adapter.validateConfig(invalidConfig)).rejects.toThrow(
        'At least one search column is required'
      );
    });
  });

  describe('connect', () => {
    it('should establish connection successfully', async () => {
      const connection = await adapter.connect(mockConfig);

      expect(connection).toBeDefined();
      expect(connection.id).toBeTruthy();
      expect(connection.adapterType).toBe('sql');
      expect(connection.status).toBe('connected');
      expect(connection.databaseType).toBe('postgresql');
    });

    it('should handle different database types', async () => {
      const mysqlConfig = {
        ...mockConfig,
        connection: {
          ...mockConfig.connection,
          databaseType: 'mysql' as const,
          connectionString: 'mysql://user:password@localhost:3306/testdb',
        },
      };

      const connection = await adapter.connect(mysqlConfig);
      expect(connection.databaseType).toBe('mysql');
    });

    it('should handle SQLite configuration', async () => {
      const sqliteConfig = {
        ...mockConfig,
        connection: {
          ...mockConfig.connection,
          databaseType: 'sqlite' as const,
          connectionString: 'sqlite:./test.db',
        },
      };

      const connection = await adapter.connect(sqliteConfig);
      expect(connection.databaseType).toBe('sqlite');
    });

    it('should sanitize connection string in metadata', async () => {
      const connection = await adapter.connect(mockConfig);
      expect(connection.connectionString).toMatch(/\*\*\*/);
      expect(connection.connectionString).not.toContain('password');
    });
  });

  describe('query', () => {
    let connection: SQLConnection;
    let processedQuery: ProcessedQuery;

    beforeEach(async () => {
      connection = await adapter.connect(mockConfig);
      processedQuery = {
        original: 'search term',
        normalized: 'search term',
        isValid: true,
        metadata: {
          processingTime: 10,
          originalQuery: 'search term',
          length: 11,
          trimmed: false,
          timestamp: Date.now(),
          caseNormalized: 'lowercase',
          xssProtected: true,
          sqlInjectionProtected: true,
        },
      };
    });

    it('should execute search query successfully', async () => {
      const results = await adapter.query(connection, processedQuery);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      const result = results[0];
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('matchedFields');
      expect(result).toHaveProperty('metadata');
    });

    it('should include SQL-specific metadata', async () => {
      const results = await adapter.query(connection, processedQuery);

      const result = results[0];
      expect(result.metadata).toHaveProperty('source', 'sql');
      expect(result.metadata).toHaveProperty('database', 'postgresql');
      expect(result.metadata).toHaveProperty('connectionId', connection.id);
    });

    it('should reject malicious queries', async () => {
      const maliciousQuery = {
        ...processedQuery,
        normalized: "'; DROP TABLE test_table; --",
        isValid: false,
      };

      // This should be caught by security validation
      await expect(adapter.query(connection, maliciousQuery)).rejects.toThrow(
        /SQL security validation failed/
      );
    });

    it('should handle empty search terms', async () => {
      const emptyQuery = {
        ...processedQuery,
        normalized: '',
        original: '',
      };

      const results = await adapter.query(connection, emptyQuery);
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('CRUD operations', () => {
    let connection: SQLConnection;

    beforeEach(async () => {
      // Use a config that allows more operations
      const crudConfig = {
        ...mockConfig,
        security: {
          ...mockConfig.security,
          allowedOperations: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
        },
      };
      connection = await adapter.connect(crudConfig);
    });

    it('should execute INSERT operation', async () => {
      const insertData = {
        name: 'Test Record',
        description: 'A test record for unit testing',
      };

      const result = await adapter.insert(connection, 'test_table', insertData);

      expect(result).toBeDefined();
      expect(result.data).toEqual(insertData);
      expect(result.metadata?.operation).toBe('INSERT');
      expect(result.metadata?.rowsAffected).toBe(1);
    });

    it('should execute UPDATE operation', async () => {
      const updateData = {
        name: 'Updated Record',
        description: 'An updated test record',
      };
      const whereConditions = { id: 1 };

      const result = await adapter.update(connection, 'test_table', updateData, whereConditions);

      expect(result).toBeDefined();
      expect(result.data).toEqual(updateData);
      expect(result.metadata?.operation).toBe('UPDATE');
      expect(result.metadata?.rowsAffected).toBe(1);
    });

    it('should execute DELETE operation', async () => {
      const whereConditions = { id: 1 };

      const result = await adapter.delete(connection, 'test_table', whereConditions);

      expect(result).toBeDefined();
      expect(result.data).toEqual(whereConditions);
      expect(result.metadata?.operation).toBe('DELETE');
      expect(result.metadata?.rowsAffected).toBe(1);
    });
  });

  describe('pagination', () => {
    let connection: SQLConnection;
    let processedQuery: ProcessedQuery;

    beforeEach(async () => {
      connection = await adapter.connect(mockConfig);
      processedQuery = {
        original: 'test',
        normalized: 'test',
        isValid: true,
        metadata: {
          processingTime: 10,
          originalQuery: 'test',
          length: 4,
          trimmed: false,
          timestamp: Date.now(),
        },
      };
    });

    it('should return paginated results', async () => {
      const paginationResult = await adapter.getPaginatedResults(connection, processedQuery, 1, 10);

      expect(paginationResult).toBeDefined();
      expect(paginationResult).toHaveProperty('data');
      expect(paginationResult).toHaveProperty('page', 1);
      expect(paginationResult).toHaveProperty('pageSize', 10);
      expect(paginationResult).toHaveProperty('totalCount');
      expect(paginationResult).toHaveProperty('hasNext');
      expect(paginationResult).toHaveProperty('hasPrevious');
    });

    it('should handle different page sizes', async () => {
      const paginationResult = await adapter.getPaginatedResults(connection, processedQuery, 1, 5);

      expect(paginationResult.pageSize).toBe(5);
    });
  });

  describe('healthCheck', () => {
    let connection: SQLConnection;

    beforeEach(async () => {
      connection = await adapter.connect(mockConfig);
    });

    it('should return true for healthy connection', async () => {
      const isHealthy = await adapter.healthCheck(connection);
      expect(isHealthy).toBe(true);
    });

    it('should return false for disconnected connection', async () => {
      // Disconnect first
      await adapter.disconnect(connection);

      const isHealthy = await adapter.healthCheck(connection);
      expect(isHealthy).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      const connection = await adapter.connect(mockConfig);

      await expect(adapter.disconnect(connection)).resolves.not.toThrow();

      // Connection should be removed from tracking
      expect(adapter.getConnection(connection.id)).toBeUndefined();
    });
  });

  describe('connection management', () => {
    it('should track active connections', async () => {
      const connection1 = await adapter.connect(mockConfig);
      const connection2 = await adapter.connect({
        ...mockConfig,
        connection: {
          ...mockConfig.connection,
          databaseType: 'mysql',
          connectionString: 'mysql://user:password@localhost:3306/testdb',
        },
      });

      const activeConnections = adapter.getActiveConnections();
      expect(activeConnections).toHaveLength(2);
      expect(activeConnections.map(c => c.id)).toContain(connection1.id);
      expect(activeConnections.map(c => c.id)).toContain(connection2.id);
    });

    it('should record connection metrics', async () => {
      const connection = await adapter.connect(mockConfig);
      const processedQuery = {
        original: 'test',
        normalized: 'test',
        isValid: true,
        metadata: {
          processingTime: 10,
          originalQuery: 'test',
          length: 4,
          trimmed: false,
          timestamp: Date.now(),
        },
      };

      // Execute query to generate metrics
      await adapter.query(connection, processedQuery);

      const metrics = adapter.getConnectionMetrics(connection.id);
      expect(metrics).toHaveLength(2); // connect + query
      expect(metrics[0]).toHaveProperty('connectionTime');
      expect(metrics[0]).toHaveProperty('success', true);
    });
  });

  describe('error handling', () => {
    it('should create standardized errors', async () => {
      const invalidConfig = {
        ...mockConfig,
        connection: { ...mockConfig.connection, databaseType: 'invalid' as any },
      };

      try {
        await adapter.validateConfig(invalidConfig);
        fail('Should have thrown an error');
      } catch (error: any) {
        // This will be a ValidationError, not a SearchError from createError
        expect(error.message).toContain('Unsupported database type');
      }
    });

    it('should provide recovery suggestions for connection errors', async () => {
      // Since we're using mock implementations, let's test the error structure
      // by testing a configuration that should throw a connection error
      // We can test this by temporarily breaking the mock implementation
      const originalMethod = adapter.connect;
      adapter.connect = jest.fn().mockImplementation(async () => {
        throw adapter['createError'](
          'Mock connection failure',
          'connection',
          'SQL_CONNECTION_FAILED',
          new Error('Connection refused')
        );
      });

      try {
        await adapter.connect(mockConfig);
        fail('Should have thrown an error');
      } catch (error: any) {
        // Connection errors should have the SearchError structure
        expect(error.type).toBe('connection');
        expect(error.code).toBe('SQL_CONNECTION_FAILED');
        expect(error.recovery?.suggestions).toBeInstanceOf(Array);
        expect(error.recovery?.suggestions.length).toBeGreaterThan(0);
      } finally {
        // Restore original method
        adapter.connect = originalMethod;
      }
    });
  });

  describe('security features', () => {
    it('should sanitize connection strings in logs', async () => {
      const connection = await adapter.connect(mockConfig);

      // Connection string should be sanitized in metadata
      expect(connection.connectionString).not.toContain('password');
      expect(connection.connectionString).toMatch(/\*\*\*/);
    });

    it('should validate SQL injection in connection strings', async () => {
      const maliciousConfig = {
        ...mockConfig,
        connection: {
          ...mockConfig.connection,
          connectionString: "postgresql://user'; DROP TABLE users; --@localhost/db",
        },
      };

      await expect(adapter.validateConfig(maliciousConfig)).rejects.toThrow(
        /Connection string security validation failed/
      );
    });
  });

  describe('performance monitoring', () => {
    let connection: SQLConnection;

    beforeEach(async () => {
      connection = await adapter.connect(mockConfig);
    });

    it('should track query execution times', async () => {
      const processedQuery = {
        original: 'test',
        normalized: 'test',
        isValid: true,
        metadata: {
          processingTime: 10,
          originalQuery: 'test',
          length: 4,
          trimmed: false,
          timestamp: Date.now(),
        },
      };

      await adapter.query(connection, processedQuery);

      const metrics = adapter.getConnectionMetrics(connection.id);
      const queryMetrics = metrics.find(m => m.queryTime > 0);

      expect(queryMetrics).toBeDefined();
      expect(queryMetrics?.queryTime).toBeGreaterThan(0);
      expect(queryMetrics?.totalTime).toBeGreaterThan(0);
    });
  });

  describe('SQLAdapterFactory', () => {
    it('should create singleton instance', () => {
      const instance1 = sqlAdapterFactory.getInstance();
      const instance2 = sqlAdapterFactory.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(SQLAdapter);
    });

    it('should create new instances', () => {
      const instance1 = sqlAdapterFactory.createAdapter();
      const instance2 = sqlAdapterFactory.createAdapter();

      expect(instance1).not.toBe(instance2);
      expect(instance1).toBeInstanceOf(SQLAdapter);
      expect(instance2).toBeInstanceOf(SQLAdapter);
    });

    it('should clear singleton instance', () => {
      const instance1 = sqlAdapterFactory.getInstance();
      sqlAdapterFactory.clearInstance();
      const instance2 = sqlAdapterFactory.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('destroy', () => {
    it('should cleanup all resources', async () => {
      const connection1 = await adapter.connect(mockConfig);
      const connection2 = await adapter.connect({
        ...mockConfig,
        connection: {
          ...mockConfig.connection,
          databaseType: 'mysql',
          connectionString: 'mysql://user:password@localhost:3306/testdb',
        },
      });

      expect(adapter.getActiveConnections()).toHaveLength(2);

      await adapter.destroy();

      expect(adapter.getActiveConnections()).toHaveLength(0);
    });
  });
});

/**
 * Integration tests with different database configurations
 */
describe('SQLAdapter Integration Tests', () => {
  let adapter: SQLAdapter;

  beforeEach(() => {
    adapter = new SQLAdapter();
  });

  afterEach(async () => {
    await adapter.destroy();
  });

  describe('PostgreSQL integration', () => {
    const postgresConfig: SQLDataSourceConfig = {
      type: 'sql',
      connection: {
        databaseType: 'postgresql',
        connectionString: 'postgresql://user:pass@localhost:5432/testdb',
      },
      query: {
        tableName: 'users',
        searchColumns: ['username', 'email', 'full_name'],
        selectColumns: ['id', 'username', 'email', 'full_name', 'created_at'],
        joinTables: [
          {
            table: 'user_profiles',
            type: 'LEFT',
            condition: 'users.id = user_profiles.user_id',
          },
        ],
        orderBy: [{ column: 'created_at', direction: 'DESC' }],
      },
    };

    it('should handle complex PostgreSQL queries', async () => {
      await expect(adapter.validateConfig(postgresConfig)).resolves.not.toThrow();

      const connection = await adapter.connect(postgresConfig);
      expect(connection.databaseType).toBe('postgresql');

      const processedQuery = {
        original: 'john',
        normalized: 'john',
        isValid: true,
        metadata: {
          processingTime: 5,
          originalQuery: 'john',
          length: 4,
          trimmed: false,
          timestamp: Date.now(),
        },
      };

      const results = await adapter.query(connection, processedQuery);
      expect(results).toBeDefined();
    });
  });

  describe('MySQL integration', () => {
    const mysqlConfig: SQLDataSourceConfig = {
      type: 'sql',
      connection: {
        databaseType: 'mysql',
        connectionString: 'mysql://user:pass@localhost:3306/testdb',
      },
      query: {
        tableName: 'products',
        searchColumns: ['name', 'description', 'tags'],
        selectColumns: ['id', 'name', 'price', 'description'],
        whereClause: 'status = "active"',
        orderBy: [{ column: 'price', direction: 'ASC' }],
      },
      pagination: {
        pageSize: 10,
        enablePagination: true,
        paginationType: 'offset',
      },
    };

    it('should handle MySQL-specific features', async () => {
      await expect(adapter.validateConfig(mysqlConfig)).resolves.not.toThrow();

      const connection = await adapter.connect(mysqlConfig);
      expect(connection.databaseType).toBe('mysql');
    });
  });

  describe('SQLite integration', () => {
    const sqliteConfig: SQLDataSourceConfig = {
      type: 'sql',
      connection: {
        databaseType: 'sqlite',
        connectionString: 'sqlite:./test.db',
      },
      query: {
        tableName: 'documents',
        searchColumns: ['title', 'content'],
        selectColumns: ['id', 'title', 'content', 'modified'],
      },
      security: {
        preventSQLInjection: true,
        sanitizeInputs: true,
        maxQueryTime: 5000,
      },
    };

    it('should handle SQLite file databases', async () => {
      await expect(adapter.validateConfig(sqliteConfig)).resolves.not.toThrow();

      const connection = await adapter.connect(sqliteConfig);
      expect(connection.databaseType).toBe('sqlite');
    });
  });
});
