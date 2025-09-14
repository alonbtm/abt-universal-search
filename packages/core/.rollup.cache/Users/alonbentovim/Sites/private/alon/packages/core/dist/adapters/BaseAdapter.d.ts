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
export declare abstract class BaseDataSourceAdapter implements IDataSourceAdapter {
    protected readonly adapterType: string;
    protected connections: Map<string, Connection>;
    protected metrics: Map<string, ConnectionMetrics[]>;
    constructor(type: string);
    /**
     * Get adapter type
     */
    get type(): string;
    /**
     * Abstract methods to be implemented by concrete adapters
     */
    abstract connect(config: DataSourceConfig): Promise<Connection>;
    abstract query(connection: Connection, query: ProcessedQuery): Promise<RawResult[]>;
    abstract disconnect(connection: Connection): Promise<void>;
    abstract validateConfig(config: DataSourceConfig): Promise<void>;
    abstract getCapabilities(): AdapterCapabilities;
    /**
     * Default health check implementation
     */
    healthCheck(connection: Connection): Promise<boolean>;
    /**
     * Get all active connections
     */
    getActiveConnections(): Connection[];
    /**
     * Get connection by ID
     */
    getConnection(connectionId: string): Connection | undefined;
    /**
     * Get connection metrics
     */
    getConnectionMetrics(connectionId?: string): ConnectionMetrics[];
    /**
     * Create a new connection object
     */
    protected createConnection(connectionId: string, metadata?: Record<string, unknown>): Connection;
    /**
     * Update connection status
     */
    protected updateConnectionStatus(connectionId: string, status: Connection['status'], metadata?: Record<string, unknown>): void;
    /**
     * Remove connection from tracking
     */
    protected removeConnection(connectionId: string): void;
    /**
     * Record connection metrics
     */
    protected recordMetrics(connectionId: string, metrics: ConnectionMetrics): void;
    /**
     * Create standardized error
     */
    protected createError(message: string, type: SearchError['type'], code: string, originalError?: Error, context?: SearchError['context']): SearchError;
    /**
     * Execute operation with performance tracking
     */
    protected executeWithMetrics<T>(connectionId: string, operation: () => Promise<T>, operationType: string): Promise<T>;
    /**
     * Cleanup all resources
     */
    destroy(): Promise<void>;
}
/**
 * Adapter factory interface
 */
export interface AdapterFactory {
    createAdapter(type: string, config?: unknown): IDataSourceAdapter;
    registerAdapter(type: string, adapterClass: new (config?: unknown) => IDataSourceAdapter): void;
    getRegisteredTypes(): string[];
}
//# sourceMappingURL=BaseAdapter.d.ts.map