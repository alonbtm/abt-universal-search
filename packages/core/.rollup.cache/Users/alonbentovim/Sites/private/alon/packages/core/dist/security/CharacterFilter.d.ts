/**
 * CharacterFilter - Unicode normalization and dangerous character detection
 * @description Advanced character filtering with Unicode normalization and security-focused filtering
 */
import { CharacterFilterConfig, SecurityWarning } from '../types/Security';
/**
 * Character normalization forms
 */
export type NormalizationForm = 'NFC' | 'NFD' | 'NFKC' | 'NFKD';
/**
 * Character filter with Unicode normalization
 */
export declare class CharacterFilter {
    private config;
    private normalizationForm;
    constructor(config?: CharacterFilterConfig, normalizationForm?: NormalizationForm);
    /**
     * Filter and normalize input string
     */
    filter(input: string): {
        filtered: string;
        warnings: SecurityWarning[];
    };
    /**
     * Normalize Unicode string using specified form
     */
    private normalizeUnicode;
    /**
     * Remove specified characters from input
     */
    private removeCharacters;
    /**
     * Escape specified characters in input
     */
    private escapeCharacters;
    /**
     * Apply whitelist/blacklist character filtering
     */
    private applyCharacterFilters;
    /**
     * Filter international characters if not allowed
     */
    private filterInternationalCharacters;
    /**
     * Detect dangerous characters that could be used in attacks
     */
    private detectDangerousCharacters;
    /**
     * Check if string contains only safe characters
     */
    isSafe(input: string): boolean;
    /**
     * Get character statistics for input
     */
    getCharacterStats(input: string): {
        totalLength: number;
        asciiCount: number;
        unicodeCount: number;
        controlCharCount: number;
        dangerousCharCount: number;
        normalizationChanged: boolean;
    };
    /**
     * Escape special regex characters
     */
    private escapeRegExp;
    /**
     * Clean input by removing all dangerous characters
     */
    clean(input: string): string;
    /**
     * Validate character encoding
     */
    validateEncoding(input: string): {
        isValid: boolean;
        warnings: SecurityWarning[];
    };
}
//# sourceMappingURL=CharacterFilter.d.ts.map