/**
 * OutputEscaper - HTML escaping and safe DOM insertion for output security
 * @description Provides comprehensive HTML entity escaping and safe DOM manipulation methods
 */
import { HTMLEscapingConfig, HTMLEscapingResult, SafeDOMInsertionOptions } from '../types/Rendering';
/**
 * Default HTML escaping configuration
 */
export declare const DEFAULT_HTML_ESCAPING_CONFIG: HTMLEscapingConfig;
/**
 * OutputEscaper class for HTML escaping and safe DOM operations
 */
export declare class OutputEscaper {
    private config;
    constructor(config?: Partial<HTMLEscapingConfig>);
    /**
     * Escape HTML entities in content
     */
    escapeHTML(content: string, customConfig?: Partial<HTMLEscapingConfig>): HTMLEscapingResult;
    /**
     * Safely insert content into DOM element
     */
    safeInsert(options: SafeDOMInsertionOptions): void;
    /**
     * Create safe HTML element with escaped content
     */
    createSafeElement(tagName: string, content: string, attributes?: Record<string, string>): HTMLElement;
    /**
     * Escape HTML entities using entity map
     */
    private escapeHTMLEntities;
    /**
     * Remove zero-width characters
     */
    private removeZeroWidthCharacters;
    /**
     * Remove dangerous HTML patterns
     */
    private removeDangerousPatterns;
    /**
     * Clear element safely
     */
    private clearElement;
    /**
     * Check if tag name is valid and safe
     */
    private isValidTagName;
    /**
     * Check if attribute is safe to set
     */
    private isSafeAttribute;
    /**
     * Batch escape multiple content items
     */
    batchEscape(contents: string[], config?: Partial<HTMLEscapingConfig>): HTMLEscapingResult[];
    /**
     * Get escaping statistics
     */
    getEscapingStats(content: string): {
        dangerousCharCount: number;
        zeroWidthCharCount: number;
        htmlEntityCount: number;
        estimatedRisk: 'low' | 'medium' | 'high';
    };
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<HTMLEscapingConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): HTMLEscapingConfig;
}
/**
 * Default OutputEscaper instance
 */
export declare const defaultOutputEscaper: OutputEscaper;
/**
 * Convenience function for quick HTML escaping
 */
export declare function escapeHTML(content: string, config?: Partial<HTMLEscapingConfig>): string;
/**
 * Convenience function for safe DOM insertion
 */
export declare function safeInsert(targetElement: HTMLElement, content: string, method?: 'textContent' | 'createElement' | 'documentFragment'): void;
//# sourceMappingURL=OutputEscaper.d.ts.map