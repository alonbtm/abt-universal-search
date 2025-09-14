/**
 * Adaptive Optimizer - ML-based optimization system with pattern recognition
 * @description Analyzes performance patterns and provides intelligent optimization recommendations
 */
import { AdaptiveOptimizationConfig, OptimizationRecommendation, PerformanceMetrics, IAdaptiveOptimizer } from '../types/Performance.js';
/**
 * Adaptive Optimizer Implementation
 */
export declare class AdaptiveOptimizer implements IAdaptiveOptimizer {
    private config;
    private patternRecognizer;
    private rlOptimizer;
    private bayesianOptimizer;
    private performanceHistory;
    private optimizationHistory;
    private state;
    constructor(config?: Partial<AdaptiveOptimizationConfig>);
    /**
     * Analyze performance patterns
     */
    analyzePatterns(metrics: PerformanceMetrics[]): Array<{
        pattern: string;
        confidence: number;
        recommendation: string;
    }>;
    /**
     * Generate optimization recommendations
     */
    generateRecommendations(currentMetrics: PerformanceMetrics, historicalMetrics: PerformanceMetrics[]): OptimizationRecommendation[];
    /**
     * Apply optimization
     */
    applyOptimization(recommendation: OptimizationRecommendation): Promise<{
        success: boolean;
        result?: any;
        error?: string;
    }>;
    /**
     * Learn from optimization results
     */
    learnFromResults(recommendation: OptimizationRecommendation, beforeMetrics: PerformanceMetrics, afterMetrics: PerformanceMetrics): void;
    /**
     * Get optimizer state
     */
    getState(): {
        learningProgress: number;
        optimizationsApplied: number;
        successRate: number;
        confidence: number;
    };
    private analyzeTrends;
    private detectAnomalies;
    private generateHeuristicRecommendations;
    private generateReinforcementRecommendations;
    private generateBayesianRecommendations;
    private rankRecommendations;
    private calculateRecommendationScore;
    private calculateTrend;
    private calculateZScore;
    private encodeState;
    private extractParameters;
    private calculateImprovement;
    private executeOptimization;
    private updateLearningProgress;
    private updateSuccessRate;
    private updateConfidence;
    private startLearningLoop;
}
/**
 * Factory function for creating adaptive optimizer instances
 */
export declare function createAdaptiveOptimizer(config?: Partial<AdaptiveOptimizationConfig>): IAdaptiveOptimizer;
/**
 * Utility functions for optimization
 */
export declare function calculatePerformanceScore(metrics: PerformanceMetrics): number;
export declare function identifyBottlenecks(metrics: PerformanceMetrics): string[];
//# sourceMappingURL=AdaptiveOptimizer.d.ts.map