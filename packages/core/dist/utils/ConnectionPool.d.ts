/**
 * Connection Pool - Connection Lifecycle Management and Pooling
 * @description Manages connection pooling, timeouts, and retry logic for data source adapters
 */
import type { Connection } from '../types/Results';
import type { DataSourceConfig } from '../types/Config';
/**
 * Connection pool configuration
 */
export interface ConnectionPoolConfig {
    /** Maximum number of connections in the pool */
    maxConnections: number;
    /** Idle timeout in milliseconds */
    idleTimeoutMs: number;
    /** Connection timeout in milliseconds */
    connectionTimeoutMs: number;
    /** Maximum wait time for a connection from pool */
    acquireTimeoutMs: number;
    /** Enable connection validation before use */
    validateOnAcquire: boolean;
    /** Enable connection validation when returning to pool */
    validateOnRelease: boolean;
    /** Retry configuration */
    retry: {
        attempts: number;
        backoffMs: number;
        maxBackoffMs: number;
    };
}
/**
 * Connection factory interface
 */
export interface ConnectionFactory {
    createConnection(config: DataSourceConfig): Promise<Connection>;
    validateConnection(connection: Connection): Promise<boolean>;
    destroyConnection(connection: Connection): Promise<void>;
}
/**
 * Connection pool implementation
 */
export declare class ConnectionPool {
    private readonly config;
    private readonly factory;
    private readonly adapterType;
    private pool;
    private waitingQueue;
    private idleCheckInterval?;
    private isDestroyed;
    constructor(adapterType: string, factory: ConnectionFactory, config?: Partial<ConnectionPoolConfig>);
    /**
     * Acquire a connection from the pool
     */
    acquire(config: DataSourceConfig): Promise<Connection>;
    /**
     * Release a connection back to the pool
     */
    release(connection: Connection): Promise<void>;
    /**
     * Execute operation with automatic connection management
     */
    withConnection<T>(config: DataSourceConfig, operation: (connection: Connection) => Promise<T>): Promise<T>;
    /**
     * Execute operation with retry logic
     */
    executeWithRetry<T>(config: DataSourceConfig, operation: (connection: Connection) => Promise<T>): Promise<T>;
    /**
     * Get pool statistics
     */
    getStats(): {
        totalConnections: number;
        idleConnections: number;
        activeConnections: number;
        waitingRequests: number;
        poolConfig: ConnectionPoolConfig;
    };
    /**
     * Destroy the connection pool and all connections
     */
    destroy(): Promise<void>;
    /**
     * Find an idle connection that can be reused
     */
    private findIdleConnection;
    /**
     * Create a new connection
     */
    private createNewConnection;
    /**
     * Wait for an available connection
     */
    private waitForConnection;
    /**
     * Process waiting queue when a connection becomes available
     */
    private processWaitingQueue;
    /**
     * Prepare connection for use
     */
    private prepareConnection;
    /**
     * Remove connection from pool
     */
    private removeConnection;
    /**
     * Start periodic idle connection cleanup
     */
    private startIdleCheck;
    /**
     * Create a timeout promise
     */
    private createTimeoutPromise;
    /**
     * Delay execution
     */
    private delay;
}
//# sourceMappingURL=ConnectionPool.d.ts.map