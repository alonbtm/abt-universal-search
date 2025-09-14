/**
 * Validation utilities for Universal Search Component
 * @description Input validation and configuration validation functions
 */
import type { SearchConfiguration } from '../types/Config';
/**
 * Custom validation error class
 */
export declare class ValidationError extends Error {
    readonly field?: string | undefined;
    constructor(message: string, field?: string | undefined);
}
/**
 * Validates a DOM selector string
 */
export declare function validateSelector(selector: string): void;
/**
 * Validates that a DOM element exists and is suitable for mounting
 */
export declare function validateTargetElement(element: Element | null, selector: string): asserts element is HTMLElement;
/**
 * Validates search configuration object
 */
export declare function validateConfiguration(config: Partial<SearchConfiguration>): void;
/**
 * Sanitizes and normalizes a query string
 */
export declare function sanitizeQuery(query: string): string;
/**
 * Checks if a query meets minimum requirements
 */
export declare function isValidQuery(query: string, minLength: number): boolean;
//# sourceMappingURL=validation.d.ts.map