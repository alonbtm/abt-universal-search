/**
 * Base Data Source Adapter - Abstract Base Class and Interface
 * @description Provides unified interface for all data source adapters with common functionality
 */

import type { DataSourceConfig } from '../types/Config';
import type { ProcessedQuery } from '../types/Results';
import type { Connection, RawResult, SearchError, ConnectionMetrics } from '../types/Results';

/**
 * Base data source adapter interface
 */
export interface IDataSourceAdapter {
  /** Adapter type identifier */
  readonly type: string;

  /** Establish connection to data source */
  connect(config: DataSourceConfig): Promise<Connection>;

  /** Execute search query */
  query(connection: Connection, query: ProcessedQuery): Promise<RawResult[]>;

  /** Close connection and cleanup resources */
  disconnect(connection: Connection): Promise<void>;

  /** Validate configuration */
  validateConfig(config: DataSourceConfig): Promise<void>;

  /** Check connection health */
  healthCheck(connection: Connection): Promise<boolean>;

  /** Get adapter capabilities */
  getCapabilities(): AdapterCapabilities;

  /** Cleanup adapter resources */
  destroy(): Promise<void>;
}

/**
 * Adapter capabilities interface
 */
export interface AdapterCapabilities {
  /** Supports connection pooling */
  supportsPooling: boolean;
  /** Supports real-time updates */
  supportsRealTime: boolean;
  /** Supports pagination */
  supportsPagination: boolean;
  /** Supports sorting */
  supportsSorting: boolean;
  /** Supports filtering */
  supportsFiltering: boolean;
  /** Maximum concurrent connections */
  maxConcurrentConnections: number;
  /** Supported query types */
  supportedQueryTypes: string[];
}

/**
 * Abstract base data source adapter class
 */
export abstract class BaseDataSourceAdapter implements IDataSourceAdapter {
  protected readonly adapterType: string;
  protected connections = new Map<string, Connection>();
  protected metrics = new Map<string, ConnectionMetrics[]>();

  constructor(type: string) {
    this.adapterType = type;
  }

  /**
   * Get adapter type
   */
  public get type(): string {
    return this.adapterType;
  }

  /**
   * Abstract methods to be implemented by concrete adapters
   */
  public abstract connect(config: DataSourceConfig): Promise<Connection>;
  public abstract query(connection: Connection, query: ProcessedQuery): Promise<RawResult[]>;
  public abstract disconnect(connection: Connection): Promise<void>;
  public abstract validateConfig(config: DataSourceConfig): Promise<void>;
  public abstract getCapabilities(): AdapterCapabilities;

  /**
   * Default health check implementation
   */
  public async healthCheck(connection: Connection): Promise<boolean> {
    try {
      return connection.status === 'connected';
    } catch {
      return false;
    }
  }

  /**
   * Get all active connections
   */
  public getActiveConnections(): Connection[] {
    return Array.from(this.connections.values()).filter(conn => conn.status === 'connected');
  }

  /**
   * Get connection by ID
   */
  public getConnection(connectionId: string): Connection | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Get connection metrics
   */
  public getConnectionMetrics(connectionId?: string): ConnectionMetrics[] {
    if (connectionId) {
      return this.metrics.get(connectionId) || [];
    }

    // Return all metrics
    const allMetrics: ConnectionMetrics[] = [];
    for (const metrics of this.metrics.values()) {
      allMetrics.push(...metrics);
    }
    return allMetrics;
  }

  /**
   * Create a new connection object
   */
  protected createConnection(
    connectionId: string,
    metadata: Record<string, unknown> = {}
  ): Connection {
    const connection: Connection = {
      id: connectionId,
      adapterType: this.adapterType,
      status: 'connecting',
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      metadata: { ...metadata },
    };

    this.connections.set(connectionId, connection);
    return connection;
  }

  /**
   * Update connection status
   */
  protected updateConnectionStatus(
    connectionId: string,
    status: Connection['status'],
    metadata?: Record<string, unknown>
  ): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.status = status;
      connection.lastUsedAt = Date.now();
      if (metadata) {
        connection.metadata = { ...connection.metadata, ...metadata };
      }
    }
  }

  /**
   * Remove connection from tracking
   */
  protected removeConnection(connectionId: string): void {
    this.connections.delete(connectionId);
    this.metrics.delete(connectionId);
  }

  /**
   * Record connection metrics
   */
  protected recordMetrics(connectionId: string, metrics: ConnectionMetrics): void {
    if (!this.metrics.has(connectionId)) {
      this.metrics.set(connectionId, []);
    }

    const connectionMetrics = this.metrics.get(connectionId)!;
    connectionMetrics.push(metrics);

    // Keep only last 100 metrics per connection
    if (connectionMetrics.length > 100) {
      connectionMetrics.splice(0, connectionMetrics.length - 100);
    }
  }

  /**
   * Create standardized error
   */
  protected createError(
    message: string,
    type: SearchError['type'],
    code: string,
    originalError?: Error,
    context?: SearchError['context']
  ): SearchError {
    const error = new Error(message) as SearchError;
    error.type = type;
    error.code = code;
    if (originalError) {
      error.originalError = originalError;
    }
    error.context = {
      adapter: this.adapterType,
      timestamp: Date.now(),
      ...context,
    };

    // Add recovery suggestions based on error type
    switch (type) {
      case 'connection':
        error.recovery = {
          retryable: true,
          suggestions: [
            'Check network connectivity',
            'Verify connection configuration',
            'Ensure service is running',
          ],
          fallbackOptions: ['Use cached results', 'Try alternative adapter'],
        };
        break;
      case 'timeout':
        error.recovery = {
          retryable: true,
          suggestions: [
            'Increase timeout configuration',
            'Optimize query complexity',
            'Check system performance',
          ],
        };
        break;
      case 'validation':
        error.recovery = {
          retryable: false,
          suggestions: [
            'Check configuration format',
            'Verify required fields',
            'Review data types',
          ],
        };
        break;
      default:
        error.recovery = {
          retryable: true,
          suggestions: ['Check logs for details', 'Try again later'],
        };
    }

    return error;
  }

  /**
   * Execute operation with performance tracking
   */
  protected async executeWithMetrics<T>(
    connectionId: string,
    operation: () => Promise<T>,
    operationType: string
  ): Promise<T> {
    const startTime = performance.now();
    let success = false;
    let resultCount = 0;

    try {
      const result = await operation();
      success = true;

      // Try to count results if it's an array
      if (Array.isArray(result)) {
        resultCount = result.length;
      }

      return result;
    } finally {
      const totalTime = performance.now() - startTime;

      this.recordMetrics(connectionId, {
        connectionTime: 0, // Will be set by specific operations
        queryTime: operationType === 'query' ? totalTime : 0,
        totalTime,
        success,
        resultCount,
      });
    }
  }

  /**
   * Cleanup all resources
   */
  public async destroy(): Promise<void> {
    // Disconnect all connections
    const disconnectPromises = Array.from(this.connections.values()).map(connection =>
      this.disconnect(connection).catch(() => {})
    ); // Ignore errors during cleanup

    await Promise.allSettled(disconnectPromises);

    // Clear tracking
    this.connections.clear();
    this.metrics.clear();
  }
}

/**
 * Adapter factory interface
 */
export interface AdapterFactory {
  createAdapter(type: string, config?: unknown): IDataSourceAdapter;
  registerAdapter(type: string, adapterClass: new (config?: unknown) => IDataSourceAdapter): void;
  getRegisteredTypes(): string[];
}
