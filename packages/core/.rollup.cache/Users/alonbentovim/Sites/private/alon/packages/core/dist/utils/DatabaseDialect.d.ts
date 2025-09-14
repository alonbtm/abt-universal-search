/**
 * Database Dialect Handler - Manages database-specific SQL syntax
 * @description Provides database-specific query syntax, features, and optimizations
 */
import type { DatabaseType, DatabaseDialectInfo, SQLQueryConfig } from '../types/Config';
/**
 * Database dialect handler for SQL generation
 */
export declare class DatabaseDialect {
    private readonly config;
    constructor(databaseType: DatabaseType, version?: string);
    /**
     * Get dialect configuration
     */
    getConfig(): DatabaseDialectInfo;
    /**
     * Quote an identifier (table, column name)
     */
    quoteIdentifier(identifier: string): string;
    /**
     * Create parameter placeholder for parameterized queries
     */
    createParameterPlaceholder(index: number): string;
    /**
     * Build LIMIT clause with optional OFFSET
     */
    buildLimitClause(limit: number, offset?: number): string;
    /**
     * Build ORDER BY clause
     */
    buildOrderByClause(orderBy: SQLQueryConfig['orderBy']): string;
    /**
     * Build WHERE clause with search conditions
     */
    buildSearchWhereClause(searchColumns: string[], searchTerm: string, caseSensitive?: boolean): {
        clause: string;
        parameters: string[];
    };
    /**
     * Build JOIN clauses
     */
    buildJoinClauses(joinTables: SQLQueryConfig['joinTables']): string;
    /**
     * Build GROUP BY clause
     */
    buildGroupByClause(groupBy: string[]): string;
    /**
     * Validate connection string format
     */
    validateConnectionString(connectionString: string): boolean;
    /**
     * Sanitize connection string for logging
     */
    sanitizeConnectionString(connectionString: string): string;
    /**
     * Get database-specific data types
     */
    getDataTypeMapping(): Record<string, string>;
    /**
     * Check if database supports a specific feature
     */
    supportsFeature(feature: keyof DatabaseDialectInfo['features']): boolean;
    /**
     * Adjust features based on database version
     */
    private adjustFeaturesForVersion;
    /**
     * Determine if full-text search should be used
     */
    private shouldUseFullTextSearch;
    /**
     * Build full-text search condition
     */
    private buildFullTextSearchCondition;
    /**
     * Build case-insensitive LIKE condition
     */
    private buildCaseInsensitiveLike;
}
/**
 * Database dialect factory
 */
export declare class DatabaseDialectFactory {
    private static dialects;
    /**
     * Get or create database dialect instance
     */
    static getDialect(databaseType: DatabaseType, version?: string): DatabaseDialect;
    /**
     * Clear dialect cache
     */
    static clearCache(): void;
}
/**
 * Global dialect factory instance
 */
export declare const dialectFactory: typeof DatabaseDialectFactory;
//# sourceMappingURL=DatabaseDialect.d.ts.map