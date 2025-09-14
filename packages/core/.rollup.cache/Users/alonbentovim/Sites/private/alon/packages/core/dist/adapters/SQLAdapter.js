/**
 * SQL Data Source Adapter - Database connectivity with injection protection
 * @description Secure SQL database adapter supporting PostgreSQL, MySQL, and SQLite
 */
import { BaseDataSourceAdapter } from './BaseAdapter';
import { dialectFactory } from '../utils/DatabaseDialect';
import { queryBuilderFactory } from '../utils/QueryBuilder';
import { securityValidatorFactory } from '../utils/SecurityValidator';
import { resultLimiterFactory } from '../utils/ResultLimiter';
import { ValidationError } from '../utils/validation';
/**
 * SQL database adapter with comprehensive security and features
 */
export class SQLAdapter extends BaseDataSourceAdapter {
    constructor() {
        super('sql');
        this.connectionPools = new Map();
        this.dialectCache = new Map();
    }
    /**
     * Connect to SQL database
     */
    async connect(config) {
        const sqlConfig = config;
        await this.validateConfig(sqlConfig);
        const startTime = performance.now();
        const connectionId = this.generateConnectionId(sqlConfig);
        try {
            // Create connection with initial status
            const connection = this.createSQLConnection(connectionId, sqlConfig);
            // Validate connection string security
            await this.validateConnectionSecurity(sqlConfig);
            // Establish database connection
            await this.establishDatabaseConnection(connection, sqlConfig);
            // Test connection with simple query
            await this.testConnection(connection, sqlConfig);
            // Update connection status
            connection.status = 'connected';
            this.updateConnectionStatus(connectionId, 'connected', {
                databaseType: sqlConfig.connection.databaseType,
                connectedAt: Date.now()
            });
            const connectionTime = performance.now() - startTime;
            this.recordMetrics(connectionId, {
                connectionTime,
                queryTime: 0,
                totalTime: connectionTime,
                success: true,
                resultCount: 0
            });
            return connection;
        }
        catch (error) {
            this.updateConnectionStatus(connectionId, 'error', {
                error: error.message,
                errorTime: Date.now()
            });
            throw this.createError(`Failed to connect to ${sqlConfig.connection.databaseType} database: ${error.message}`, 'connection', 'SQL_CONNECTION_FAILED', error, {
                config: this.sanitizeConfigForLogging(sqlConfig),
                connectionId
            });
        }
    }
    /**
     * Execute SQL search query
     */
    async query(connection, query) {
        const sqlConnection = connection;
        const config = this.getConnectionConfig(sqlConnection);
        return this.executeWithMetrics(connection.id, async () => {
            // Get database utilities
            const dialect = this.getDialect(sqlConnection.databaseType);
            const queryBuilder = queryBuilderFactory.getBuilder(dialect);
            const securityValidator = securityValidatorFactory.getValidator(config.security);
            const resultLimiter = resultLimiterFactory.getLimiter(config.pagination, config.performance);
            // Build parameterized query
            const parameterizedQuery = queryBuilder.buildSearchQuery(config.query, query, config.pagination);
            // Validate query security
            const validation = securityValidator.validateSQL(parameterizedQuery.sql, parameterizedQuery.parameters, config.security);
            if (!validation.isValid || !query.isValid) {
                throw this.createError(`SQL security validation failed: ${validation.errors.join(', ')}`, 'security', 'SQL_SECURITY_VALIDATION_FAILED', undefined, {
                    query: query.normalized,
                    errors: validation.errors,
                    riskLevel: validation.riskLevel
                });
            }
            // Execute query
            const sqlResult = await this.executeSQLQuery(sqlConnection, parameterizedQuery);
            // Apply result limiting and pagination
            const paginationResult = resultLimiter.paginateResults(sqlResult, 1, // Default to first page
            {
                pageSize: config.pagination?.pageSize,
                maxResults: config.pagination?.maxResults
            });
            // Transform to RawResult format
            return this.transformSQLResultsToRaw(paginationResult, sqlConnection);
        }, 'query');
    }
    /**
     * Disconnect from SQL database
     */
    async disconnect(connection) {
        const sqlConnection = connection;
        try {
            // Close database connection
            await this.closeDatabaseConnection(sqlConnection);
            // Remove from connection pool
            this.removeConnectionFromPool(sqlConnection);
            // Update status and cleanup
            sqlConnection.status = 'disconnected';
            this.updateConnectionStatus(connection.id, 'disconnected');
            this.removeConnection(connection.id);
        }
        catch (error) {
            throw this.createError(`Failed to disconnect from database: ${error.message}`, 'connection', 'SQL_DISCONNECT_FAILED', error, { connectionId: connection.id });
        }
    }
    /**
     * Validate SQL configuration
     */
    async validateConfig(config) {
        const sqlConfig = config;
        // Basic structure validation
        if (sqlConfig.type !== 'sql') {
            throw new ValidationError('Configuration type must be "sql"');
        }
        if (!sqlConfig.connection) {
            throw new ValidationError('SQL connection configuration is required');
        }
        if (!sqlConfig.query) {
            throw new ValidationError('SQL query configuration is required');
        }
        // Database type validation
        const supportedTypes = ['postgresql', 'mysql', 'sqlite'];
        if (!supportedTypes.includes(sqlConfig.connection.databaseType)) {
            throw new ValidationError(`Unsupported database type: ${sqlConfig.connection.databaseType}. ` +
                `Supported types: ${supportedTypes.join(', ')}`);
        }
        // Connection configuration validation
        if (!sqlConfig.connection.connectionString && !sqlConfig.connection.proxyEndpoint) {
            throw new ValidationError('Either connectionString or proxyEndpoint is required');
        }
        // Query configuration validation
        if (!sqlConfig.query.tableName || sqlConfig.query.tableName.trim() === '') {
            throw new ValidationError('Table name is required');
        }
        if (!sqlConfig.query.searchColumns || sqlConfig.query.searchColumns.length === 0) {
            throw new ValidationError('At least one search column is required');
        }
        // Validate query builder configuration
        const dialect = dialectFactory.getDialect(sqlConfig.connection.databaseType);
        const queryBuilder = queryBuilderFactory.getBuilder(dialect);
        queryBuilder.validateConfig(sqlConfig.query);
        // Connection string security validation
        if (sqlConfig.connection.connectionString) {
            const securityValidator = securityValidatorFactory.getValidator(sqlConfig.security);
            const connectionValidation = securityValidator.validateConnectionString(sqlConfig.connection.connectionString, sqlConfig.connection.databaseType);
            if (!connectionValidation.isValid) {
                throw new ValidationError(`Connection string security validation failed: ${connectionValidation.errors.join(', ')}`);
            }
        }
    }
    /**
     * Check SQL connection health
     */
    async healthCheck(connection) {
        try {
            const sqlConnection = connection;
            if (sqlConnection.status !== 'connected') {
                return false;
            }
            // Execute simple health check query
            const healthQuery = 'SELECT 1 as health_check';
            await this.executeSQLQuery(sqlConnection, {
                sql: healthQuery,
                parameters: [],
                metadata: { queryType: 'SELECT' }
            });
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get SQL adapter capabilities
     */
    getCapabilities() {
        return {
            supportsPooling: true,
            supportsRealTime: false,
            supportsPagination: true,
            supportsSorting: true,
            supportsFiltering: true,
            maxConcurrentConnections: 50,
            supportedQueryTypes: ['SELECT', 'INSERT', 'UPDATE', 'DELETE']
        };
    }
    /**
     * Execute INSERT operation
     */
    async insert(connection, tableName, data) {
        return this.executeWithMetrics(connection.id, async () => {
            const dialect = this.getDialect(connection.databaseType);
            const queryBuilder = queryBuilderFactory.getBuilder(dialect);
            const parameterizedQuery = queryBuilder.buildInsertQuery(tableName, data);
            const result = await this.executeSQLQuery(connection, parameterizedQuery);
            return {
                id: result.rowsAffected || 1,
                data: data,
                score: 1.0,
                matchedFields: [],
                metadata: {
                    source: 'sql',
                    operation: 'INSERT',
                    rowsAffected: result.rowsAffected
                }
            };
        }, 'insert');
    }
    /**
     * Execute UPDATE operation
     */
    async update(connection, tableName, data, whereConditions) {
        return this.executeWithMetrics(connection.id, async () => {
            const dialect = this.getDialect(connection.databaseType);
            const queryBuilder = queryBuilderFactory.getBuilder(dialect);
            const parameterizedQuery = queryBuilder.buildUpdateQuery(tableName, data, whereConditions);
            const result = await this.executeSQLQuery(connection, parameterizedQuery);
            return {
                id: result.rowsAffected || 0,
                data: data,
                score: 1.0,
                matchedFields: [],
                metadata: {
                    source: 'sql',
                    operation: 'UPDATE',
                    rowsAffected: result.rowsAffected
                }
            };
        }, 'update');
    }
    /**
     * Execute DELETE operation
     */
    async delete(connection, tableName, whereConditions) {
        return this.executeWithMetrics(connection.id, async () => {
            const dialect = this.getDialect(connection.databaseType);
            const queryBuilder = queryBuilderFactory.getBuilder(dialect);
            const parameterizedQuery = queryBuilder.buildDeleteQuery(tableName, whereConditions);
            const result = await this.executeSQLQuery(connection, parameterizedQuery);
            return {
                id: result.rowsAffected || 0,
                data: whereConditions,
                score: 1.0,
                matchedFields: [],
                metadata: {
                    source: 'sql',
                    operation: 'DELETE',
                    rowsAffected: result.rowsAffected
                }
            };
        }, 'delete');
    }
    /**
     * Get paginated results with count
     */
    async getPaginatedResults(connection, query, page = 1, pageSize = 20) {
        const config = this.getConnectionConfig(connection);
        const dialect = this.getDialect(connection.databaseType);
        const queryBuilder = queryBuilderFactory.getBuilder(dialect);
        const resultLimiter = resultLimiterFactory.getLimiter(config.pagination, config.performance);
        // Get total count
        const countQuery = queryBuilder.buildCountQuery(config.query, query);
        const countResult = await this.executeSQLQuery(connection, countQuery);
        const totalCount = countResult.rows[0]?.count || 0;
        // Get paginated data
        const offset = (page - 1) * pageSize;
        const searchQuery = queryBuilder.buildSearchQuery({
            ...config.query,
            orderBy: config.query.orderBy || [{ column: 'id', direction: 'ASC' }]
        }, query, { pageSize, maxResults: totalCount });
        // Add offset to SQL query
        searchQuery.sql += ` OFFSET ${offset}`;
        const dataResult = await this.executeSQLQuery(connection, searchQuery);
        return resultLimiter.paginateResults({ ...dataResult, totalCount }, page, { pageSize, maxResults: totalCount, enablePagination: true, paginationType: 'offset' });
    }
    /**
     * Create SQL connection object
     */
    createSQLConnection(connectionId, config) {
        const baseConnection = this.createConnection(connectionId, {
            databaseType: config.connection.databaseType,
            connectionString: config.connection.connectionString ?
                this.sanitizeConnectionString(config.connection.connectionString) : undefined,
            proxyEndpoint: config.connection.proxyEndpoint
        });
        return {
            ...baseConnection,
            databaseType: config.connection.databaseType,
            connectionString: config.connection.connectionString ?
                this.sanitizeConnectionString(config.connection.connectionString) : undefined,
            proxyEndpoint: config.connection.proxyEndpoint
        };
    }
    /**
     * Get database dialect for connection
     */
    getDialect(databaseType) {
        const cacheKey = databaseType;
        if (!this.dialectCache.has(cacheKey)) {
            const dialect = dialectFactory.getDialect(databaseType);
            this.dialectCache.set(cacheKey, dialect);
        }
        return this.dialectCache.get(cacheKey);
    }
    /**
     * Execute SQL query (mock implementation - would connect to actual database)
     */
    async executeSQLQuery(_connection, _query) {
        // This is a mock implementation
        // In a real implementation, this would execute the query against the actual database
        const startTime = performance.now();
        // Simulate query execution delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        const executionTime = performance.now() - startTime;
        // Mock result based on query type
        const queryType = query.metadata?.queryType || 'SELECT';
        switch (queryType) {
            case 'SELECT':
                return {
                    rows: [
                        { id: 1, name: 'Sample Result 1', description: 'Mock result for testing' },
                        { id: 2, name: 'Sample Result 2', description: 'Another mock result' }
                    ],
                    totalCount: 2,
                    executionTime,
                    metadata: {
                        columns: [
                            { name: 'id', type: 'INTEGER', nullable: false },
                            { name: 'name', type: 'VARCHAR', nullable: false },
                            { name: 'description', type: 'TEXT', nullable: true }
                        ]
                    }
                };
            case 'INSERT':
            case 'UPDATE':
            case 'DELETE':
                return {
                    rows: [],
                    rowsAffected: 1,
                    executionTime,
                    metadata: {
                        columns: []
                    }
                };
            default:
                throw new ValidationError(`Unsupported query type: ${queryType}`);
        }
    }
    /**
     * Transform SQL results to RawResult format
     */
    transformSQLResultsToRaw(paginationResult, connection) {
        return paginationResult.data.map((row, index) => ({
            id: row.id || `sql-${index}`,
            data: row,
            score: 1.0, // SQL results don't have natural relevance scoring
            matchedFields: [], // Would be populated based on search criteria
            metadata: {
                source: 'sql',
                database: connection.databaseType,
                connectionId: connection.id,
                page: paginationResult.page,
                totalCount: paginationResult.totalCount
            }
        }));
    }
    /**
     * Generate unique connection ID
     */
    generateConnectionId(config) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        const dbType = config.connection.databaseType;
        return `${dbType}_${timestamp}_${random}`;
    }
    /**
     * Sanitize connection string for logging
     */
    sanitizeConnectionString(connectionString) {
        const dialect = dialectFactory.getDialect('postgresql'); // Use any dialect for sanitization
        return dialect.sanitizeConnectionString(connectionString);
    }
    /**
     * Mock methods for actual database operations
     * These would be replaced with real database driver implementations
     */
    async validateConnectionSecurity(config) {
        if (config.connection.connectionString) {
            const securityValidator = securityValidatorFactory.getValidator(config.security);
            const validation = securityValidator.validateConnectionString(config.connection.connectionString, config.connection.databaseType);
            if (!validation.isValid) {
                throw new ValidationError(`Connection string validation failed: ${validation.errors.join(', ')}`);
            }
        }
    }
    async establishDatabaseConnection(_connection, _config) {
        // Mock implementation - would establish real database connection
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
    }
    async testConnection(_connection, _config) {
        // Mock implementation - would test actual database connection
        await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
    }
    async closeDatabaseConnection(_connection) {
        // Mock implementation - would close real database connection
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    }
    removeConnectionFromPool(connection) {
        // Mock implementation - would remove from actual connection pool
        this.connectionPools.delete(connection.id);
    }
    getConnectionConfig(connection) {
        // Mock implementation - would retrieve actual configuration
        return {
            type: 'sql',
            connection: {
                databaseType: connection.databaseType,
                connectionString: connection.connectionString,
                proxyEndpoint: connection.proxyEndpoint
            },
            query: {
                tableName: 'default_table',
                searchColumns: ['name', 'description']
            }
        };
    }
    sanitizeConfigForLogging(config) {
        return {
            type: config.type,
            connection: {
                databaseType: config.connection.databaseType,
                connectionString: config.connection.connectionString ? '***' : undefined,
                proxyEndpoint: config.connection.proxyEndpoint
            },
            query: config.query
        };
    }
}
/**
 * SQL adapter factory
 */
export class SQLAdapterFactory {
    /**
     * Get singleton SQL adapter instance
     */
    static getInstance() {
        if (!this.instance) {
            this.instance = new SQLAdapter();
        }
        return this.instance;
    }
    /**
     * Create new SQL adapter instance
     */
    static createAdapter() {
        return new SQLAdapter();
    }
    /**
     * Clear singleton instance
     */
    static clearInstance() {
        this.instance = null;
    }
}
SQLAdapterFactory.instance = null;
/**
 * Global SQL adapter factory instance
 */
export const sqlAdapterFactory = SQLAdapterFactory;
//# sourceMappingURL=SQLAdapter.js.map