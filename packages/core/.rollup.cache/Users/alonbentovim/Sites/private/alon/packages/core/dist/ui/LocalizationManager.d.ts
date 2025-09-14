/**
 * Localization Manager
 * Comprehensive text externalization with configurable labels and pluralization
 */
import type { LocalizationConfig, LocaleCode, LocaleData, TranslationMessage, InterpolationContext, InternationalizationEvents } from '../types/Internationalization';
/**
 * Translation loading function type
 */
type TranslationLoader = (locale: LocaleCode) => Promise<Record<string, string>>;
/**
 * Comprehensive localization management with lazy loading and pluralization
 */
export declare class LocalizationManager {
    private config;
    private currentLocale;
    private isInitialized;
    private loadedLocales;
    private translationLoaders;
    private eventListeners;
    private readonly defaultMessages;
    private readonly pluralizationRules;
    constructor(config?: Partial<LocalizationConfig>);
    /**
     * Initialize localization manager
     */
    init(): Promise<void>;
    /**
     * Destroy localization manager
     */
    destroy(): void;
    /**
     * Set current locale
     */
    setLocale(locale: LocaleCode): Promise<void>;
    /**
     * Get current locale
     */
    getCurrentLocale(): LocaleCode;
    /**
     * Get supported locales
     */
    getSupportedLocales(): LocaleCode[];
    /**
     * Check if locale is loaded
     */
    isLocaleLoaded(locale: LocaleCode): boolean;
    /**
     * Get translation with interpolation and pluralization
     */
    getText(key: string, context?: InterpolationContext): string;
    /**
     * Get translation without processing
     */
    getRawText(key: string, locale?: LocaleCode): string;
    /**
     * Check if translation exists
     */
    hasTranslation(key: string, locale?: LocaleCode): boolean;
    /**
     * Get all translations for current locale
     */
    getAllTranslations(locale?: LocaleCode): Record<string, string>;
    /**
     * Add translation loader for locale
     */
    addTranslationLoader(locale: LocaleCode, loader: TranslationLoader): void;
    /**
     * Remove translation loader
     */
    removeTranslationLoader(locale: LocaleCode): void;
    /**
     * Add translations programmatically
     */
    addTranslations(locale: LocaleCode, translations: Record<string, string | TranslationMessage>): void;
    /**
     * Remove translations
     */
    removeTranslations(locale: LocaleCode, keys: string[]): void;
    /**
     * Get locale data
     */
    getLocaleData(locale?: LocaleCode): LocaleData | null;
    /**
     * Get missing translation keys
     */
    getMissingKeys(locale?: LocaleCode): string[];
    /**
     * Format number according to locale
     */
    formatNumber(value: number, options?: Intl.NumberFormatOptions): string;
    /**
     * Format date according to locale
     */
    formatDate(value: Date, options?: Intl.DateTimeFormatOptions): string;
    /**
     * Format relative time according to locale
     */
    formatRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit): string;
    /**
     * Add event listener
     */
    on<K extends keyof InternationalizationEvents>(event: K, handler: InternationalizationEvents[K]): void;
    /**
     * Remove event listener
     */
    off<K extends keyof InternationalizationEvents>(event: K, handler: InternationalizationEvents[K]): void;
    private loadLocale;
    private createLocaleData;
    private createEmptyLocaleData;
    private getTranslation;
    private pluralize;
    private interpolate;
    private detectBrowserLocale;
    private calculateCompleteness;
    private getLocaleName;
    private getEnglishName;
    private getDefaultFormatting;
    private getDefaultFonts;
    private emit;
    private initializeEventMaps;
}
export {};
//# sourceMappingURL=LocalizationManager.d.ts.map