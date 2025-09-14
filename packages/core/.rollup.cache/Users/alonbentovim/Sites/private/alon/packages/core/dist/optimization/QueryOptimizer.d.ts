/**
 * Query Optimizer - Database query analysis and optimization system
 * @description Analyzes SQL queries, provides execution plan analysis, and suggests optimizations
 */
import { QueryOptimizationResult, QueryExecutionPlan, IQueryOptimizer } from '../types/Performance.js';
/**
 * Query Optimizer Implementation
 */
export declare class QueryOptimizer implements IQueryOptimizer {
    private parser;
    private complexityAnalyzer;
    private queryHistory;
    constructor();
    /**
     * Analyze query execution plan
     */
    analyzeQuery(query: string, schema?: Record<string, any>): QueryExecutionPlan;
    /**
     * Optimize query
     */
    optimizeQuery(query: string, _schema?: Record<string, any>): QueryOptimizationResult;
    /**
     * Get indexing recommendations
     */
    getIndexRecommendations(queries: string[]): Array<{
        table: string;
        columns: string[];
        type: string;
        impact: number;
    }>;
    /**
     * Validate query performance
     */
    validatePerformance(query: string, thresholds: Record<string, number>): {
        valid: boolean;
        issues: string[];
        suggestions: string[];
    };
    /**
     * Record query execution for learning
     */
    recordQueryExecution(query: string, executionTime: number): void;
    /**
     * Get optimization statistics
     */
    getOptimizationStats(): {
        totalQueries: number;
        averageComplexity: number;
        commonPatterns: Array<{
            pattern: string;
            frequency: number;
        }>;
        topBottlenecks: Array<{
            bottleneck: string;
            frequency: number;
        }>;
    };
    private generateExecutionPlan;
    private analyzeExecutionPlan;
    private generateIndexRecommendations;
    private calculateEstimatedImprovement;
    private calculateOptimizationConfidence;
}
/**
 * Factory function for creating query optimizer instances
 */
export declare function createQueryOptimizer(): IQueryOptimizer;
/**
 * Query performance analyzer utility
 */
export declare class QueryPerformanceAnalyzer {
    private optimizer;
    private performanceHistory;
    constructor();
    /**
     * Analyze query performance trends
     */
    analyzePerformanceTrends(query: string): {
        trend: 'improving' | 'degrading' | 'stable';
        averageTime: number;
        variance: number;
        samples: number;
    };
    /**
     * Record query performance
     */
    recordPerformance(query: string, executionTime: number): void;
    /**
     * Get performance recommendations
     */
    getPerformanceRecommendations(query: string): Array<{
        type: 'optimization' | 'monitoring' | 'alerting';
        description: string;
        priority: number;
    }>;
}
/**
 * Utility functions for query analysis
 */
export declare function normalizeQuery(query: string): string;
export declare function hashQuery(query: string): string;
//# sourceMappingURL=QueryOptimizer.d.ts.map