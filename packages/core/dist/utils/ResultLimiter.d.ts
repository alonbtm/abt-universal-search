/**
 * Result Limiter - Pagination and result limiting for SQL queries
 * @description Handles pagination, result limiting, and performance optimization
 */
import type { SQLPaginationResult, SQLCursor, SQLResult, ConnectionMetrics } from '../types/Results';
import type { SQLPaginationConfig, SQLPerformanceConfig } from '../types/Config';
/**
 * Pagination configuration with defaults
 */
interface PaginationOptions {
    pageSize: number;
    maxResults: number;
    enablePagination: boolean;
    paginationType: 'offset' | 'cursor';
    cursorColumn?: string;
}
/**
 * Result limiter with pagination and performance optimization
 */
export declare class ResultLimiter {
    private config?;
    private performanceConfig?;
    private queryCache;
    private performanceMetrics;
    constructor(config?: SQLPaginationConfig | undefined, performanceConfig?: SQLPerformanceConfig | undefined);
    /**
     * Apply pagination to SQL results
     */
    paginateResults(results: SQLResult, page?: number, options?: Partial<PaginationOptions>): SQLPaginationResult;
    /**
     * Build offset-based pagination result
     */
    private buildOffsetPaginationResult;
    /**
     * Build cursor-based pagination result
     */
    private buildCursorPaginationResult;
    /**
     * Estimate pagination metrics for query planning
     */
    estimatePaginationMetrics(totalRows: number, pageSize: number, currentPage?: number): {
        totalPages: number;
        remainingRows: number;
        isLastPage: boolean;
        estimatedQueryTime: number;
    };
    /**
     * Create cursor from result row
     */
    createCursor(row: Record<string, unknown>, column: string, direction?: 'next' | 'previous'): SQLCursor;
    /**
     * Parse cursor from string representation
     */
    parseCursor(cursorString: string): SQLCursor;
    /**
     * Encode cursor to string representation
     */
    encodeCursor(cursor: SQLCursor): string;
    /**
     * Optimize result limiting based on query type
     */
    optimizeResultLimiting(queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE', estimatedRows: number): {
        recommendedPageSize: number;
        shouldUseIndex: boolean;
        cacheResults: boolean;
    };
    /**
     * Cache pagination result
     */
    cacheResult(key: string, result: SQLPaginationResult, ttlMs?: number): void;
    /**
     * Get cached pagination result
     */
    getCachedResult(key: string): SQLPaginationResult | null;
    /**
     * Generate cache key for pagination result
     */
    generateCacheKey(sql: string, parameters: unknown[], page: number, pageSize: number): string;
    /**
     * Track performance metrics
     */
    recordMetrics(queryKey: string, metrics: ConnectionMetrics): void;
    /**
     * Get performance insights
     */
    getPerformanceInsights(queryKey: string): {
        averageQueryTime: number;
        averageResultCount: number;
        successRate: number;
        recommendations: string[];
    };
    /**
     * Validate pagination parameters
     */
    private validatePaginationParams;
    /**
     * Merge pagination options with defaults
     */
    private mergeOptions;
    /**
     * Apply result limiting to data array
     */
    private limitResults;
    /**
     * Estimate query execution time
     */
    private estimateQueryTime;
    /**
     * Simple hash function for cache keys
     */
    private simpleHash;
    /**
     * Clean up expired cache entries
     */
    private cleanupCache;
    /**
     * Clear all caches
     */
    clearCache(): void;
    /**
     * Clear performance metrics
     */
    clearMetrics(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        cacheSize: number;
        hitRate: number;
        avgResultSize: number;
    };
}
/**
 * Result limiter factory
 */
export declare class ResultLimiterFactory {
    private static limiters;
    /**
     * Get or create result limiter
     */
    static getLimiter(paginationConfig?: SQLPaginationConfig, performanceConfig?: SQLPerformanceConfig): ResultLimiter;
    /**
     * Clear limiter cache
     */
    static clearCache(): void;
}
/**
 * Global result limiter factory instance
 */
export declare const resultLimiterFactory: typeof ResultLimiterFactory;
export {};
//# sourceMappingURL=ResultLimiter.d.ts.map