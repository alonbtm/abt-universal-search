/**
 * Data Source Connector - Unified Data Source Orchestrator
 * @description Adapter pattern implementation with factory for all data source types
 */

import type { DataSourceConfig } from '../types/Config';
import type { ProcessedQuery, Connection, RawResult, SearchError, ConnectionMetrics } from '../types/Results';
import type { IDataSourceAdapter, AdapterFactory } from '../adapters/BaseAdapter';
import { ConnectionPool, type ConnectionFactory } from '../utils/ConnectionPool';
import { errorMapper } from '../utils/ErrorMapper';
import { validateQuerySecurity } from '../utils/security';

/**
 * Security validation configuration
 */
interface SecurityConfig {
  /** Enable input validation */
  validateInput: boolean;
  /** Enable query sanitization */
  sanitizeQueries: boolean;
  /** Rate limiting (requests per minute) */
  rateLimitRpm: number;
  /** Enable security logging */
  logSecurityEvents: boolean;
}

/**
 * Rate limiting tracker
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * DataSourceConnector factory implementation
 */
class DataSourceAdapterFactory implements AdapterFactory {
  private adapters = new Map<string, new (config?: unknown) => IDataSourceAdapter>();

  public createAdapter(type: string, config?: unknown): IDataSourceAdapter {
    const AdapterClass = this.adapters.get(type);
    if (!AdapterClass) {
      throw errorMapper.mapError(
        new Error(`No adapter registered for type: ${type}`),
        'factory',
        { config: config as Record<string, unknown> | undefined }
      );
    }

    return new AdapterClass(config);
  }

  public registerAdapter(type: string, adapterClass: new (config?: unknown) => IDataSourceAdapter): void {
    this.adapters.set(type, adapterClass);
  }

  public getRegisteredTypes(): string[] {
    return Array.from(this.adapters.keys());
  }
}

/**
 * Main DataSource Connector class
 */
export class DataSourceConnector implements ConnectionFactory {
  private readonly factory: DataSourceAdapterFactory;
  private readonly pools = new Map<string, ConnectionPool>();
  private readonly adapters = new Map<string, IDataSourceAdapter>();
  private readonly securityConfig: SecurityConfig;
  private readonly rateLimits = new Map<string, RateLimitEntry>();
  private performanceMetrics: ConnectionMetrics[] = [];

  constructor(securityConfig: Partial<SecurityConfig> = {}) {
    this.factory = new DataSourceAdapterFactory();
    this.securityConfig = {
      validateInput: true,
      sanitizeQueries: true,
      rateLimitRpm: 1000,
      logSecurityEvents: true,
      ...securityConfig
    };
  }

  /**
   * Register an adapter type
   */
  public registerAdapter(type: string, adapterClass: new (config?: unknown) => IDataSourceAdapter): void {
    this.factory.registerAdapter(type, adapterClass);
  }

  /**
   * Get all registered adapter types
   */
  public getRegisteredTypes(): string[] {
    return this.factory.getRegisteredTypes();
  }

  /**
   * Connect to a data source
   */
  public async connect(config: DataSourceConfig): Promise<Connection> {
    const startTime = performance.now();
    
    try {
      // Validate configuration
      await this.validateConfig(config);
      
      // Security validation
      if (this.securityConfig.validateInput) {
        this.validateSecurityConfig(config);
      }

      // Get or create adapter
      const adapter = this.getAdapter(config.type, config);
      
      // Use connection pool if enabled
      if (config.pooling?.enabled) {
        const pool = this.getConnectionPool(config.type, adapter);
        return await pool.acquire(config);
      }

      // Direct connection
      const connection = await adapter.connect(config);
      
      // Record metrics
      this.recordConnectionMetrics({
        connectionTime: performance.now() - startTime,
        queryTime: 0,
        totalTime: performance.now() - startTime,
        success: true,
        resultCount: 0
      });

      return connection;
    } catch (error) {
      // Record failed metrics
      this.recordConnectionMetrics({
        connectionTime: performance.now() - startTime,
        queryTime: 0,
        totalTime: performance.now() - startTime,
        success: false,
        resultCount: 0
      });

      throw errorMapper.mapError(error, config.type, { config: config as unknown as Record<string, unknown> });
    }
  }

  /**
   * Execute query with comprehensive validation and security
   */
  public async query(connection: Connection, query: ProcessedQuery): Promise<RawResult[]> {
    const startTime = performance.now();
    
    try {
      // Rate limiting check
      this.checkRateLimit(connection.adapterType);
      
      // Security validation
      if (this.securityConfig.sanitizeQueries) {
        await this.validateQuerySecurity(query);
      }

      // Get adapter and execute query
      const adapter = this.adapters.get(connection.adapterType);
      if (!adapter) {
        throw errorMapper.mapError(
          new Error(`No adapter found for connection type: ${connection.adapterType}`),
          connection.adapterType,
          { adapter: connection.adapterType, query: query.original }
        );
      }

      const results = await adapter.query(connection, query);
      
      // Record successful metrics
      this.recordConnectionMetrics({
        connectionTime: 0,
        queryTime: performance.now() - startTime,
        totalTime: performance.now() - startTime,
        success: true,
        resultCount: results.length
      });

      return results;
    } catch (error) {
      // Record failed metrics
      this.recordConnectionMetrics({
        connectionTime: 0,
        queryTime: performance.now() - startTime,
        totalTime: performance.now() - startTime,
        success: false,
        resultCount: 0
      });

      throw errorMapper.mapError(error, connection.adapterType, { adapter: connection.adapterType, query: query.original });
    }
  }

  /**
   * Disconnect from data source
   */
  public async disconnect(connection: Connection): Promise<void> {
    try {
      const adapter = this.adapters.get(connection.adapterType);
      if (adapter) {
        await adapter.disconnect(connection);
      }
    } catch (error) {
      throw errorMapper.mapError(error, connection.adapterType, { adapter: connection.adapterType });
    }
  }

  /**
   * Execute query with full pipeline (connect, query, disconnect)
   */
  public async executeQuery(config: DataSourceConfig, query: ProcessedQuery): Promise<RawResult[]> {
    // Use connection pooling if available
    if (config.pooling?.enabled) {
      const adapter = this.getAdapter(config.type, config);
      const pool = this.getConnectionPool(config.type, adapter);
      
      return await pool.executeWithRetry(config, async (connection) => {
        return await this.query(connection, query);
      });
    }

    // Direct execution
    const connection = await this.connect(config);
    try {
      return await this.query(connection, query);
    } finally {
      await this.disconnect(connection).catch(() => {}); // Ignore disconnect errors
    }
  }

  /**
   * Test connection configuration
   */
  public async testConnection(config: DataSourceConfig): Promise<{
    success: boolean;
    latency?: number;
    error?: SearchError;
    capabilities?: Record<string, unknown>;
  }> {
    const startTime = performance.now();
    
    try {
      const connection = await this.connect(config);
      const latency = performance.now() - startTime;
      
      // Test with a simple health check
      const adapter = this.adapters.get(config.type);
      const isHealthy = adapter ? await adapter.healthCheck(connection) : true;
      
      await this.disconnect(connection);
      
      return {
        success: isHealthy,
        latency,
        ...(adapter?.getCapabilities() ? { capabilities: adapter.getCapabilities() as Record<string, unknown> } : {})
      };
    } catch (error) {
      return {
        success: false,
        latency: performance.now() - startTime,
        error: errorMapper.mapError(error, config.type, { config: config as unknown as Record<string, unknown> })
      };
    }
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): ConnectionMetrics[] {
    return [...this.performanceMetrics];
  }

  /**
   * Clear performance metrics
   */
  public clearPerformanceMetrics(): void {
    this.performanceMetrics.length = 0;
  }

  /**
   * Get connection pool statistics
   */
  public getConnectionPoolStats(): Record<string, unknown> {
    const stats: Record<string, unknown> = {};
    for (const [type, pool] of this.pools.entries()) {
      stats[type] = pool.getStats();
    }
    return stats;
  }

  /**
   * Destroy all connections and cleanup resources
   */
  public async destroy(): Promise<void> {
    // Destroy all connection pools
    const poolPromises = Array.from(this.pools.values()).map(pool => pool.destroy());
    await Promise.allSettled(poolPromises);
    this.pools.clear();

    // Cleanup adapters
    const adapterPromises = Array.from(this.adapters.values()).map(adapter => adapter.destroy());
    await Promise.allSettled(adapterPromises);
    this.adapters.clear();

    // Clear metrics
    this.performanceMetrics.length = 0;
    this.rateLimits.clear();
  }

  // ConnectionFactory implementation for pooling
  public async createConnection(config: DataSourceConfig): Promise<Connection> {
    const adapter = this.getAdapter(config.type, config);
    return await adapter.connect(config);
  }

  public async validateConnection(connection: Connection): Promise<boolean> {
    const adapter = this.adapters.get(connection.adapterType);
    return adapter ? await adapter.healthCheck(connection) : false;
  }

  public async destroyConnection(connection: Connection): Promise<void> {
    await this.disconnect(connection);
  }

  /**
   * Get or create adapter instance
   */
  private getAdapter(type: string, config: DataSourceConfig): IDataSourceAdapter {
    if (!this.adapters.has(type)) {
      const adapter = this.factory.createAdapter(type, config);
      this.adapters.set(type, adapter);
    }
    return this.adapters.get(type)!;
  }

  /**
   * Get or create connection pool for adapter type
   */
  private getConnectionPool(type: string, adapter: IDataSourceAdapter): ConnectionPool {
    if (!this.pools.has(type)) {
      const pool = new ConnectionPool(type, this, {
        maxConnections: 10,
        idleTimeoutMs: 30000,
        connectionTimeoutMs: 10000,
        acquireTimeoutMs: 5000,
        validateOnAcquire: true,
        validateOnRelease: false,
        retry: {
          attempts: 3,
          backoffMs: 1000,
          maxBackoffMs: 10000
        }
      });
      this.pools.set(type, pool);
    }
    return this.pools.get(type)!;
  }

  /**
   * Validate data source configuration
   */
  private async validateConfig(config: DataSourceConfig): Promise<void> {
    if (!config.type) {
      throw errorMapper.mapError(
        new Error('Data source type is required'),
        'validation',
        { config }
      );
    }

    if (!this.factory.getRegisteredTypes().includes(config.type)) {
      throw errorMapper.mapError(
        new Error(`Unsupported data source type: ${config.type}`),
        'validation',
        { config, supportedTypes: this.factory.getRegisteredTypes() }
      );
    }

    // Delegate to adapter-specific validation
    const adapter = this.getAdapter(config.type, config);
    await adapter.validateConfig(config);
  }

  /**
   * Validate security configuration
   */
  private validateSecurityConfig(config: DataSourceConfig): void {
    const securityConfig = config.security;
    if (!securityConfig) {
      return;
    }

    // Check for required security settings for sensitive adapters
    if (config.type === 'sql' || config.type === 'api') {
      if (!securityConfig.validateInput) {
        throw errorMapper.mapError(
          new Error('Input validation is required for SQL and API adapters'),
          'security',
          { config }
        );
      }
    }
  }

  /**
   * Validate query for security threats
   */
  private async validateQuerySecurity(query: ProcessedQuery): Promise<void> {
    const securityResult = validateQuerySecurity(query.normalized, {
      xssProtection: true,
      sqlInjectionProtection: true
    });

    if (!securityResult.isSecure) {
      const threatTypes = [];
      if (securityResult.threats.xss) threatTypes.push('XSS');
      if (securityResult.threats.sqlInjection) threatTypes.push('SQL Injection');
      
      const error = errorMapper.mapError(
        new Error(`Security threats detected: ${threatTypes.join(', ')}`),
        'security',
        { query, threats: securityResult.threats }
      );

      if (this.securityConfig.logSecurityEvents) {
        // eslint-disable-next-line no-console
        console.warn('Security threat detected:', {
          query: query.normalized,
          threats: securityResult.threats,
          timestamp: new Date().toISOString()
        });
      }

      throw error;
    }
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(adapterType: string): void {
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const key = adapterType;

    const entry = this.rateLimits.get(key) || { count: 0, resetTime: now + windowMs };

    // Reset if window expired
    if (now > entry.resetTime) {
      entry.count = 0;
      entry.resetTime = now + windowMs;
    }

    entry.count++;
    this.rateLimits.set(key, entry);

    // Check if rate limit exceeded
    if (entry.count > this.securityConfig.rateLimitRpm) {
      throw errorMapper.mapError(
        new Error(`Rate limit exceeded for ${adapterType}: ${entry.count}/${this.securityConfig.rateLimitRpm} requests per minute`),
        'security',
        { 
          adapterType, 
          currentCount: entry.count, 
          limit: this.securityConfig.rateLimitRpm,
          resetTime: entry.resetTime
        }
      );
    }
  }

  /**
   * Record connection performance metrics
   */
  private recordConnectionMetrics(metrics: ConnectionMetrics): void {
    this.performanceMetrics.push(metrics);
    
    // Keep only last 1000 metrics
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics.splice(0, this.performanceMetrics.length - 1000);
    }
  }
}

/**
 * Global data source connector instance with pre-registered adapters
 */
export function createDataSourceConnector(): DataSourceConnector {
  const connector = new DataSourceConnector();
  
  // Auto-register built-in adapters
  const { MemoryAdapter } = require('../adapters/MemoryAdapter');
  const { APIAdapter } = require('../adapters/APIAdapter');
  
  connector.registerAdapter('memory', MemoryAdapter);
  connector.registerAdapter('api', APIAdapter);
  
  return connector;
}

/**
 * Pre-configured global connector instance
 */
export const dataSourceConnector = createDataSourceConnector();