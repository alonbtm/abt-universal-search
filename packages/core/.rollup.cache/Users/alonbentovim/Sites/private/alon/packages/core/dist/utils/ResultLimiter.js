/**
 * Result Limiter - Pagination and result limiting for SQL queries
 * @description Handles pagination, result limiting, and performance optimization
 */
import { ValidationError } from './validation';
/**
 * Result limiter with pagination and performance optimization
 */
export class ResultLimiter {
    constructor(config, performanceConfig) {
        this.config = config;
        this.performanceConfig = performanceConfig;
        this.queryCache = new Map();
        this.performanceMetrics = new Map();
    }
    /**
     * Apply pagination to SQL results
     */
    paginateResults(results, page = 1, options) {
        const opts = this.mergeOptions(options);
        // Validate pagination parameters
        this.validatePaginationParams(page, opts);
        // Apply result limiting
        const limitedResults = this.limitResults(results.rows, opts);
        if (opts.paginationType === 'cursor' && opts.cursorColumn) {
            return this.buildCursorPaginationResult(limitedResults, results, opts);
        }
        else {
            return this.buildOffsetPaginationResult(limitedResults, results, page, opts);
        }
    }
    /**
     * Build offset-based pagination result
     */
    buildOffsetPaginationResult(data, originalResult, page, options) {
        const { pageSize, maxResults } = options;
        const totalCount = originalResult.totalCount || data.length;
        const totalPages = Math.ceil(Math.min(totalCount, maxResults) / pageSize);
        return {
            data,
            page,
            totalPages,
            totalCount,
            pageSize,
            hasNext: page < totalPages,
            hasPrevious: page > 1
        };
    }
    /**
     * Build cursor-based pagination result
     */
    buildCursorPaginationResult(data, originalResult, options) {
        const { pageSize, cursorColumn } = options;
        if (!cursorColumn) {
            throw new ValidationError('Cursor column is required for cursor-based pagination');
        }
        let nextCursor;
        let previousCursor;
        if (data.length > 0) {
            const lastRow = data[data.length - 1];
            const firstRow = data[0];
            if (lastRow[cursorColumn] !== undefined) {
                nextCursor = {
                    value: lastRow[cursorColumn],
                    column: cursorColumn,
                    direction: 'next'
                };
            }
            if (firstRow[cursorColumn] !== undefined) {
                previousCursor = {
                    value: firstRow[cursorColumn],
                    column: cursorColumn,
                    direction: 'previous'
                };
            }
        }
        return {
            data,
            pageSize,
            nextCursor,
            previousCursor,
            hasNext: data.length === pageSize, // If we got a full page, there might be more
            hasPrevious: false // Cannot determine without additional query
        };
    }
    /**
     * Estimate pagination metrics for query planning
     */
    estimatePaginationMetrics(totalRows, pageSize, currentPage = 1) {
        const totalPages = Math.ceil(totalRows / pageSize);
        const remainingRows = Math.max(0, totalRows - (currentPage * pageSize));
        const isLastPage = currentPage >= totalPages;
        // Estimate query time based on historical metrics
        const estimatedQueryTime = this.estimateQueryTime(totalRows, currentPage);
        return {
            totalPages,
            remainingRows,
            isLastPage,
            estimatedQueryTime
        };
    }
    /**
     * Create cursor from result row
     */
    createCursor(row, column, direction = 'next') {
        if (!(column in row)) {
            throw new ValidationError(`Cursor column '${column}' not found in row`);
        }
        return {
            value: row[column],
            column,
            direction
        };
    }
    /**
     * Parse cursor from string representation
     */
    parseCursor(cursorString) {
        try {
            const decoded = Buffer.from(cursorString, 'base64').toString('utf-8');
            const parsed = JSON.parse(decoded);
            if (!parsed.value || !parsed.column || !parsed.direction) {
                throw new Error('Invalid cursor format');
            }
            return parsed;
        }
        catch (error) {
            throw new ValidationError(`Invalid cursor format: ${error.message}`);
        }
    }
    /**
     * Encode cursor to string representation
     */
    encodeCursor(cursor) {
        const encoded = JSON.stringify(cursor);
        return Buffer.from(encoded, 'utf-8').toString('base64');
    }
    /**
     * Optimize result limiting based on query type
     */
    optimizeResultLimiting(queryType, estimatedRows) {
        let recommendedPageSize = this.config?.pageSize || 20;
        let shouldUseIndex = false;
        let cacheResults = false;
        // Adjust based on query type and size
        if (queryType === 'SELECT') {
            if (estimatedRows > 10000) {
                recommendedPageSize = Math.min(recommendedPageSize, 50);
                shouldUseIndex = true;
            }
            if (estimatedRows < 1000) {
                cacheResults = this.performanceConfig?.enableQueryCache || false;
            }
        }
        return {
            recommendedPageSize,
            shouldUseIndex,
            cacheResults
        };
    }
    /**
     * Cache pagination result
     */
    cacheResult(key, result, ttlMs = 300000) {
        if (!this.performanceConfig?.enableQueryCache) {
            return;
        }
        this.queryCache.set(key, {
            result: { ...result },
            timestamp: Date.now() + ttlMs
        });
        // Clean up expired entries
        this.cleanupCache();
    }
    /**
     * Get cached pagination result
     */
    getCachedResult(key) {
        const cached = this.queryCache.get(key);
        if (!cached) {
            return null;
        }
        if (Date.now() > cached.timestamp) {
            this.queryCache.delete(key);
            return null;
        }
        return { ...cached.result };
    }
    /**
     * Generate cache key for pagination result
     */
    generateCacheKey(sql, parameters, page, pageSize) {
        const hash = this.simpleHash(sql + JSON.stringify(parameters));
        return `pagination:${hash}:${page}:${pageSize}`;
    }
    /**
     * Track performance metrics
     */
    recordMetrics(queryKey, metrics) {
        if (!this.performanceConfig?.enableOptimization) {
            return;
        }
        if (!this.performanceMetrics.has(queryKey)) {
            this.performanceMetrics.set(queryKey, []);
        }
        const queryMetrics = this.performanceMetrics.get(queryKey);
        queryMetrics.push(metrics);
        // Keep only last 100 metrics per query
        if (queryMetrics.length > 100) {
            queryMetrics.shift();
        }
    }
    /**
     * Get performance insights
     */
    getPerformanceInsights(queryKey) {
        const metrics = this.performanceMetrics.get(queryKey);
        if (!metrics || metrics.length === 0) {
            return {
                averageQueryTime: 0,
                averageResultCount: 0,
                successRate: 0,
                recommendations: ['Insufficient data for analysis']
            };
        }
        const avgQueryTime = metrics.reduce((sum, m) => sum + m.queryTime, 0) / metrics.length;
        const avgResultCount = metrics.reduce((sum, m) => sum + m.resultCount, 0) / metrics.length;
        const successRate = metrics.filter(m => m.success).length / metrics.length;
        const recommendations = [];
        if (avgQueryTime > 1000) {
            recommendations.push('Consider adding database indexes for better performance');
        }
        if (avgResultCount > 1000) {
            recommendations.push('Consider reducing page size for better user experience');
        }
        if (successRate < 0.9) {
            recommendations.push('High error rate detected, review query logic and error handling');
        }
        return {
            averageQueryTime: Math.round(avgQueryTime),
            averageResultCount: Math.round(avgResultCount),
            successRate: Math.round(successRate * 100) / 100,
            recommendations
        };
    }
    /**
     * Validate pagination parameters
     */
    validatePaginationParams(page, options) {
        if (!Number.isInteger(page) || page < 1) {
            throw new ValidationError('Page must be a positive integer');
        }
        if (!Number.isInteger(options.pageSize) || options.pageSize < 1) {
            throw new ValidationError('Page size must be a positive integer');
        }
        if (options.pageSize > 1000) {
            throw new ValidationError('Page size cannot exceed 1000 rows');
        }
        if (!Number.isInteger(options.maxResults) || options.maxResults < 1) {
            throw new ValidationError('Max results must be a positive integer');
        }
        if (options.paginationType === 'cursor' && !options.cursorColumn) {
            throw new ValidationError('Cursor column is required for cursor-based pagination');
        }
    }
    /**
     * Merge pagination options with defaults
     */
    mergeOptions(options) {
        return {
            pageSize: options?.pageSize || this.config?.pageSize || 20,
            maxResults: options?.maxResults || this.config?.maxResults || 1000,
            enablePagination: options?.enablePagination ?? this.config?.enablePagination ?? true,
            paginationType: options?.paginationType || this.config?.paginationType || 'offset',
            cursorColumn: options?.cursorColumn || this.config?.cursorColumn
        };
    }
    /**
     * Apply result limiting to data array
     */
    limitResults(rows, options) {
        const { maxResults, pageSize } = options;
        // Apply global result limit first
        const limitedRows = rows.slice(0, maxResults);
        // Then apply page size limit
        return limitedRows.slice(0, pageSize);
    }
    /**
     * Estimate query execution time
     */
    estimateQueryTime(totalRows, currentPage) {
        // Base time estimation (very rough)
        let baseTime = Math.max(50, Math.log10(totalRows) * 10);
        // Pagination penalty for deeper pages
        if (currentPage > 10) {
            baseTime *= 1 + (currentPage - 10) * 0.1;
        }
        return Math.round(baseTime);
    }
    /**
     * Simple hash function for cache keys
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }
    /**
     * Clean up expired cache entries
     */
    cleanupCache() {
        const now = Date.now();
        for (const [key, cached] of this.queryCache.entries()) {
            if (now > cached.timestamp) {
                this.queryCache.delete(key);
            }
        }
    }
    /**
     * Clear all caches
     */
    clearCache() {
        this.queryCache.clear();
    }
    /**
     * Clear performance metrics
     */
    clearMetrics() {
        this.performanceMetrics.clear();
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        const cacheSize = this.queryCache.size;
        // Calculate average result size (approximate)
        let totalSize = 0;
        let count = 0;
        for (const cached of this.queryCache.values()) {
            totalSize += cached.result.data.length;
            count++;
        }
        const avgResultSize = count > 0 ? Math.round(totalSize / count) : 0;
        return {
            cacheSize,
            hitRate: 0, // Would need request tracking to calculate
            avgResultSize
        };
    }
}
/**
 * Result limiter factory
 */
export class ResultLimiterFactory {
    /**
     * Get or create result limiter
     */
    static getLimiter(paginationConfig, performanceConfig) {
        const key = JSON.stringify({
            pagination: paginationConfig || {},
            performance: performanceConfig || {}
        });
        if (!this.limiters.has(key)) {
            this.limiters.set(key, new ResultLimiter(paginationConfig, performanceConfig));
        }
        return this.limiters.get(key);
    }
    /**
     * Clear limiter cache
     */
    static clearCache() {
        this.limiters.clear();
    }
}
ResultLimiterFactory.limiters = new Map();
/**
 * Global result limiter factory instance
 */
export const resultLimiterFactory = ResultLimiterFactory;
//# sourceMappingURL=ResultLimiter.js.map