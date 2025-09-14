/**
 * Result Limiter - Pagination and result limiting for SQL queries
 * @description Handles pagination, result limiting, and performance optimization
 */

import type { 
  SQLPaginationResult, 
  SQLCursor, 
  SQLResult,
  ConnectionMetrics 
} from '../types/Results';
import type { 
  SQLPaginationConfig, 
  SQLPerformanceConfig 
} from '../types/Config';
import { ValidationError } from './validation';

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
export class ResultLimiter {
  private queryCache = new Map<string, { result: SQLPaginationResult; timestamp: number }>();
  private performanceMetrics = new Map<string, ConnectionMetrics[]>();
  
  constructor(
    private config?: SQLPaginationConfig,
    private performanceConfig?: SQLPerformanceConfig
  ) {}

  /**
   * Apply pagination to SQL results
   */
  public paginateResults(
    results: SQLResult,
    page: number = 1,
    options?: Partial<PaginationOptions>
  ): SQLPaginationResult {
    const opts = this.mergeOptions(options);
    
    // Validate pagination parameters
    this.validatePaginationParams(page, opts);

    // Apply result limiting
    const limitedResults = this.limitResults(results.rows, opts);

    if (opts.paginationType === 'cursor' && opts.cursorColumn) {
      return this.buildCursorPaginationResult(limitedResults, results, opts);
    } else {
      return this.buildOffsetPaginationResult(limitedResults, results, page, opts);
    }
  }

  /**
   * Build offset-based pagination result
   */
  private buildOffsetPaginationResult(
    data: Record<string, unknown>[],
    originalResult: SQLResult,
    page: number,
    options: PaginationOptions
  ): SQLPaginationResult {
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
  private buildCursorPaginationResult(
    data: Record<string, unknown>[],
    originalResult: SQLResult,
    options: PaginationOptions
  ): SQLPaginationResult {
    const { pageSize, cursorColumn } = options;
    
    if (!cursorColumn) {
      throw new ValidationError('Cursor column is required for cursor-based pagination');
    }

    let nextCursor: SQLCursor | undefined;
    let previousCursor: SQLCursor | undefined;

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
  public estimatePaginationMetrics(
    totalRows: number,
    pageSize: number,
    currentPage: number = 1
  ): {
    totalPages: number;
    remainingRows: number;
    isLastPage: boolean;
    estimatedQueryTime: number;
  } {
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
  public createCursor(
    row: Record<string, unknown>,
    column: string,
    direction: 'next' | 'previous' = 'next'
  ): SQLCursor {
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
  public parseCursor(cursorString: string): SQLCursor {
    try {
      const decoded = Buffer.from(cursorString, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      
      if (!parsed.value || !parsed.column || !parsed.direction) {
        throw new Error('Invalid cursor format');
      }

      return parsed as SQLCursor;
    } catch (error) {
      throw new ValidationError(`Invalid cursor format: ${(error as Error).message}`);
    }
  }

  /**
   * Encode cursor to string representation
   */
  public encodeCursor(cursor: SQLCursor): string {
    const encoded = JSON.stringify(cursor);
    return Buffer.from(encoded, 'utf-8').toString('base64');
  }

  /**
   * Optimize result limiting based on query type
   */
  public optimizeResultLimiting(
    queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
    estimatedRows: number
  ): { 
    recommendedPageSize: number; 
    shouldUseIndex: boolean; 
    cacheResults: boolean;
  } {
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
  public cacheResult(
    key: string, 
    result: SQLPaginationResult, 
    ttlMs: number = 300000
  ): void {
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
  public getCachedResult(key: string): SQLPaginationResult | null {
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
  public generateCacheKey(
    sql: string,
    parameters: unknown[],
    page: number,
    pageSize: number
  ): string {
    const hash = this.simpleHash(sql + JSON.stringify(parameters));
    return `pagination:${hash}:${page}:${pageSize}`;
  }

  /**
   * Track performance metrics
   */
  public recordMetrics(
    queryKey: string,
    metrics: ConnectionMetrics
  ): void {
    if (!this.performanceConfig?.enableOptimization) {
      return;
    }

    if (!this.performanceMetrics.has(queryKey)) {
      this.performanceMetrics.set(queryKey, []);
    }

    const queryMetrics = this.performanceMetrics.get(queryKey)!;
    queryMetrics.push(metrics);

    // Keep only last 100 metrics per query
    if (queryMetrics.length > 100) {
      queryMetrics.shift();
    }
  }

  /**
   * Get performance insights
   */
  public getPerformanceInsights(
    queryKey: string
  ): {
    averageQueryTime: number;
    averageResultCount: number;
    successRate: number;
    recommendations: string[];
  } {
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

    const recommendations: string[] = [];
    
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
  private validatePaginationParams(page: number, options: PaginationOptions): void {
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
  private mergeOptions(options?: Partial<PaginationOptions>): PaginationOptions {
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
  private limitResults(
    rows: Record<string, unknown>[],
    options: PaginationOptions
  ): Record<string, unknown>[] {
    const { maxResults, pageSize } = options;
    
    // Apply global result limit first
    const limitedRows = rows.slice(0, maxResults);
    
    // Then apply page size limit
    return limitedRows.slice(0, pageSize);
  }

  /**
   * Estimate query execution time
   */
  private estimateQueryTime(totalRows: number, currentPage: number): number {
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
  private simpleHash(str: string): string {
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
  private cleanupCache(): void {
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
  public clearCache(): void {
    this.queryCache.clear();
  }

  /**
   * Clear performance metrics
   */
  public clearMetrics(): void {
    this.performanceMetrics.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    cacheSize: number;
    hitRate: number;
    avgResultSize: number;
  } {
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
  private static limiters = new Map<string, ResultLimiter>();

  /**
   * Get or create result limiter
   */
  public static getLimiter(
    paginationConfig?: SQLPaginationConfig,
    performanceConfig?: SQLPerformanceConfig
  ): ResultLimiter {
    const key = JSON.stringify({ 
      pagination: paginationConfig || {}, 
      performance: performanceConfig || {} 
    });
    
    if (!this.limiters.has(key)) {
      this.limiters.set(key, new ResultLimiter(paginationConfig, performanceConfig));
    }
    
    return this.limiters.get(key)!;
  }

  /**
   * Clear limiter cache
   */
  public static clearCache(): void {
    this.limiters.clear();
  }
}

/**
 * Global result limiter factory instance
 */
export const resultLimiterFactory = ResultLimiterFactory;