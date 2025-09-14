/**
 * URLValidator - URL validation and sanitization with protocol whitelisting
 * @description Provides comprehensive URL validation, protocol checking, and domain validation
 */
import { URLValidationConfig, URLValidationResult } from '../types/Rendering';
/**
 * Default URL validation configuration
 */
export declare const DEFAULT_URL_VALIDATION_CONFIG: URLValidationConfig;
/**
 * URLValidator class for validating and sanitizing URLs
 */
export declare class URLValidator {
    private config;
    constructor(config?: Partial<URLValidationConfig>);
    /**
     * Validate and sanitize a URL
     */
    validateURL(url: string, customConfig?: Partial<URLValidationConfig>): URLValidationResult;
    /**
     * Batch validate multiple URLs
     */
    batchValidate(urls: string[], config?: Partial<URLValidationConfig>): URLValidationResult[];
    /**
     * Check if a protocol is allowed
     */
    isProtocolAllowed(protocol: string, config?: Partial<URLValidationConfig>): boolean;
    /**
     * Parse URL into components
     */
    private parseURLComponents;
    /**
     * Validate domain name
     */
    private validateDomain;
    /**
     * Check for suspicious URL patterns
     */
    private checkSuspiciousPatterns;
    /**
     * Check if IP is in private range
     */
    private isPrivateIP;
    /**
     * Sanitize URL by reconstructing from validated components
     */
    private sanitizeURL;
    /**
     * Get empty URL components
     */
    private getEmptyComponents;
    /**
     * Extract domain from URL
     */
    extractDomain(url: string): string;
    /**
     * Check if URL is relative
     */
    isRelativeURL(url: string): boolean;
    /**
     * Convert relative URL to absolute
     */
    makeAbsolute(relativeURL: string, baseURL: string): string;
    /**
     * Get URL validation statistics
     */
    getValidationStats(urls: string[]): {
        totalURLs: number;
        validURLs: number;
        invalidURLs: number;
        relativeURLs: number;
        suspiciousURLs: number;
        protocolDistribution: Record<string, number>;
    };
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<URLValidationConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): URLValidationConfig;
}
/**
 * Default URLValidator instance
 */
export declare const defaultURLValidator: URLValidator;
/**
 * Convenience function for quick URL validation
 */
export declare function validateURL(url: string, config?: Partial<URLValidationConfig>): boolean;
/**
 * Convenience function for URL sanitization
 */
export declare function sanitizeURL(url: string, config?: Partial<URLValidationConfig>): string;
//# sourceMappingURL=URLValidator.d.ts.map