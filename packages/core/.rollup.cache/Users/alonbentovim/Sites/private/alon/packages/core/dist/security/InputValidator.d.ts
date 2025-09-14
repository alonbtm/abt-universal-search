/**
 * InputValidator - Regex-based input validation with configurable rules
 * @description Comprehensive input validation system with custom rule support
 */
import { SecurityValidationResult, LengthValidationConfig } from '../types/Security';
/**
 * Validation rule interface
 */
export interface ValidationRule {
    name: string;
    pattern: RegExp;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    required?: boolean;
    transform?: (value: string) => string;
}
/**
 * Validation context for rule evaluation
 */
export interface ValidationContext {
    fieldName?: string;
    allowEmpty?: boolean;
    customRules?: ValidationRule[];
    lengthConfig?: LengthValidationConfig;
}
/**
 * Input validator with configurable rules
 */
export declare class InputValidator {
    private rules;
    private lengthConfig;
    constructor(customRules?: ValidationRule[], lengthConfig?: LengthValidationConfig);
    /**
     * Validate input against all configured rules
     */
    validate(input: string, context?: ValidationContext): SecurityValidationResult;
    /**
     * Validate string length against configuration
     */
    private validateLength;
    /**
     * Apply validation rules to input
     */
    private applyValidationRules;
    /**
     * Validate character encoding
     */
    private validateEncoding;
    /**
     * Map rule names to error types
     */
    private getErrorType;
    /**
     * Build validation result
     */
    private buildResult;
    /**
     * Calculate risk level based on errors
     */
    private calculateRiskLevel;
    /**
     * Generate recommendations based on validation results
     */
    private generateRecommendations;
    /**
     * Validate email format
     */
    validateEmail(email: string): SecurityValidationResult;
    /**
     * Validate URL format
     */
    validateUrl(url: string): SecurityValidationResult;
    /**
     * Validate search query with specific rules
     */
    validateSearchQuery(query: string): SecurityValidationResult;
    /**
     * Add custom validation rule
     */
    addRule(rule: ValidationRule): void;
    /**
     * Remove validation rule by name
     */
    removeRule(ruleName: string): void;
    /**
     * Get validation statistics
     */
    getValidationStats(input: string, result: SecurityValidationResult): {
        inputLength: number;
        rulesApplied: number;
        errorsFound: number;
        warningsGenerated: number;
        riskLevel: import("../types/Security").SecuritySeverity;
        isValid: boolean;
    };
}
//# sourceMappingURL=InputValidator.d.ts.map