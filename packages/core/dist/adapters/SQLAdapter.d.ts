/**
 * SQL Data Source Adapter - Database connectivity with injection protection
 * @description Secure SQL database adapter supporting PostgreSQL, MySQL, and SQLite
 */
import type { DataSourceConfig } from '../types/Config';
import type { ProcessedQuery, RawResult, Connection, SQLConnection, SQLPaginationResult } from '../types/Results';
import { BaseDataSourceAdapter, type AdapterCapabilities } from './BaseAdapter';
/**
 * SQL database adapter with comprehensive security and features
 */
export declare class SQLAdapter extends BaseDataSourceAdapter {
    private connectionPools;
    private dialectCache;
    constructor();
    /**
     * Connect to SQL database
     */
    connect(config: DataSourceConfig): Promise<SQLConnection>;
    /**
     * Execute SQL search query
     */
    query(connection: Connection, query: ProcessedQuery): Promise<RawResult[]>;
    /**
     * Disconnect from SQL database
     */
    disconnect(connection: Connection): Promise<void>;
    /**
     * Validate SQL configuration
     */
    validateConfig(config: DataSourceConfig): Promise<void>;
    /**
     * Check SQL connection health
     */
    healthCheck(connection: Connection): Promise<boolean>;
    /**
     * Get SQL adapter capabilities
     */
    getCapabilities(): AdapterCapabilities;
    /**
     * Execute INSERT operation
     */
    insert(connection: SQLConnection, tableName: string, data: Record<string, unknown>): Promise<RawResult>;
    /**
     * Execute UPDATE operation
     */
    update(connection: SQLConnection, tableName: string, data: Record<string, unknown>, whereConditions: Record<string, unknown>): Promise<RawResult>;
    /**
     * Execute DELETE operation
     */
    delete(connection: SQLConnection, tableName: string, whereConditions: Record<string, unknown>): Promise<RawResult>;
    /**
     * Get paginated results with count
     */
    getPaginatedResults(connection: SQLConnection, query: ProcessedQuery, page?: number, pageSize?: number): Promise<SQLPaginationResult>;
    /**
     * Create SQL connection object
     */
    private createSQLConnection;
    /**
     * Get database dialect for connection
     */
    private getDialect;
    /**
     * Execute SQL query (mock implementation - would connect to actual database)
     */
    private executeSQLQuery;
    /**
     * Transform SQL results to RawResult format
     */
    private transformSQLResultsToRaw;
    /**
     * Generate unique connection ID
     */
    private generateConnectionId;
    /**
     * Sanitize connection string for logging
     */
    private sanitizeConnectionString;
    /**
     * Mock methods for actual database operations
     * These would be replaced with real database driver implementations
     */
    private validateConnectionSecurity;
    private establishDatabaseConnection;
    private testConnection;
    private closeDatabaseConnection;
    private removeConnectionFromPool;
    private getConnectionConfig;
    private sanitizeConfigForLogging;
}
/**
 * SQL adapter factory
 */
export declare class SQLAdapterFactory {
    private static instance;
    /**
     * Get singleton SQL adapter instance
     */
    static getInstance(): SQLAdapter;
    /**
     * Create new SQL adapter instance
     */
    static createAdapter(): SQLAdapter;
    /**
     * Clear singleton instance
     */
    static clearInstance(): void;
}
/**
 * Global SQL adapter factory instance
 */
export declare const sqlAdapterFactory: typeof SQLAdapterFactory;
//# sourceMappingURL=SQLAdapter.d.ts.map