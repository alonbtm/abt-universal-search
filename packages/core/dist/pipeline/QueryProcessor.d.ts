/**
 * Query Processor - Basic Query Processing and Validation
 * @description Handles basic query normalization, validation, and debouncing
 */
import { type SecurityValidationResult } from '../utils/security';
/**
 * Enhanced query configuration with security and performance features
 */
export interface QueryConfig {
    minLength: number;
    debounceMs: number;
    triggerOn: 'change' | 'enter' | 'both';
    caseSensitive: boolean;
    matchMode: 'exact' | 'partial' | 'fuzzy';
    enableSecurityValidation?: boolean;
    enableXSSProtection?: boolean;
    enableSQLInjectionProtection?: boolean;
    enablePerformanceMonitoring?: boolean;
    customValidators?: ValidationRule[];
    debounceStrategy?: 'leading' | 'trailing' | 'both';
    caseNormalization?: 'lowercase' | 'uppercase' | 'preserve';
    enableStemming?: boolean;
    enablePreprocessing?: boolean;
    localization?: {
        language: string;
        messages: Record<string, string>;
    };
}
/**
 * Custom validation rule interface
 */
export interface ValidationRule {
    name: string;
    validator: (query: string) => boolean;
    errorMessage: string;
}
/**
 * Processed query result with enhanced metadata
 */
export interface ProcessedQuery {
    original: string;
    normalized: string;
    sanitized?: string;
    isValid: boolean;
    error?: string;
    securityInfo?: SecurityValidationResult;
    metadata: {
        processingTime: number;
        originalQuery: string;
        length: number;
        trimmed: boolean;
        timestamp: number;
        performanceId?: string;
        validationRulesApplied?: string[];
    };
}
/**
 * Enhanced validation result with user-friendly messages (AC 5)
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings?: string[];
    userFriendlyMessage?: string;
    localizedMessages?: Record<string, string>;
    validationContext?: {
        field: string;
        value: any;
        rule: string;
    };
}
/**
 * Enhanced Query processor with comprehensive validation and advanced features
 */
export declare class QueryProcessor {
    private readonly config;
    private debounceTimer;
    private leadingTimer;
    private queryCounter;
    private lastExecutionTime;
    constructor(config: QueryConfig);
    /**
     * Process and validate a search query with enhanced security and performance monitoring
     */
    processQuery(query: string): ProcessedQuery;
    /**
     * Validate input with detailed error information
     */
    validateInput(input: string): ValidationResult;
    /**
     * Determine if search should be triggered based on trigger mode
     */
    shouldTriggerSearch(_input: string, triggerType?: 'change' | 'enter'): boolean;
    /**
     * Execute debounced search with advanced strategies (AC 2)
     */
    debouncedProcess(query: string, callback: (_result: ProcessedQuery) => void, triggerType?: 'change' | 'enter'): void;
    /**
     * Leading debounce - execute immediately, then ignore subsequent calls (AC 2)
     */
    private executeLeadingDebounce;
    /**
     * Trailing debounce - wait for pause, then execute (AC 2)
     */
    private executeTrailingDebounce;
    /**
     * Both debounce - execute immediately and after pause (AC 2)
     */
    private executeBothDebounce;
    /**
     * Cancel any pending debounced operations (AC 2)
     */
    cancelPendingOperations(): void;
    /**
     * Clean up resources
     */
    destroy(): void;
    /**
     * Get current configuration
     */
    getConfig(): Readonly<QueryConfig>;
    /**
     * Get performance metrics for query processing (AC 6)
     */
    getPerformanceMetrics(operationId?: string): any;
    /**
     * Get performance recommendations based on collected metrics (AC 6)
     */
    getPerformanceRecommendations(): any;
    /**
     * Clear all performance metrics
     */
    clearPerformanceMetrics(): void;
    /**
     * Enhanced query normalization with preprocessing and stemming (AC 4)
     */
    private normalizeQuery;
    /**
     * Apply basic stemming to query terms (AC 4)
     */
    private applyStemming;
    /**
     * Enhanced query validation with user-friendly messages (AC 5)
     */
    private validateQuery;
    /**
     * Get localized validation message (AC 5)
     */
    private getLocalizedMessage;
    /**
     * Create error result with metadata
     */
    private createErrorResult;
    /**
     * Validate processor configuration
     */
    private validateConfig;
}
//# sourceMappingURL=QueryProcessor.d.ts.map