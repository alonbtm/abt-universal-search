/**
 * Database Service - Enhanced Security SQL Proxy Implementation
 * 
 * This service demonstrates a secure proxy pattern for SQL database operations,
 * providing connection pooling, parameterized queries, and comprehensive error handling.
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import mysql from 'mysql2/promise';
import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';

// Configuration interfaces
interface DatabaseConfig {
    type: 'postgresql' | 'mysql' | 'sqlite';
    connectionString?: string;
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    filename?: string; // For SQLite
}

interface ConnectionPoolConfig {
    min: number;
    max: number;
    idleTimeoutMs: number;
    connectionTimeoutMs: number;
    statementTimeout?: number;
}

interface SearchQuery {
    searchTerm: string;
    tableName: string;
    searchFields: string[];
    whereClause?: string;
    orderBy?: string;
    limit: number;
    offset?: number;
}

interface SearchResult {
    data: any[];
    total: number;
    executionTime: number;
    queryPlan?: any;
}

/**
 * Comprehensive Database Service with connection pooling and security features
 */
export class DatabaseService {
    private pgPool: Pool | null = null;
    private mysqlPool: mysql.Pool | null = null;
    private sqliteDb: Database | null = null;
    private config: DatabaseConfig;
    private poolConfig: ConnectionPoolConfig;
    private queryMetrics: Map<string, any[]> = new Map();

    constructor(config: DatabaseConfig, poolConfig: ConnectionPoolConfig = {
        min: 2,
        max: 10,
        idleTimeoutMs: 30000,
        connectionTimeoutMs: 2000,
        statementTimeout: 5000
    }) {
        this.config = this.validateConfig(config);
        this.poolConfig = poolConfig;
    }

    /**
     * Validate and sanitize database configuration
     */
    private validateConfig(config: DatabaseConfig): DatabaseConfig {
        if (!config.type || !['postgresql', 'mysql', 'sqlite'].includes(config.type)) {
            throw new Error('Invalid database type. Must be postgresql, mysql, or sqlite');
        }

        // Validate connection parameters based on database type
        switch (config.type) {
            case 'postgresql':
            case 'mysql':
                if (!config.connectionString && (!config.host || !config.database)) {
                    throw new Error(`${config.type} requires connectionString or host/database configuration`);
                }
                break;
            case 'sqlite':
                if (!config.filename) {
                    throw new Error('SQLite requires filename configuration');
                }
                break;
        }

        return { ...config };
    }

    /**
     * Initialize database connection with appropriate pooling
     */
    async connect(): Promise<void> {
        try {
            switch (this.config.type) {
                case 'postgresql':
                    await this.initializePostgreSQL();
                    break;
                case 'mysql':
                    await this.initializeMySQL();
                    break;
                case 'sqlite':
                    await this.initializeSQLite();
                    break;
            }
            
            console.log(`✅ ${this.config.type} connection established successfully`);
        } catch (error) {
            console.error(`❌ Failed to connect to ${this.config.type}:`, error);
            throw new Error(`Database connection failed: ${error.message}`);
        }
    }

    /**
     * Initialize PostgreSQL connection pool
     */
    private async initializePostgreSQL(): Promise<void> {
        const poolConfig = {
            connectionString: this.config.connectionString,
            host: this.config.host,
            port: this.config.port || 5432,
            database: this.config.database,
            user: this.config.username,
            password: this.config.password,
            min: this.poolConfig.min,
            max: this.poolConfig.max,
            idleTimeoutMillis: this.poolConfig.idleTimeoutMs,
            connectionTimeoutMillis: this.poolConfig.connectionTimeoutMs,
            statement_timeout: this.poolConfig.statementTimeout,
            query_timeout: this.poolConfig.statementTimeout,
            application_name: 'universal-search-proxy',
            keepAlive: true,
            keepAliveInitialDelayMillis: 10000,
            // Security settings
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        };

        this.pgPool = new Pool(poolConfig);
        
        // Test connection
        const client = await this.pgPool.connect();
        await client.query('SELECT 1');
        client.release();
    }

    /**
     * Initialize MySQL connection pool
     */
    private async initializeMySQL(): Promise<void> {
        const poolConfig = {
            uri: this.config.connectionString,
            host: this.config.host,
            port: this.config.port || 3306,
            database: this.config.database,
            user: this.config.username,
            password: this.config.password,
            connectionLimit: this.poolConfig.max,
            acquireTimeout: this.poolConfig.connectionTimeoutMs,
            timeout: this.poolConfig.statementTimeout,
            reconnect: true,
            charset: 'utf8mb4',
            // Security and performance settings
            ssl: process.env.NODE_ENV === 'production' ? {} : false,
            supportBigNumbers: true,
            bigNumberStrings: true,
            dateStrings: false,
            debug: false
        };

        this.mysqlPool = mysql.createPool(poolConfig);
        
        // Test connection
        const connection = await this.mysqlPool.getConnection();
        await connection.execute('SELECT 1');
        connection.release();
    }

    /**
     * Initialize SQLite connection with WAL mode for better concurrency
     */
    private async initializeSQLite(): Promise<void> {
        this.sqliteDb = await open({
            filename: this.config.filename!,
            driver: sqlite3.Database
        });

        // Configure SQLite for optimal performance
        await this.sqliteDb.exec(`
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            PRAGMA cache_size = -64000;
            PRAGMA temp_store = MEMORY;
            PRAGMA mmap_size = 268435456;
        `);
    }

    /**
     * Execute parameterized search query with security validation
     */
    async search(query: SearchQuery): Promise<SearchResult> {
        const startTime = Date.now();
        
        try {
            // Validate and sanitize search parameters
            const validatedQuery = this.validateSearchQuery(query);
            
            let result: SearchResult;
            switch (this.config.type) {
                case 'postgresql':
                    result = await this.searchPostgreSQL(validatedQuery);
                    break;
                case 'mysql':
                    result = await this.searchMySQL(validatedQuery);
                    break;
                case 'sqlite':
                    result = await this.searchSQLite(validatedQuery);
                    break;
                default:
                    throw new Error(`Unsupported database type: ${this.config.type}`);
            }
            
            const executionTime = Date.now() - startTime;
            result.executionTime = executionTime;
            
            // Record metrics for monitoring
            this.recordQueryMetrics(query, result, executionTime);
            
            return result;
        } catch (error) {
            const executionTime = Date.now() - startTime;
            console.error('Search query failed:', {
                query,
                error: error.message,
                executionTime,
                database: this.config.type
            });
            throw error;
        }
    }

    /**
     * Validate and sanitize search query parameters
     */
    private validateSearchQuery(query: SearchQuery): SearchQuery {
        // Validate required fields
        if (!query.searchTerm || typeof query.searchTerm !== 'string') {
            throw new Error('Search term is required and must be a string');
        }

        if (!query.tableName || typeof query.tableName !== 'string') {
            throw new Error('Table name is required and must be a string');
        }

        if (!Array.isArray(query.searchFields) || query.searchFields.length === 0) {
            throw new Error('Search fields must be a non-empty array');
        }

        // Sanitize table and column names (whitelist approach)
        const validTableName = this.sanitizeIdentifier(query.tableName);
        const validSearchFields = query.searchFields.map(field => this.sanitizeIdentifier(field));
        
        // Validate limit
        const limit = Math.min(Math.max(1, query.limit || 20), 100); // Between 1 and 100
        const offset = Math.max(0, query.offset || 0);

        return {
            ...query,
            tableName: validTableName,
            searchFields: validSearchFields,
            limit,
            offset,
            searchTerm: query.searchTerm.trim()
        };
    }

    /**
     * Sanitize SQL identifiers (table/column names)
     */
    private sanitizeIdentifier(identifier: string): string {
        // Only allow alphanumeric characters, underscores, and specific safe characters
        const sanitized = identifier.replace(/[^a-zA-Z0-9_]/g, '');
        if (sanitized !== identifier || sanitized.length === 0) {
            throw new Error(`Invalid identifier: ${identifier}`);
        }
        return sanitized;
    }

    /**
     * Execute PostgreSQL search with full-text search capabilities
     */
    private async searchPostgreSQL(query: SearchQuery): Promise<SearchResult> {
        if (!this.pgPool) throw new Error('PostgreSQL pool not initialized');

        const client = await this.pgPool.connect();
        
        try {
            // Build parameterized query with TSVECTOR search
            const searchFieldsSQL = query.searchFields.map(field => `${field}`).join(' || \' \' || ');
            const whereClause = query.whereClause ? `AND (${query.whereClause})` : '';
            
            const searchSQL = `
                SELECT *, 
                       ts_rank(to_tsvector('english', ${searchFieldsSQL}), to_tsquery('english', $1)) as relevance_score
                FROM ${query.tableName}
                WHERE to_tsvector('english', ${searchFieldsSQL}) @@ to_tsquery('english', $1)
                ${whereClause}
                ORDER BY relevance_score DESC, ${query.orderBy || 'id'}
                LIMIT $2 OFFSET $3
            `;

            const countSQL = `
                SELECT COUNT(*) as total
                FROM ${query.tableName}
                WHERE to_tsvector('english', ${searchFieldsSQL}) @@ to_tsquery('english', $1)
                ${whereClause}
            `;

            // Convert search term to tsquery format
            const tsqueryTerm = query.searchTerm
                .split(/\s+/)
                .filter(term => term.length > 0)
                .join(' & ');

            // Execute queries in parallel
            const [searchResult, countResult] = await Promise.all([
                client.query(searchSQL, [tsqueryTerm, query.limit, query.offset]),
                client.query(countSQL, [tsqueryTerm])
            ]);

            return {
                data: searchResult.rows,
                total: parseInt(countResult.rows[0].total),
                executionTime: 0 // Will be set by caller
            };
        } finally {
            client.release();
        }
    }

    /**
     * Execute MySQL search with FULLTEXT capabilities
     */
    private async searchMySQL(query: SearchQuery): Promise<SearchResult> {
        if (!this.mysqlPool) throw new Error('MySQL pool not initialized');

        const connection = await this.mysqlPool.getConnection();
        
        try {
            const searchFields = query.searchFields.join(', ');
            const whereClause = query.whereClause ? `AND (${query.whereClause})` : '';
            
            const searchSQL = `
                SELECT *, MATCH(${searchFields}) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance_score
                FROM ${query.tableName}
                WHERE MATCH(${searchFields}) AGAINST(? IN NATURAL LANGUAGE MODE)
                ${whereClause}
                ORDER BY relevance_score DESC, ${query.orderBy || 'id'}
                LIMIT ? OFFSET ?
            `;

            const countSQL = `
                SELECT COUNT(*) as total
                FROM ${query.tableName}
                WHERE MATCH(${searchFields}) AGAINST(? IN NATURAL LANGUAGE MODE)
                ${whereClause}
            `;

            // Execute queries
            const [searchResult] = await connection.execute(searchSQL, 
                [query.searchTerm, query.searchTerm, query.limit, query.offset]);
            const [countResult] = await connection.execute(countSQL, [query.searchTerm]);

            return {
                data: searchResult as any[],
                total: (countResult as any[])[0].total,
                executionTime: 0
            };
        } finally {
            connection.release();
        }
    }

    /**
     * Execute SQLite search with FTS5
     */
    private async searchSQLite(query: SearchQuery): Promise<SearchResult> {
        if (!this.sqliteDb) throw new Error('SQLite database not initialized');

        // Assume FTS virtual table exists with _fts suffix
        const ftsTable = `${query.tableName}_fts`;
        const whereClause = query.whereClause ? `AND (${query.whereClause})` : '';
        
        const searchSQL = `
            SELECT d.*, bm25(fts, 1.0, 0.5, 0.3) as relevance_score
            FROM ${query.tableName} d
            JOIN (
                SELECT rowid
                FROM ${ftsTable}
                WHERE ${ftsTable} MATCH ?
                ORDER BY bm25(${ftsTable}, 1.0, 0.5, 0.3)
                LIMIT ? OFFSET ?
            ) fts ON d.id = fts.rowid
            ${whereClause}
            ORDER BY relevance_score
        `;

        const countSQL = `
            SELECT COUNT(*) as total
            FROM ${ftsTable}
            WHERE ${ftsTable} MATCH ?
        `;

        // Execute queries
        const [searchResult, countResult] = await Promise.all([
            this.sqliteDb.all(searchSQL, [query.searchTerm, query.limit, query.offset]),
            this.sqliteDb.get(countSQL, [query.searchTerm])
        ]);

        return {
            data: searchResult,
            total: countResult.total,
            executionTime: 0
        };
    }

    /**
     * Record query metrics for performance monitoring
     */
    private recordQueryMetrics(query: SearchQuery, result: SearchResult, executionTime: number): void {
        const metrics = {
            timestamp: new Date().toISOString(),
            database: this.config.type,
            tableName: query.tableName,
            searchTerm: query.searchTerm,
            resultCount: result.data.length,
            totalResults: result.total,
            executionTime,
            limit: query.limit,
            offset: query.offset
        };

        // Store recent metrics (keep last 100 queries)
        const queryKey = `${query.tableName}_search`;
        if (!this.queryMetrics.has(queryKey)) {
            this.queryMetrics.set(queryKey, []);
        }
        
        const queryList = this.queryMetrics.get(queryKey)!;
        queryList.push(metrics);
        
        // Keep only last 100 queries
        if (queryList.length > 100) {
            queryList.shift();
        }

        // Log slow queries
        if (executionTime > 100) {
            console.warn('Slow query detected:', metrics);
        }
    }

    /**
     * Get performance metrics for monitoring
     */
    getMetrics(): any {
        const allMetrics: any = {};
        
        for (const [key, metrics] of this.queryMetrics) {
            const recentMetrics = metrics.slice(-10); // Last 10 queries
            allMetrics[key] = {
                recentQueries: recentMetrics,
                averageExecutionTime: recentMetrics.reduce((sum, m) => sum + m.executionTime, 0) / recentMetrics.length,
                totalQueries: metrics.length
            };
        }

        return allMetrics;
    }

    /**
     * Health check for database connectivity
     */
    async healthCheck(): Promise<{ status: string; details: any }> {
        try {
            const startTime = Date.now();
            
            switch (this.config.type) {
                case 'postgresql':
                    if (!this.pgPool) throw new Error('Pool not initialized');
                    const client = await this.pgPool.connect();
                    await client.query('SELECT 1');
                    client.release();
                    break;
                case 'mysql':
                    if (!this.mysqlPool) throw new Error('Pool not initialized');
                    const connection = await this.mysqlPool.getConnection();
                    await connection.execute('SELECT 1');
                    connection.release();
                    break;
                case 'sqlite':
                    if (!this.sqliteDb) throw new Error('Database not initialized');
                    await this.sqliteDb.get('SELECT 1');
                    break;
            }

            const responseTime = Date.now() - startTime;
            
            return {
                status: 'healthy',
                details: {
                    database: this.config.type,
                    responseTime,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                details: {
                    database: this.config.type,
                    error: error.message,
                    timestamp: new Date().toISOString()
                }
            };
        }
    }

    /**
     * Close database connections gracefully
     */
    async close(): Promise<void> {
        try {
            switch (this.config.type) {
                case 'postgresql':
                    if (this.pgPool) {
                        await this.pgPool.end();
                        this.pgPool = null;
                    }
                    break;
                case 'mysql':
                    if (this.mysqlPool) {
                        await this.mysqlPool.end();
                        this.mysqlPool = null;
                    }
                    break;
                case 'sqlite':
                    if (this.sqliteDb) {
                        await this.sqliteDb.close();
                        this.sqliteDb = null;
                    }
                    break;
            }
            console.log(`✅ ${this.config.type} connection closed successfully`);
        } catch (error) {
            console.error(`❌ Error closing ${this.config.type} connection:`, error);
        }
    }
}

export default DatabaseService;