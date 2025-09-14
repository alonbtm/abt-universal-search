/**
 * Performance monitoring utilities for Universal Search Component
 * @description Query processing performance tracking and optimization
 */

/**
 * Performance metrics for query processing
 */
export interface QueryPerformanceMetrics {
  /** Query processing start time */
  startTime: number;
  /** Query processing end time */
  endTime: number;
  /** Total processing duration in milliseconds */
  duration: number;
  /** Query string length */
  queryLength: number;
  /** Number of validation rules applied */
  validationRulesCount: number;
  /** Memory usage before processing (if available) */
  memoryBefore?: number;
  /** Memory usage after processing (if available) */
  memoryAfter?: number;
}

/**
 * Performance tracker for query operations
 */
export class PerformanceTracker {
  private metrics: Map<string, QueryPerformanceMetrics[]> = new Map();
  private currentOperation: Map<string, Partial<QueryPerformanceMetrics>> = new Map();

  /**
   * Start tracking performance for a query operation
   */
  public startTracking(operationId: string, queryLength: number, validationRulesCount: number): void {
    const startTime = performance.now();
    
    const memoryBefore = this.getMemoryUsage();
    this.currentOperation.set(operationId, {
      startTime,
      queryLength,
      validationRulesCount,
      ...(memoryBefore !== undefined && { memoryBefore })
    });
  }

  /**
   * End tracking performance for a query operation
   */
  public endTracking(operationId: string): QueryPerformanceMetrics | null {
    const operation = this.currentOperation.get(operationId);
    if (!operation || !operation.startTime) {
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - operation.startTime;
    const memoryAfter = this.getMemoryUsage();

    const metrics: QueryPerformanceMetrics = {
      startTime: operation.startTime,
      endTime,
      duration,
      queryLength: operation.queryLength || 0,
      validationRulesCount: operation.validationRulesCount || 0,
      ...(operation.memoryBefore !== undefined && { memoryBefore: operation.memoryBefore }),
      ...(memoryAfter !== undefined && { memoryAfter })
    };

    // Store metrics
    const operationMetrics = this.metrics.get(operationId) || [];
    operationMetrics.push(metrics);
    this.metrics.set(operationId, operationMetrics);

    // Clean up current operation
    this.currentOperation.delete(operationId);

    return metrics;
  }

  /**
   * Get performance metrics for an operation
   */
  public getMetrics(operationId: string): QueryPerformanceMetrics[] {
    return this.metrics.get(operationId) || [];
  }

  /**
   * Get all performance metrics for a category
   */
  public getAllMetrics(category: string = ''): QueryPerformanceMetrics[] {
    const allMetrics: QueryPerformanceMetrics[] = [];
    for (const [key, metrics] of this.metrics.entries()) {
      if (category === '' || key.includes(category)) {
        allMetrics.push(...metrics);
      }
    }
    return allMetrics;
  }

  /**
   * Get average performance metrics for an operation
   */
  public getAverageMetrics(operationId: string): Partial<QueryPerformanceMetrics> | null {
    const metrics = this.getMetrics(operationId);
    if (metrics.length === 0) {
      return null;
    }

    const totals = metrics.reduce((acc, metric) => ({
      duration: acc.duration + metric.duration,
      queryLength: acc.queryLength + metric.queryLength,
      validationRulesCount: acc.validationRulesCount + metric.validationRulesCount
    }), { duration: 0, queryLength: 0, validationRulesCount: 0 });

    return {
      duration: totals.duration / metrics.length,
      queryLength: totals.queryLength / metrics.length,
      validationRulesCount: totals.validationRulesCount / metrics.length
    };
  }

  /**
   * Clear all metrics
   */
  public clearMetrics(): void {
    this.metrics.clear();
    this.currentOperation.clear();
  }

  /**
   * Get memory usage (if available)
   */
  private getMemoryUsage(): number | undefined {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return undefined;
  }
}

/**
 * Global performance tracker instance
 */
export const performanceTracker = new PerformanceTracker();

/**
 * Performance optimization recommendations
 */
export interface PerformanceRecommendation {
  type: 'warning' | 'info' | 'critical';
  message: string;
  metric: keyof QueryPerformanceMetrics;
  threshold: number;
  currentValue: number;
}

/**
 * Analyze performance metrics and provide recommendations
 */
export function analyzePerformance(metrics: QueryPerformanceMetrics[]): PerformanceRecommendation[] {
  const recommendations: PerformanceRecommendation[] = [];
  
  if (metrics.length === 0) {
    return recommendations;
  }

  const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
  const maxDuration = Math.max(...metrics.map(m => m.duration));
  const avgQueryLength = metrics.reduce((sum, m) => sum + m.queryLength, 0) / metrics.length;

  // Check average processing time
  if (avgDuration > 10) {
    recommendations.push({
      type: 'warning',
      message: 'Average query processing time is high. Consider optimizing validation rules.',
      metric: 'duration',
      threshold: 10,
      currentValue: avgDuration
    });
  }

  // Check maximum processing time
  if (maxDuration > 50) {
    recommendations.push({
      type: 'critical',
      message: 'Some queries are taking too long to process. Review complex validation patterns.',
      metric: 'duration',
      threshold: 50,
      currentValue: maxDuration
    });
  }

  // Check query length patterns
  if (avgQueryLength > 100) {
    recommendations.push({
      type: 'info',
      message: 'Users are entering long queries. Consider adding query length limits.',
      metric: 'queryLength',
      threshold: 100,
      currentValue: avgQueryLength
    });
  }

  return recommendations;
}

/**
 * Simple performance measurement utility
 */
export function measurePerformance<T>(
  operation: () => T,
  label: string = 'operation'
): { result: T; duration: number } {
  const startTime = performance.now();
  const result = operation();
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  if (duration > 5) {
    console.warn(`Performance: ${label} took ${duration.toFixed(2)}ms`);
  }
  
  return { result, duration };
}