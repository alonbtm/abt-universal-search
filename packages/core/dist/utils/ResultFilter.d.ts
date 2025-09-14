/**
 * Result Filter - Advanced filtering and validation engine for search results
 * @description Filters results based on completeness, quality, and custom validation rules
 */
import type { SearchResult } from '../types/Results';
/**
 * Quality metrics for a search result
 */
export interface QualityMetrics {
    /** Completeness score (0-1) */
    completeness: number;
    /** Relevance score (0-1) */
    relevance: number;
    /** Data quality score (0-1) */
    dataQuality: number;
    /** Overall quality score (0-1) */
    overall: number;
    /** Quality issues found */
    issues: string[];
}
/**
 * Filtering rule configuration
 */
export interface FilterRule {
    /** Rule name for identification */
    name: string;
    /** Rule priority (higher runs first) */
    priority: number;
    /** Rule description */
    description?: string;
    /** Whether rule is enabled */
    enabled: boolean;
    /** Filter function - returns true to keep result */
    filter: (result: SearchResult, context: FilterContext) => boolean;
    /** Reason for filtering (when result is filtered out) */
    reason?: string;
}
/**
 * Filtering context
 */
export interface FilterContext {
    /** Original query */
    query?: string;
    /** Result index in batch */
    index: number;
    /** Total results before filtering */
    totalResults: number;
    /** Source adapter type */
    sourceType: string;
    /** Quality metrics for current result */
    qualityMetrics?: QualityMetrics;
    /** Additional context data */
    additionalContext?: Record<string, unknown>;
}
/**
 * Filtering result for a single result
 */
export interface FilterResult {
    /** Whether result passed all filters */
    passed: boolean;
    /** Quality metrics calculated */
    qualityMetrics: QualityMetrics;
    /** Rules that were applied */
    rulesApplied: string[];
    /** Rules that filtered out the result */
    rejectedBy?: string[];
    /** Enhanced result (if passed) */
    result?: SearchResult;
    /** Filtering time in milliseconds */
    filteringTime: number;
}
/**
 * Batch filtering result
 */
export interface BatchFilterResult {
    /** Original results count */
    originalCount: number;
    /** Filtered results count */
    filteredCount: number;
    /** Results that passed filtering */
    results: SearchResult[];
    /** Individual filter results for debugging */
    individualResults: FilterResult[];
    /** Filtering statistics */
    stats: {
        totalFilteringTime: number;
        averageFilteringTime: number;
        rulesExecuted: Record<string, number>;
        rejectionReasons: Record<string, number>;
    };
}
/**
 * Duplicate detection strategy
 */
export type DuplicateDetectionStrategy = 'exact' | 'fuzzy' | 'semantic' | 'custom';
/**
 * Duplicate detection configuration
 */
export interface DuplicateDetectionConfig {
    /** Detection strategy */
    strategy: DuplicateDetectionStrategy;
    /** Fields to compare for duplicates */
    compareFields: string[];
    /** Similarity threshold for fuzzy matching (0-1) */
    threshold?: number;
    /** Custom comparison function */
    customComparator?: (result1: SearchResult, result2: SearchResult) => number;
    /** Whether to keep best result among duplicates */
    keepBest?: boolean;
    /** Function to determine which result is better */
    qualityComparator?: (result1: SearchResult, result2: SearchResult) => number;
}
/**
 * Advanced result filter with quality assessment and deduplication
 */
export declare class AdvancedResultFilter {
    private filterRules;
    private qualityWeights;
    private duplicateConfig?;
    private requiredFields;
    private minQualityScore;
    /**
     * Add filter rule
     */
    addRule(rule: FilterRule): void;
    /**
     * Add multiple filter rules
     */
    addRules(rules: FilterRule[]): void;
    /**
     * Set required fields for completeness calculation
     */
    setRequiredFields(fields: string[]): void;
    /**
     * Set minimum quality score threshold
     */
    setMinQualityScore(score: number): void;
    /**
     * Set quality calculation weights
     */
    setQualityWeights(weights: Partial<typeof this.qualityWeights>): void;
    /**
     * Configure duplicate detection
     */
    configureDuplicateDetection(config: DuplicateDetectionConfig): void;
    /**
     * Filter a batch of search results
     */
    filterResults(results: SearchResult[], context?: Partial<FilterContext>): BatchFilterResult;
    /**
     * Filter a single search result
     */
    private filterSingleResult;
    /**
     * Calculate quality metrics for a result
     */
    private calculateQualityMetrics;
    /**
     * Calculate completeness score
     */
    private calculateCompleteness;
    /**
     * Calculate relevance score
     */
    private calculateRelevance;
    /**
     * Calculate data quality score
     */
    private calculateDataQuality;
    /**
     * Remove duplicate results
     */
    private removeDuplicates;
    /**
     * Check if two results are duplicates
     */
    private areDuplicates;
    /**
     * Exact duplicate check
     */
    private exactDuplicateCheck;
    /**
     * Fuzzy duplicate check using string similarity
     */
    private fuzzyDuplicateCheck;
    /**
     * Semantic duplicate check (simplified)
     */
    private semanticDuplicateCheck;
    /**
     * Calculate string similarity using Jaccard index
     */
    private calculateStringSimilarity;
    /**
     * Get field value from result (supports dot notation)
     */
    private getFieldValue;
    /**
     * Check if field value is present and meaningful
     */
    private isFieldPresent;
    /**
     * Sort filter rules by priority
     */
    private sortRulesByPriority;
    /**
     * Clear all filter rules
     */
    clear(): void;
    /**
     * Get current configuration
     */
    getConfiguration(): {
        rulesCount: number;
        requiredFields: string[];
        minQualityScore: number;
        qualityWeights: typeof this.qualityWeights;
        duplicateDetectionEnabled: boolean;
    };
}
/**
 * Fluent filter rule builder
 */
export declare class FilterRuleBuilder {
    private rule;
    name(name: string): FilterRuleBuilder;
    description(description: string): FilterRuleBuilder;
    priority(priority: number): FilterRuleBuilder;
    enabled(enabled?: boolean): FilterRuleBuilder;
    reason(reason: string): FilterRuleBuilder;
    filter(filterFn: FilterRule['filter']): FilterRule;
}
/**
 * Utility function to create filter rule
 */
export declare function createFilterRule(): FilterRuleBuilder;
/**
 * Predefined common filter rules
 */
export declare const CommonFilterRules: {
    /**
     * Filter out results with empty or very short titles
     */
    minimumTitleLength: (minLength?: number) => FilterRule;
    /**
     * Filter out results without required fields
     */
    requiredFields: (fields: string[]) => FilterRule;
    /**
     * Filter based on minimum quality score
     */
    minimumQuality: (threshold?: number) => FilterRule;
    /**
     * Filter out results with invalid URLs
     */
    validUrls: () => FilterRule;
};
/**
 * Global result filter instance
 */
export declare const resultFilter: AdvancedResultFilter;
//# sourceMappingURL=ResultFilter.d.ts.map