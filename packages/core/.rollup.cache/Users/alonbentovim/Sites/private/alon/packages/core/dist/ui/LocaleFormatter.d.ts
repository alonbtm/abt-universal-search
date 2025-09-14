/**
 * Locale Formatter
 * Comprehensive locale-specific formatting for dates, numbers, and currency
 */
import type { LocaleFormattingConfig, LocaleCode, InternationalizationEvents } from '../types/Internationalization';
/**
 * Currency information
 */
interface CurrencyInfo {
    code: string;
    symbol: string;
    name: string;
    decimals: number;
}
/**
 * Comprehensive locale-specific formatting with caching and fallbacks
 */
export declare class LocaleFormatter {
    private config;
    private currentLocale;
    private isInitialized;
    private formatterCache;
    private cacheCleanupInterval;
    private eventListeners;
    private readonly localeDefaults;
    private readonly currencyInfo;
    private readonly measurementUnits;
    constructor(locale?: LocaleCode, config?: Partial<LocaleFormattingConfig>);
    /**
     * Initialize locale formatter
     */
    init(): Promise<void>;
    /**
     * Destroy formatter and cleanup resources
     */
    destroy(): void;
    /**
     * Set current locale
     */
    setLocale(locale: LocaleCode): void;
    /**
     * Get current locale
     */
    getCurrentLocale(): LocaleCode;
    /**
     * Format date according to locale
     */
    formatDate(date: Date | number | string, options?: Intl.DateTimeFormatOptions): string;
    /**
     * Format relative time (e.g., "2 days ago", "in 3 hours")
     */
    formatRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions): string;
    /**
     * Format time ago (automatically determines unit)
     */
    formatTimeAgo(date: Date | number | string): string;
    /**
     * Format number according to locale
     */
    formatNumber(value: number, options?: Intl.NumberFormatOptions): string;
    /**
     * Format currency according to locale
     */
    formatCurrency(value: number, currency?: string, options?: Intl.NumberFormatOptions): string;
    /**
     * Format percentage according to locale
     */
    formatPercentage(value: number, options?: Intl.NumberFormatOptions): string;
    /**
     * Format list according to locale
     */
    formatList(items: string[], options?: Intl.ListFormatOptions): string;
    /**
     * Format file size with locale-appropriate units
     */
    formatFileSize(bytes: number, binary?: boolean): string;
    /**
     * Format measurement value with appropriate units
     */
    formatMeasurement(value: number, type: 'length' | 'weight' | 'volume' | 'temperature', preferredSystem?: 'metric' | 'imperial'): string;
    /**
     * Format duration in human-readable format
     */
    formatDuration(milliseconds: number): string;
    /**
     * Get currency information
     */
    getCurrencyInfo(currency: string): CurrencyInfo | null;
    /**
     * Get supported currencies
     */
    getSupportedCurrencies(): string[];
    /**
     * Clear formatter cache
     */
    clearCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        hitRate: number;
    };
    /**
     * Add event listener
     */
    on<K extends keyof InternationalizationEvents>(event: K, handler: InternationalizationEvents[K]): void;
    /**
     * Remove event listener
     */
    off<K extends keyof InternationalizationEvents>(event: K, handler: InternationalizationEvents[K]): void;
    private getDateTimeFormatter;
    private getNumberFormatter;
    private getRelativeTimeFormatter;
    private getListFormatter;
    private getCachedFormatter;
    private setCachedFormatter;
    private getPreferredMeasurementSystem;
    private validateIntlSupport;
    private setupCacheCleanup;
    private emit;
    private initializeEventMaps;
}
export {};
//# sourceMappingURL=LocaleFormatter.d.ts.map