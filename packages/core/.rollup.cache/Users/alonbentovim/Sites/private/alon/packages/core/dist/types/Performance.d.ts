/**
 * Performance Types - Type definitions for performance optimization and monitoring
 * @description TypeScript interfaces for performance monitoring, optimization, and memory management
 */
/**
 * Performance configuration
 */
export interface PerformanceConfig {
    /** Target response time in milliseconds */
    responseTimeTarget: number;
    /** Memory usage threshold in bytes */
    memoryThreshold: number;
    /** Enable performance monitoring */
    monitoringEnabled: boolean;
    /** Monitoring sample rate (0-1) */
    sampleRate: number;
    /** Performance metrics collection interval */
    metricsInterval: number;
    /** Enable automatic optimization */
    autoOptimization: boolean;
    /** Optimization triggers */
    optimizationTriggers: {
        responseTimeThreshold: number;
        memoryThreshold: number;
        errorRateThreshold: number;
        cacheHitRateThreshold: number;
    };
    /** Performance alerting */
    alerting: {
        enabled: boolean;
        channels: string[];
        thresholds: Record<string, number>;
    };
}
/**
 * Performance metrics
 */
export interface PerformanceMetrics {
    /** Response time metrics */
    responseTime: {
        average: number;
        median: number;
        p95: number;
        p99: number;
        min: number;
        max: number;
    };
    /** Throughput metrics */
    throughput: {
        requestsPerSecond: number;
        totalRequests: number;
        successfulRequests: number;
        failedRequests: number;
    };
    /** Memory metrics */
    memory: {
        heapUsed: number;
        heapTotal: number;
        external: number;
        rss: number;
        cacheSize: number;
    };
    /** CPU metrics */
    cpu: {
        usage: number;
        loadAverage: number[];
    };
    /** Cache metrics */
    cache: {
        hitRate: number;
        missRate: number;
        evictionRate: number;
        averageGetTime: number;
        averageSetTime: number;
    };
    /** Error metrics */
    errors: {
        totalErrors: number;
        errorRate: number;
        errorsByType: Record<string, number>;
    };
    /** Time window for metrics */
    timeWindow: {
        start: number;
        end: number;
        duration: number;
    };
}
/**
 * Performance measurement
 */
export interface PerformanceMeasurement {
    /** Measurement ID */
    id: string;
    /** Operation name */
    operation: string;
    /** Start timestamp */
    startTime: number;
    /** End timestamp */
    endTime?: number;
    /** Duration in milliseconds */
    duration?: number;
    /** Memory usage before operation */
    memoryBefore?: number;
    /** Memory usage after operation */
    memoryAfter?: number;
    /** Operation success status */
    success?: boolean;
    /** Error information */
    error?: string;
    /** Additional metadata */
    metadata?: Record<string, any>;
    /** Parent measurement ID */
    parentId?: string;
    /** Child measurements */
    children?: PerformanceMeasurement[];
}
/**
 * Query optimization result
 */
export interface QueryOptimizationResult {
    /** Original query */
    originalQuery: string;
    /** Optimized query */
    optimizedQuery: string;
    /** Optimization techniques applied */
    optimizations: Array<{
        type: 'index' | 'join' | 'where' | 'select' | 'parameterization';
        description: string;
        impact: 'low' | 'medium' | 'high';
    }>;
    /** Estimated performance improvement */
    estimatedImprovement: {
        executionTime: number;
        memoryUsage: number;
        ioOperations: number;
    };
    /** Indexing recommendations */
    indexRecommendations: Array<{
        table: string;
        columns: string[];
        type: 'btree' | 'hash' | 'gin' | 'gist';
        reason: string;
        priority: number;
    }>;
    /** Query complexity score */
    complexityScore: number;
    /** Confidence in optimization */
    confidence: number;
}
/**
 * Query execution plan
 */
export interface QueryExecutionPlan {
    /** Plan nodes */
    nodes: Array<{
        id: string;
        type: 'Scan' | 'Join' | 'Sort' | 'Aggregate' | 'Filter';
        table?: string;
        cost: number;
        rows: number;
        time: number;
        children?: string[];
        details: Record<string, any>;
    }>;
    /** Total execution time */
    totalTime: number;
    /** Total cost */
    totalCost: number;
    /** Rows processed */
    rowsProcessed: number;
    /** Memory usage */
    memoryUsage: number;
    /** I/O operations */
    ioOperations: number;
    /** Plan analysis */
    analysis: {
        bottlenecks: string[];
        recommendations: string[];
        complexity: 'low' | 'medium' | 'high';
    };
}
/**
 * Memory management configuration
 */
export interface MemoryManagementConfig {
    /** Enable automatic garbage collection */
    autoGC: boolean;
    /** GC trigger threshold in bytes */
    gcThreshold: number;
    /** GC interval in milliseconds */
    gcInterval: number;
    /** Enable memory leak detection */
    leakDetection: boolean;
    /** Leak detection threshold */
    leakThreshold: number;
    /** Enable weak references */
    useWeakReferences: boolean;
    /** Memory cleanup strategies */
    cleanupStrategies: Array<'periodic' | 'threshold' | 'idle' | 'pressure'>;
    /** Memory monitoring */
    monitoring: {
        enabled: boolean;
        interval: number;
        alertThreshold: number;
    };
}
/**
 * Memory usage statistics
 */
export interface MemoryUsageStats {
    /** Total memory allocated */
    totalAllocated: number;
    /** Memory in use */
    used: number;
    /** Available memory */
    available: number;
    /** Memory by category */
    byCategory: Record<string, number>;
    /** Memory by component */
    byComponent: Record<string, number>;
    /** Garbage collection statistics */
    gc: {
        totalCollections: number;
        totalTime: number;
        freedMemory: number;
        lastCollection: number;
    };
    /** Memory leaks detected */
    leaks: Array<{
        source: string;
        size: number;
        age: number;
        severity: 'low' | 'medium' | 'high';
    }>;
}
/**
 * Response compression configuration
 */
export interface CompressionConfig {
    /** Enable compression */
    enabled: boolean;
    /** Compression algorithms */
    algorithms: Array<'gzip' | 'deflate' | 'br' | 'lz4'>;
    /** Compression level (1-9) */
    level: number;
    /** Compression threshold in bytes */
    threshold: number;
    /** MIME types to compress */
    mimeTypes: string[];
    /** Enable compression for cached data */
    enableForCache: boolean;
    /** Compression quality settings */
    quality: {
        speed: number;
        ratio: number;
    };
}
/**
 * Compression result
 */
export interface CompressionResult {
    /** Original data size */
    originalSize: number;
    /** Compressed data size */
    compressedSize: number;
    /** Compression ratio */
    ratio: number;
    /** Algorithm used */
    algorithm: string;
    /** Compression time */
    compressionTime: number;
    /** Compressed data */
    data: Uint8Array;
    /** Compression metadata */
    metadata: Record<string, any>;
}
/**
 * Adaptive optimization configuration
 */
export interface AdaptiveOptimizationConfig {
    /** Enable adaptive optimization */
    enabled: boolean;
    /** Learning algorithms */
    algorithms: Array<'genetic' | 'reinforcement' | 'bayesian' | 'heuristic'>;
    /** Optimization objectives */
    objectives: Array<'response_time' | 'memory_usage' | 'cache_hit_rate' | 'throughput'>;
    /** Optimization weights */
    weights: Record<string, number>;
    /** Learning parameters */
    learning: {
        learningRate: number;
        explorationRate: number;
        convergenceThreshold: number;
    };
    /** Optimization intervals */
    intervals: {
        evaluation: number;
        adjustment: number;
        reset: number;
    };
}
/**
 * Optimization recommendation
 */
export interface OptimizationRecommendation {
    /** Recommendation ID */
    id: string;
    /** Recommendation type */
    type: 'cache' | 'query' | 'memory' | 'compression' | 'architecture';
    /** Recommendation title */
    title: string;
    /** Detailed description */
    description: string;
    /** Expected impact */
    impact: {
        responseTime?: number;
        memoryUsage?: number;
        throughput?: number;
        cacheHitRate?: number;
    };
    /** Implementation effort */
    effort: 'low' | 'medium' | 'high';
    /** Priority score */
    priority: number;
    /** Confidence level */
    confidence: number;
    /** Implementation steps */
    steps: string[];
    /** Required resources */
    resources: string[];
    /** Estimated timeline */
    timeline: string;
}
/**
 * Performance alert
 */
export interface PerformanceAlert {
    /** Alert ID */
    id: string;
    /** Alert severity */
    severity: 'info' | 'warning' | 'error' | 'critical';
    /** Alert title */
    title: string;
    /** Alert message */
    message: string;
    /** Alert timestamp */
    timestamp: number;
    /** Alert source */
    source: string;
    /** Metric that triggered alert */
    metric: string;
    /** Current value */
    currentValue: number;
    /** Threshold value */
    thresholdValue: number;
    /** Alert duration */
    duration: number;
    /** Suggested actions */
    actions: string[];
    /** Alert metadata */
    metadata: Record<string, any>;
}
/**
 * Performance monitoring interface
 */
export interface IPerformanceMonitor {
    /** Start measuring operation */
    startMeasurement(operation: string, metadata?: Record<string, any>): string;
    /** End measurement */
    endMeasurement(measurementId: string, success?: boolean, error?: string): PerformanceMeasurement;
    /** Record custom metric */
    recordMetric(name: string, value: number, tags?: Record<string, string>): void;
    /** Get current metrics */
    getMetrics(): PerformanceMetrics;
    /** Get metric history */
    getMetricHistory(metric: string, timeWindow: number): number[];
    /** Register alert handler */
    onAlert(handler: (alert: PerformanceAlert) => void): void;
    /** Get performance recommendations */
    getRecommendations(): OptimizationRecommendation[];
}
/**
 * Query optimizer interface
 */
export interface IQueryOptimizer {
    /** Analyze query */
    analyzeQuery(query: string, schema?: Record<string, any>): QueryExecutionPlan;
    /** Optimize query */
    optimizeQuery(query: string, schema?: Record<string, any>): QueryOptimizationResult;
    /** Get indexing recommendations */
    getIndexRecommendations(queries: string[]): Array<{
        table: string;
        columns: string[];
        type: string;
        impact: number;
    }>;
    /** Validate query performance */
    validatePerformance(query: string, thresholds: Record<string, number>): {
        valid: boolean;
        issues: string[];
        suggestions: string[];
    };
}
/**
 * Memory manager interface
 */
export interface IMemoryManager {
    /** Get memory usage statistics */
    getUsageStats(): MemoryUsageStats;
    /** Trigger garbage collection */
    triggerGC(): Promise<{
        freedMemory: number;
        duration: number;
    }>;
    /** Detect memory leaks */
    detectLeaks(): Promise<Array<{
        source: string;
        size: number;
        severity: 'low' | 'medium' | 'high';
    }>>;
    /** Register memory-sensitive object */
    register(object: any, category: string): string;
    /** Unregister object */
    unregister(id: string): boolean;
    /** Set memory limit */
    setMemoryLimit(limit: number): void;
    /** Get memory recommendations */
    getRecommendations(): Array<{
        type: 'cleanup' | 'optimization' | 'limit';
        description: string;
        priority: number;
    }>;
}
/**
 * Response compressor interface
 */
export interface IResponseCompressor {
    /** Compress response data */
    compress(data: any, options?: Partial<CompressionConfig>): Promise<CompressionResult>;
    /** Decompress response data */
    decompress(compressed: Uint8Array, algorithm: string): Promise<any>;
    /** Check if data should be compressed */
    shouldCompress(data: any, threshold: number): boolean;
    /** Get compression statistics */
    getStatistics(): {
        totalCompressions: number;
        totalSavings: number;
        averageRatio: number;
        algorithmUsage: Record<string, number>;
    };
}
/**
 * Adaptive optimizer interface
 */
export interface IAdaptiveOptimizer {
    /** Analyze performance patterns */
    analyzePatterns(metrics: PerformanceMetrics[]): Array<{
        pattern: string;
        confidence: number;
        recommendation: string;
    }>;
    /** Generate optimization recommendations */
    generateRecommendations(currentMetrics: PerformanceMetrics, historicalMetrics: PerformanceMetrics[]): OptimizationRecommendation[];
    /** Apply optimization */
    applyOptimization(recommendation: OptimizationRecommendation): Promise<{
        success: boolean;
        result?: any;
        error?: string;
    }>;
    /** Learn from optimization results */
    learnFromResults(recommendation: OptimizationRecommendation, beforeMetrics: PerformanceMetrics, afterMetrics: PerformanceMetrics): void;
    /** Get optimizer state */
    getState(): {
        learningProgress: number;
        optimizationsApplied: number;
        successRate: number;
        confidence: number;
    };
}
/**
 * Performance benchmark
 */
export interface PerformanceBenchmark {
    /** Benchmark name */
    name: string;
    /** Target metrics */
    targets: {
        responseTime: number;
        throughput: number;
        memoryUsage: number;
        cacheHitRate: number;
    };
    /** Current metrics */
    current: {
        responseTime: number;
        throughput: number;
        memoryUsage: number;
        cacheHitRate: number;
    };
    /** Performance score */
    score: number;
    /** Benchmark status */
    status: 'pass' | 'fail' | 'warning';
    /** Benchmark timestamp */
    timestamp: number;
    /** Benchmark details */
    details: string[];
}
/**
 * Performance trend analysis
 */
export interface PerformanceTrend {
    /** Metric name */
    metric: string;
    /** Time series data */
    timeSeries: Array<{
        timestamp: number;
        value: number;
    }>;
    /** Trend direction */
    direction: 'improving' | 'degrading' | 'stable';
    /** Trend strength */
    strength: number;
    /** Seasonal patterns */
    seasonality: {
        detected: boolean;
        period: number;
        amplitude: number;
    };
    /** Anomalies detected */
    anomalies: Array<{
        timestamp: number;
        value: number;
        severity: 'low' | 'medium' | 'high';
    }>;
    /** Forecast */
    forecast: Array<{
        timestamp: number;
        predicted: number;
        confidence: number;
    }>;
}
//# sourceMappingURL=Performance.d.ts.map