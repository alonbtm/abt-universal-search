/**
 * Adaptive Debouncer - Smart debouncing with pattern recognition
 * @description Implements intelligent debouncing that adapts delay based on query frequency and patterns
 */
import type { AdaptiveDebounceConfig, DebounceState, IAdaptiveDebouncer } from '../types/RateLimiting';
/**
 * Adaptive debouncer with pattern recognition and smart delay calculation
 */
export declare class AdaptiveDebouncer implements IAdaptiveDebouncer {
    private config;
    private state;
    private timeouts;
    private inputHistory;
    private patterns;
    constructor(config: AdaptiveDebounceConfig);
    /**
     * Debounce a function call with adaptive delay
     */
    debounce<T extends (...args: any[]) => any>(fn: T, query: string, context?: Record<string, any>): (...args: Parameters<T>) => Promise<ReturnType<T>>;
    /**
     * Check if query should bypass debounce
     */
    shouldBypass(query: string): boolean;
    /**
     * Update debounce configuration
     */
    updateConfig(config: Partial<AdaptiveDebounceConfig>): void;
    /**
     * Get current debounce state
     */
    getState(): DebounceState;
    /**
     * Clear all pending debounced calls
     */
    clearAll(): void;
    /**
     * Initialize query patterns for confidence scoring
     */
    private initializePatterns;
    /**
     * Analyze input for frequency, confidence, and typing patterns
     */
    private analyzeInput;
    /**
     * Calculate pattern confidence score
     */
    private calculatePatternConfidence;
    /**
     * Classify typing pattern based on frequency and timing
     */
    private classifyTypingPattern;
    /**
     * Update internal state based on analysis
     */
    private updateState;
    /**
     * Calculate adaptive delay based on analysis
     */
    private calculateDelay;
    /**
     * Generate unique key for debounce tracking
     */
    private generateKey;
    /**
     * Get pattern analysis for debugging
     */
    getPatternAnalysis(query: string): {
        matchedPatterns: Array<{
            name: string;
            confidence: number;
            description: string;
        }>;
        overallConfidence: number;
    };
    /**
     * Get performance metrics
     */
    getMetrics(): {
        activeTimeouts: number;
        inputHistorySize: number;
        averageDelay: number;
        bypassRate: number;
    };
}
/**
 * Default adaptive debounce configuration
 */
export declare const defaultAdaptiveDebounceConfig: AdaptiveDebounceConfig;
/**
 * Create adaptive debouncer with default configuration
 */
export declare function createAdaptiveDebouncer(config?: Partial<AdaptiveDebounceConfig>): AdaptiveDebouncer;
//# sourceMappingURL=AdaptiveDebouncer.d.ts.map