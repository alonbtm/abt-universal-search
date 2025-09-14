/**
 * Core Internationalization Utilities
 * Shared utilities for i18n, RTL, and locale management
 */
import type { TextDirection, LocaleCode, WritingSystem, DirectionDetectionResult, UnicodeAnalysisResult, BidiAnalysisResult, RTLPosition, LayoutMeasurement } from '../types/Internationalization';
/**
 * RTL language codes and their regions
 */
export declare const RTL_LOCALES: Set<string>;
/**
 * Unicode ranges for different writing systems
 */
export declare const UNICODE_RANGES: {
    readonly latin: readonly [readonly [65, 90], readonly [97, 122], readonly [192, 255], readonly [256, 383], readonly [384, 591], readonly [7680, 7935]];
    readonly arabic: readonly [readonly [1536, 1791], readonly [1872, 1919], readonly [2208, 2303], readonly [64336, 65023], readonly [65136, 65279]];
    readonly hebrew: readonly [readonly [1424, 1535], readonly [64285, 64335]];
    readonly cjk: readonly [readonly [19968, 40959], readonly [13312, 19903], readonly [131072, 173791], readonly [12352, 12447], readonly [12448, 12543], readonly [44032, 55215]];
    readonly cyrillic: readonly [readonly [1024, 1279], readonly [1280, 1327], readonly [11744, 11775], readonly [42560, 42655]];
    readonly devanagari: readonly [readonly [2304, 2431], readonly [43232, 43263]];
    readonly thai: readonly [readonly [3584, 3711]];
};
/**
 * Strong RTL characters (Hebrew, Arabic, etc.)
 */
export declare const RTL_CHAR_RANGES: number[][];
/**
 * Check if a locale uses RTL text direction
 */
export declare function isRTLLocale(locale: LocaleCode): boolean;
/**
 * Detect text direction from content
 */
export declare function detectTextDirection(text: string, threshold?: number): DirectionDetectionResult;
/**
 * Check if a Unicode character is RTL
 */
export declare function isRTLCharacter(codePoint: number): boolean;
/**
 * Check if a Unicode character is LTR
 */
export declare function isLTRCharacter(codePoint: number): boolean;
/**
 * Detect writing system from text
 */
export declare function detectWritingSystem(text: string): WritingSystem[];
/**
 * Normalize locale code to standard format
 */
export declare function normalizeLocale(locale: string): LocaleCode;
/**
 * Get language code from locale
 */
export declare function getLanguageFromLocale(locale: LocaleCode): string;
/**
 * Get region code from locale
 */
export declare function getRegionFromLocale(locale: LocaleCode): string;
/**
 * Check if locale is supported by Intl APIs
 */
export declare function isLocaleSupported(locale: LocaleCode): boolean;
/**
 * Get best matching locale from supported list
 */
export declare function getBestMatchingLocale(requestedLocale: LocaleCode, supportedLocales: LocaleCode[]): LocaleCode;
/**
 * Analyze Unicode text for internationalization
 */
export declare function analyzeUnicodeText(text: string): UnicodeAnalysisResult;
/**
 * Perform bidirectional text analysis
 */
export declare function analyzeBidirectionalText(text: string): BidiAnalysisResult;
/**
 * Calculate RTL-aware positioning
 */
export declare function calculateRTLPosition(measurement: LayoutMeasurement, direction: TextDirection, containerWidth?: number): RTLPosition;
/**
 * Convert physical positioning to logical positioning
 */
export declare function toLogicalProperties(styles: Partial<CSSStyleDeclaration>, direction: TextDirection): Record<string, string>;
/**
 * Get browser's preferred locales
 */
export declare function getBrowserLocales(): LocaleCode[];
/**
 * Format placeholder text with interpolation
 */
export declare function formatMessage(template: string, variables?: Record<string, string | number>): string;
/**
 * Escape text for safe interpolation
 */
export declare function escapeInterpolation(text: string): string;
/**
 * Check if CSS logical properties are supported
 */
export declare function supportsLogicalProperties(): boolean;
/**
 * Get text measurement for internationalization
 */
export declare function measureText(text: string, font: string, maxWidth?: number): {
    width: number;
    height: number;
};
//# sourceMappingURL=internationalization.d.ts.map