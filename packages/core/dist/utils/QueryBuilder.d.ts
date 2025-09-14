/**
 * Query Builder - Generates parameterized SQL queries
 * @description Builds secure SQL queries with parameter binding and injection prevention
 */
import type { SQLQueryConfig, SQLPaginationConfig } from '../types/Config';
import type { ParameterizedQuery, ProcessedQuery } from '../types/Results';
import { DatabaseDialect } from './DatabaseDialect';
/**
 * SQL query builder with parameterization and security
 */
export declare class QueryBuilder {
    private dialect;
    private parameterIndex;
    private parameters;
    constructor(dialect: DatabaseDialect);
    /**
     * Build a complete SELECT query for search
     */
    buildSearchQuery(config: SQLQueryConfig, query: ProcessedQuery, pagination?: SQLPaginationConfig): ParameterizedQuery;
    /**
     * Build SELECT clause with column selection
     */
    private buildSelectClause;
    /**
     * Build FROM clause
     */
    private buildFromClause;
    /**
     * Build JOIN clauses
     */
    private buildJoinClauses;
    /**
     * Build WHERE clause with search conditions
     */
    private buildWhereClause;
    /**
     * Build GROUP BY clause
     */
    private buildGroupByClause;
    /**
     * Build HAVING clause
     */
    private buildHavingClause;
    /**
     * Build ORDER BY clause
     */
    private buildOrderByClause;
    /**
     * Build LIMIT clause with pagination
     */
    private buildLimitClause;
    /**
     * Build INSERT query
     */
    buildInsertQuery(tableName: string, data: Record<string, unknown>): ParameterizedQuery;
    /**
     * Build UPDATE query
     */
    buildUpdateQuery(tableName: string, data: Record<string, unknown>, whereConditions: Record<string, unknown>): ParameterizedQuery;
    /**
     * Build DELETE query
     */
    buildDeleteQuery(tableName: string, whereConditions: Record<string, unknown>): ParameterizedQuery;
    /**
     * Build COUNT query for pagination
     */
    buildCountQuery(config: SQLQueryConfig, query: ProcessedQuery): ParameterizedQuery;
    /**
     * Build query for cursor-based pagination
     */
    buildCursorQuery(config: SQLQueryConfig, query: ProcessedQuery, cursorColumn: string, cursorValue: unknown, direction: 'next' | 'previous', pageSize: number): ParameterizedQuery;
    /**
     * Validate query configuration
     */
    validateConfig(config: SQLQueryConfig): void;
    /**
     * Reset parameter tracking
     */
    private resetParameters;
    /**
     * Infer parameter types from values
     */
    private inferParameterTypes;
    /**
     * Check if string contains SQL functions
     */
    private containsSQLFunction;
    /**
     * Check if string is a valid SQL identifier
     */
    private isValidIdentifier;
    /**
     * Get current parameter count
     */
    getParameterCount(): number;
    /**
     * Get current parameters
     */
    getParameters(): unknown[];
}
/**
 * Query builder factory
 */
export declare class QueryBuilderFactory {
    private static builders;
    /**
     * Get or create query builder for dialect
     */
    static getBuilder(dialect: DatabaseDialect): QueryBuilder;
    /**
     * Clear builder cache
     */
    static clearCache(): void;
}
/**
 * Global query builder factory instance
 */
export declare const queryBuilderFactory: typeof QueryBuilderFactory;
//# sourceMappingURL=QueryBuilder.d.ts.map