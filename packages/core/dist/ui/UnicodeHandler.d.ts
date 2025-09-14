/**
 * Unicode Handler
 * Comprehensive Unicode and international character processing
 */
import type { UnicodeConfig, UnicodeAnalysisResult, BidiAnalysisResult, WritingSystem, InternationalizationEvents } from '../types/Internationalization';
/**
 * Comprehensive Unicode processing with normalization and validation
 */
export declare class UnicodeHandler {
    private config;
    private isInitialized;
    private eventListeners;
    private readonly characterCategories;
    private analysisCache;
    private bidiCache;
    private normalizationCache;
    constructor(config?: Partial<UnicodeConfig>);
    /**
     * Initialize Unicode handler
     */
    init(): Promise<void>;
    /**
     * Destroy Unicode handler and cleanup resources
     */
    destroy(): void;
    /**
     * Normalize Unicode text
     */
    normalizeText(text: string, form?: 'NFC' | 'NFD' | 'NFKC' | 'NFKD'): string;
    /**
     * Validate Unicode text
     */
    validateUnicode(text: string): boolean;
    /**
     * Sanitize Unicode text
     */
    sanitizeText(text: string): string;
    /**
     * Analyze Unicode text comprehensively
     */
    analyzeText(text: string): UnicodeAnalysisResult;
    /**
     * Analyze bidirectional text
     */
    analyzeBidirectionalText(text: string): BidiAnalysisResult;
    /**
     * Process search query with Unicode normalization
     */
    processSearchQuery(query: string): string;
    /**
     * Compare Unicode strings with normalization
     */
    compareStrings(a: string, b: string, caseSensitive?: boolean): number;
    /**
     * Check if text contains specific script
     */
    containsScript(text: string, script: WritingSystem): boolean;
    /**
     * Extract text by script
     */
    extractByScript(text: string, script: WritingSystem): string;
    /**
     * Convert text to safe identifier
     */
    toSafeIdentifier(text: string): string;
    /**
     * Get character information
     */
    getCharacterInfo(char: string): {
        codePoint: number;
        category: string;
        script: WritingSystem[];
        name: string;
        isBidi: boolean;
        isCombining: boolean;
        isEmoji: boolean;
    } | null;
    /**
     * Escape Unicode for safe HTML/JSON
     */
    escapeUnicode(text: string): string;
    /**
     * Unescape Unicode sequences
     */
    unescapeUnicode(text: string): string;
    /**
     * Get text statistics
     */
    getTextStatistics(text: string): {
        totalLength: number;
        codePointCount: number;
        graphemeCount: number;
        wordCount: number;
        lineCount: number;
        scripts: WritingSystem[];
        characterCounts: Record<string, number>;
    };
    /**
     * Add event listener
     */
    on<K extends keyof InternationalizationEvents>(event: K, handler: InternationalizationEvents[K]): void;
    /**
     * Remove event listener
     */
    off<K extends keyof InternationalizationEvents>(event: K, handler: InternationalizationEvents[K]): void;
    private validateUnicodeSupport;
    private getCharacterCategory;
    private getCharacterName;
    private isBidirectionalCharacter;
    private isCombiningCharacter;
    private isEmojiCharacter;
    private emit;
    private initializeEventMaps;
}
//# sourceMappingURL=UnicodeHandler.d.ts.map