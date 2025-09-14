/**
 * QueryLengthEnforcer - Buffer overflow protection and length validation
 * @description Configurable length limits with memory monitoring and buffer overflow protection
 */
import { LengthValidationConfig, SecurityValidationResult } from '../types/Security';
/**
 * Memory usage tracking interface
 */
export interface MemoryUsage {
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
}
/**
 * Length enforcement statistics
 */
export interface LengthStats {
    originalLength: number;
    processedLength: number;
    memoryUsage: MemoryUsage;
    processingTime: number;
    bufferUtilization: number;
}
/**
 * Query length enforcer with buffer overflow protection
 */
export declare class QueryLengthEnforcer {
    private config;
    private memoryThreshold;
    private processingTimeLimit;
    constructor(config?: LengthValidationConfig, memoryThreshold?: number, // 100MB default
    processingTimeLimit?: number);
    /**
     * Enforce length limits and validate buffer safety
     */
    enforceLength(input: string): SecurityValidationResult;
    /**
     * Validate basic length constraints
     */
    private validateBasicLength;
    /**
     * Validate buffer safety and overflow protection
     */
    private validateBufferSafety;
    /**
     * Check memory usage during processing
     */
    private checkMemoryUsage;
    /**
     * Detect repeated patterns that could indicate attack attempts
     */
    private detectRepeatedPatterns;
    /**
     * Calculate nesting depth for structures like brackets, quotes, etc.
     */
    private calculateNestingDepth;
    /**
     * Estimate compression ratio to detect potential zip bombs
     */
    private estimateCompressionRatio;
    /**
     * Calculate risk level based on errors and input size
     */
    private calculateRiskLevel;
    /**
     * Generate recommendations based on validation results
     */
    private generateRecommendations;
    /**
     * Truncate input to safe length
     */
    truncateToSafeLength(input: string): string;
    /**
     * Check if input length is within safe limits
     */
    isSafeLength(input: string): boolean;
    /**
     * Get length statistics for monitoring
     */
    getLengthStats(input: string): LengthStats;
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<LengthValidationConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): LengthValidationConfig;
}
//# sourceMappingURL=QueryLengthEnforcer.d.ts.map