/**
 * Data Source Connector - Unified Data Source Orchestrator
 * @description Adapter pattern implementation with factory for all data source types
 */
import type { DataSourceConfig } from '../types/Config';
import type { ProcessedQuery, Connection, RawResult, SearchError, ConnectionMetrics } from '../types/Results';
import type { IDataSourceAdapter } from '../adapters/BaseAdapter';
import { type ConnectionFactory } from '../utils/ConnectionPool';
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
 * Main DataSource Connector class
 */
export declare class DataSourceConnector implements ConnectionFactory {
    private readonly factory;
    private readonly pools;
    private readonly adapters;
    private readonly securityConfig;
    private readonly rateLimits;
    private performanceMetrics;
    constructor(securityConfig?: Partial<SecurityConfig>);
    /**
     * Register an adapter type
     */
    registerAdapter(type: string, adapterClass: new (config?: unknown) => IDataSourceAdapter): void;
    /**
     * Get all registered adapter types
     */
    getRegisteredTypes(): string[];
    /**
     * Connect to a data source
     */
    connect(config: DataSourceConfig): Promise<Connection>;
    /**
     * Execute query with comprehensive validation and security
     */
    query(connection: Connection, query: ProcessedQuery): Promise<RawResult[]>;
    /**
     * Disconnect from data source
     */
    disconnect(connection: Connection): Promise<void>;
    /**
     * Execute query with full pipeline (connect, query, disconnect)
     */
    executeQuery(config: DataSourceConfig, query: ProcessedQuery): Promise<RawResult[]>;
    /**
     * Test connection configuration
     */
    testConnection(config: DataSourceConfig): Promise<{
        success: boolean;
        latency?: number;
        error?: SearchError;
        capabilities?: Record<string, unknown>;
    }>;
    /**
     * Get performance metrics
     */
    getPerformanceMetrics(): ConnectionMetrics[];
    /**
     * Clear performance metrics
     */
    clearPerformanceMetrics(): void;
    /**
     * Get connection pool statistics
     */
    getConnectionPoolStats(): Record<string, unknown>;
    /**
     * Destroy all connections and cleanup resources
     */
    destroy(): Promise<void>;
    createConnection(config: DataSourceConfig): Promise<Connection>;
    validateConnection(connection: Connection): Promise<boolean>;
    destroyConnection(connection: Connection): Promise<void>;
    /**
     * Get or create adapter instance
     */
    private getAdapter;
    /**
     * Get or create connection pool for adapter type
     */
    private getConnectionPool;
    /**
     * Validate data source configuration
     */
    private validateConfig;
    /**
     * Validate security configuration
     */
    private validateSecurityConfig;
    /**
     * Validate query for security threats
     */
    private validateQuerySecurity;
    /**
     * Check rate limiting
     */
    private checkRateLimit;
    /**
     * Record connection performance metrics
     */
    private recordConnectionMetrics;
}
/**
 * Global data source connector instance with pre-registered adapters
 */
export declare function createDataSourceConnector(): DataSourceConnector;
/**
 * Pre-configured global connector instance
 */
export declare const dataSourceConnector: DataSourceConnector;
export {};
//# sourceMappingURL=DataSourceConnector.d.ts.map