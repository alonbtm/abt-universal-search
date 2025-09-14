/**
 * InputSanitizer - XSS prevention and input sanitization
 * @description Provides comprehensive input sanitization using DOMPurify with configurable policies
 */
import { SecurityConfig, XSSProtectionConfig, SecurityValidationResult } from '../types/Security';
/**
 * Sanitization policy configuration
 */
export interface SanitizationPolicy {
    /** Allow HTML tags */
    allowHtml: boolean;
    /** Allowed HTML tags */
    allowedTags: string[];
    /** Allowed HTML attributes */
    allowedAttributes: string[];
    /** Remove scripts completely */
    removeScripts: boolean;
    /** Remove event handlers */
    removeEventHandlers: boolean;
    /** Remove data URLs */
    removeDataUrls: boolean;
    /** Custom sanitization rules */
    customRules?: (input: string) => string;
}
/**
 * Default sanitization policy for search queries
 */
export declare const DEFAULT_SEARCH_POLICY: SanitizationPolicy;
/**
 * Permissive policy for rich text content
 */
export declare const RICH_TEXT_POLICY: SanitizationPolicy;
/**
 * Input sanitizer with XSS protection
 */
export declare class InputSanitizer {
    private config;
    private xssConfig;
    constructor(config: SecurityConfig, xssConfig?: XSSProtectionConfig);
    /**
     * Sanitize input string using specified policy
     */
    sanitize(input: string, policy?: SanitizationPolicy): string;
    /**
     * Sanitize HTML content with DOMPurify
     */
    private sanitizeHtml;
    /**
     * Strip all HTML tags from input
     */
    private stripHtml;
    /**
     * Remove script patterns that might bypass HTML sanitization
     */
    private removeScriptPatterns;
    /**
     * Remove event handler attributes
     */
    private removeEventHandlers;
    /**
     * Remove data URLs that could contain malicious content
     */
    private removeDataUrls;
    /**
     * Validate input for XSS patterns
     */
    validateForXSS(input: string): SecurityValidationResult;
    /**
     * Configure DOMPurify with security settings
     */
    private configureDOMPurify;
    /**
     * Get sanitization statistics
     */
    getSanitizationStats(original: string, sanitized: string): {
        originalLength: number;
        sanitizedLength: number;
        charactersRemoved: number;
        htmlTagsRemoved: number;
        potentialThreats: number;
    };
}
//# sourceMappingURL=InputSanitizer.d.ts.map