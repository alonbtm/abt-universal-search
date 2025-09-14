/**
 * Localization Manager
 * Comprehensive text externalization with configurable labels and pluralization
 */
import { ValidationError } from '../utils/validation';
import { normalizeLocale, getBrowserLocales, getBestMatchingLocale } from '../utils/internationalization';
/**
 * Comprehensive localization management with lazy loading and pluralization
 */
export class LocalizationManager {
    constructor(config = {}) {
        this.isInitialized = false;
        this.loadedLocales = new Map();
        this.translationLoaders = new Map();
        this.eventListeners = new Map();
        // Default messages for fallback
        this.defaultMessages = {
            'search.placeholder': 'Search...',
            'search.loading': 'Loading...',
            'search.noResults': 'No results found',
            'search.error': 'Search failed',
            'search.tryAgain': 'Try again',
            'search.clearInput': 'Clear search',
            'search.results': '{count} results',
            'search.result': '{count} result',
            'search.resultsFor': '{count} results for "{query}"',
            'search.resultFor': '{count} result for "{query}"',
            'loading.text': 'Loading...',
            'loading.timeout': 'Taking longer than expected...',
            'error.network': 'Network connection failed',
            'error.timeout': 'Request timed out',
            'error.general': 'Something went wrong',
            'error.retry': 'Retry',
            'error.dismiss': 'Dismiss',
            'empty.noResults': 'No results found',
            'empty.tryDifferent': 'Try different keywords',
            'empty.checkSpelling': 'Check your spelling',
            'empty.useFewer': 'Use fewer words',
            'empty.browseAll': 'Browse all items',
            'aria.combobox': 'Search combobox',
            'aria.listbox': 'Search results',
            'aria.option': 'Search result',
            'aria.loading': 'Loading search results',
            'aria.error': 'Error occurred',
            'aria.noResults': 'No search results',
            'aria.resultsCount': '{count} search results available'
        };
        // Pluralization rules for different locales
        this.pluralizationRules = new Map([
            ['en', (count) => count === 1 ? 'one' : 'other'],
            ['ar', (count) => {
                    if (count === 0)
                        return 'zero';
                    if (count === 1)
                        return 'one';
                    if (count === 2)
                        return 'two';
                    if (count >= 3 && count <= 10)
                        return 'few';
                    if (count >= 11 && count <= 99)
                        return 'many';
                    return 'other';
                }],
            ['he', (count) => {
                    if (count === 1)
                        return 'one';
                    if (count === 2)
                        return 'two';
                    if (count > 10 && count % 10 === 0)
                        return 'many';
                    return 'other';
                }],
            ['ru', (count) => {
                    const mod10 = count % 10;
                    const mod100 = count % 100;
                    if (mod10 === 1 && mod100 !== 11)
                        return 'one';
                    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
                        return 'few';
                    return 'many';
                }]
        ]);
        this.config = {
            defaultLocale: 'en-US',
            supportedLocales: ['en-US'],
            fallbackLocale: 'en-US',
            autoDetectLocale: true,
            enablePluralization: true,
            enableInterpolation: true,
            lazyLoad: true,
            debugMode: false,
            ...config
        };
        this.currentLocale = this.config.defaultLocale;
        this.initializeEventMaps();
    }
    /**
     * Initialize localization manager
     */
    async init() {
        if (this.isInitialized) {
            return;
        }
        try {
            // Auto-detect locale if enabled
            if (this.config.autoDetectLocale) {
                const detectedLocale = this.detectBrowserLocale();
                if (detectedLocale) {
                    this.currentLocale = detectedLocale;
                }
            }
            // Load default locale
            await this.loadLocale(this.currentLocale);
            // Load fallback locale if different
            if (this.currentLocale !== this.config.fallbackLocale) {
                await this.loadLocale(this.config.fallbackLocale);
            }
            this.isInitialized = true;
            if (this.config.debugMode) {
                console.log('LocalizationManager initialized', {
                    currentLocale: this.currentLocale,
                    supportedLocales: this.config.supportedLocales,
                    loadedLocales: Array.from(this.loadedLocales.keys())
                });
            }
        }
        catch (error) {
            throw new ValidationError(`Failed to initialize LocalizationManager: ${error}`);
        }
    }
    /**
     * Destroy localization manager
     */
    destroy() {
        this.loadedLocales.clear();
        this.translationLoaders.clear();
        this.eventListeners.clear();
        this.isInitialized = false;
    }
    /**
     * Set current locale
     */
    async setLocale(locale) {
        const normalizedLocale = normalizeLocale(locale);
        if (!this.config.supportedLocales.includes(normalizedLocale)) {
            throw new ValidationError(`Locale ${normalizedLocale} is not supported`);
        }
        if (normalizedLocale === this.currentLocale) {
            return;
        }
        const previousLocale = this.currentLocale;
        try {
            // Load locale if not already loaded
            if (!this.loadedLocales.has(normalizedLocale)) {
                await this.loadLocale(normalizedLocale);
            }
            this.currentLocale = normalizedLocale;
            this.emit('locale-changed', normalizedLocale, previousLocale);
            if (this.config.debugMode) {
                console.log('Locale changed', { from: previousLocale, to: normalizedLocale });
            }
        }
        catch (error) {
            throw new ValidationError(`Failed to set locale ${normalizedLocale}: ${error}`);
        }
    }
    /**
     * Get current locale
     */
    getCurrentLocale() {
        return this.currentLocale;
    }
    /**
     * Get supported locales
     */
    getSupportedLocales() {
        return [...this.config.supportedLocales];
    }
    /**
     * Check if locale is loaded
     */
    isLocaleLoaded(locale) {
        return this.loadedLocales.has(normalizeLocale(locale));
    }
    /**
     * Get translation with interpolation and pluralization
     */
    getText(key, context = {}) {
        const { variables = {}, count, locale } = context;
        const targetLocale = locale || this.currentLocale;
        // Get base translation
        let translation = this.getTranslation(key, targetLocale);
        // Handle pluralization
        if (this.config.enablePluralization && count !== undefined) {
            translation = this.pluralize(translation, count, targetLocale);
        }
        // Handle interpolation
        if (this.config.enableInterpolation) {
            translation = this.interpolate(translation, { ...variables, count });
        }
        return translation;
    }
    /**
     * Get translation without processing
     */
    getRawText(key, locale) {
        const targetLocale = locale || this.currentLocale;
        return this.getTranslation(key, targetLocale);
    }
    /**
     * Check if translation exists
     */
    hasTranslation(key, locale) {
        const targetLocale = locale || this.currentLocale;
        const localeData = this.loadedLocales.get(targetLocale);
        return !!(localeData && localeData.messages[key]);
    }
    /**
     * Get all translations for current locale
     */
    getAllTranslations(locale) {
        const targetLocale = locale || this.currentLocale;
        const localeData = this.loadedLocales.get(targetLocale);
        if (!localeData) {
            return {};
        }
        const translations = {};
        Object.entries(localeData.messages).forEach(([key, message]) => {
            translations[key] = message.value;
        });
        return translations;
    }
    /**
     * Add translation loader for locale
     */
    addTranslationLoader(locale, loader) {
        this.translationLoaders.set(normalizeLocale(locale), loader);
    }
    /**
     * Remove translation loader
     */
    removeTranslationLoader(locale) {
        this.translationLoaders.delete(normalizeLocale(locale));
    }
    /**
     * Add translations programmatically
     */
    addTranslations(locale, translations) {
        const normalizedLocale = normalizeLocale(locale);
        let localeData = this.loadedLocales.get(normalizedLocale);
        if (!localeData) {
            localeData = this.createEmptyLocaleData(normalizedLocale);
            this.loadedLocales.set(normalizedLocale, localeData);
        }
        Object.entries(translations).forEach(([key, value]) => {
            if (typeof value === 'string') {
                localeData.messages[key] = {
                    key,
                    value,
                    locale: normalizedLocale,
                    direction: 'auto'
                };
            }
            else {
                localeData.messages[key] = value;
            }
        });
        // Update metadata
        localeData.metadata.lastUpdated = new Date();
        localeData.metadata.completeness = this.calculateCompleteness(localeData);
    }
    /**
     * Remove translations
     */
    removeTranslations(locale, keys) {
        const normalizedLocale = normalizeLocale(locale);
        const localeData = this.loadedLocales.get(normalizedLocale);
        if (!localeData)
            return;
        keys.forEach(key => {
            delete localeData.messages[key];
        });
        // Update metadata
        localeData.metadata.lastUpdated = new Date();
        localeData.metadata.completeness = this.calculateCompleteness(localeData);
    }
    /**
     * Get locale data
     */
    getLocaleData(locale) {
        const targetLocale = locale || this.currentLocale;
        return this.loadedLocales.get(targetLocale) || null;
    }
    /**
     * Get missing translation keys
     */
    getMissingKeys(locale) {
        const targetLocale = locale || this.currentLocale;
        const localeData = this.loadedLocales.get(targetLocale);
        if (!localeData)
            return Object.keys(this.defaultMessages);
        const existingKeys = new Set(Object.keys(localeData.messages));
        const defaultKeys = Object.keys(this.defaultMessages);
        return defaultKeys.filter(key => !existingKeys.has(key));
    }
    /**
     * Format number according to locale
     */
    formatNumber(value, options) {
        try {
            return new Intl.NumberFormat(this.currentLocale, options).format(value);
        }
        catch {
            return value.toString();
        }
    }
    /**
     * Format date according to locale
     */
    formatDate(value, options) {
        try {
            return new Intl.DateTimeFormat(this.currentLocale, options).format(value);
        }
        catch {
            return value.toISOString();
        }
    }
    /**
     * Format relative time according to locale
     */
    formatRelativeTime(value, unit) {
        try {
            return new Intl.RelativeTimeFormat(this.currentLocale).format(value, unit);
        }
        catch {
            return `${value} ${unit}`;
        }
    }
    /**
     * Add event listener
     */
    on(event, handler) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(handler);
    }
    /**
     * Remove event listener
     */
    off(event, handler) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(handler);
            if (index >= 0) {
                listeners.splice(index, 1);
            }
        }
    }
    // Private implementation methods
    async loadLocale(locale) {
        const normalizedLocale = normalizeLocale(locale);
        if (this.loadedLocales.has(normalizedLocale)) {
            return;
        }
        try {
            let translations = {};
            // Try custom loader first
            const loader = this.translationLoaders.get(normalizedLocale);
            if (loader) {
                translations = await loader(normalizedLocale);
            }
            else if (this.config.lazyLoad) {
                // Try to load from default location
                try {
                    const response = await fetch(`/locales/${normalizedLocale}.json`);
                    if (response.ok) {
                        translations = await response.json();
                    }
                }
                catch {
                    // Fallback to default messages for base locales
                    if (normalizedLocale === this.config.fallbackLocale) {
                        translations = this.defaultMessages;
                    }
                }
            }
            // Create locale data
            const localeData = this.createLocaleData(normalizedLocale, translations);
            this.loadedLocales.set(normalizedLocale, localeData);
            this.emit('translation-loaded', normalizedLocale, translations);
            if (this.config.debugMode) {
                console.log('Loaded locale', {
                    locale: normalizedLocale,
                    messageCount: Object.keys(translations).length,
                    completeness: localeData.metadata.completeness
                });
            }
        }
        catch (error) {
            this.emit('translation-error', normalizedLocale, error);
            // Fallback to default messages if this is the fallback locale
            if (normalizedLocale === this.config.fallbackLocale) {
                const localeData = this.createLocaleData(normalizedLocale, this.defaultMessages);
                this.loadedLocales.set(normalizedLocale, localeData);
            }
            else {
                throw error;
            }
        }
    }
    createLocaleData(locale, translations) {
        const messages = {};
        Object.entries(translations).forEach(([key, value]) => {
            messages[key] = {
                key,
                value,
                locale,
                direction: 'auto'
            };
        });
        return {
            code: locale,
            name: this.getLocaleName(locale),
            englishName: this.getEnglishName(locale),
            direction: 'auto',
            script: 'latin',
            messages,
            formatting: this.getDefaultFormatting(locale),
            fonts: this.getDefaultFonts(locale),
            metadata: {
                completeness: this.calculateCompleteness({ messages }),
                lastUpdated: new Date()
            }
        };
    }
    createEmptyLocaleData(locale) {
        return this.createLocaleData(locale, {});
    }
    getTranslation(key, locale) {
        // Check target locale
        const localeData = this.loadedLocales.get(locale);
        if (localeData && localeData.messages[key]) {
            return localeData.messages[key].value;
        }
        // Check fallback locale
        if (locale !== this.config.fallbackLocale) {
            const fallbackData = this.loadedLocales.get(this.config.fallbackLocale);
            if (fallbackData && fallbackData.messages[key]) {
                return fallbackData.messages[key].value;
            }
        }
        // Check default messages
        if (this.defaultMessages[key]) {
            return this.defaultMessages[key];
        }
        // Return key as fallback
        if (this.config.debugMode) {
            console.warn(`Missing translation for key: ${key} in locale: ${locale}`);
        }
        return key;
    }
    pluralize(translation, count, locale) {
        // Check if translation has plural forms
        if (!translation.includes('|')) {
            return translation;
        }
        const language = locale.split('-')[0];
        const pluralRule = this.pluralizationRules.get(language) || this.pluralizationRules.get('en');
        const pluralForm = pluralRule(count);
        // Parse plural forms: "zero|one|two|few|many|other"
        const forms = translation.split('|');
        const formMap = {
            zero: forms[0] || forms[forms.length - 1],
            one: forms[1] || forms[0] || forms[forms.length - 1],
            two: forms[2] || forms[1] || forms[0] || forms[forms.length - 1],
            few: forms[3] || forms[forms.length - 1],
            many: forms[4] || forms[forms.length - 1],
            other: forms[forms.length - 1]
        };
        return formMap[pluralForm] || formMap.other;
    }
    interpolate(text, variables) {
        return text.replace(/\{(\w+)\}/g, (match, key) => {
            const value = variables[key];
            if (value === undefined || value === null) {
                return match;
            }
            return String(value);
        });
    }
    detectBrowserLocale() {
        const browserLocales = getBrowserLocales();
        return getBestMatchingLocale(browserLocales[0], this.config.supportedLocales);
    }
    calculateCompleteness(localeData) {
        const totalKeys = Object.keys(this.defaultMessages).length;
        const translatedKeys = Object.keys(localeData.messages).length;
        return totalKeys > 0 ? Math.round((translatedKeys / totalKeys) * 100) : 0;
    }
    getLocaleName(locale) {
        try {
            return new Intl.DisplayNames([locale], { type: 'language' }).of(locale.split('-')[0]) || locale;
        }
        catch {
            return locale;
        }
    }
    getEnglishName(locale) {
        try {
            return new Intl.DisplayNames(['en'], { type: 'language' }).of(locale.split('-')[0]) || locale;
        }
        catch {
            return locale;
        }
    }
    getDefaultFormatting(locale) {
        return {
            dateFormat: { dateStyle: 'medium' },
            numberFormat: {},
            currencyFormat: { style: 'currency' },
            relativeTimeFormat: { numeric: 'auto' },
            listFormat: { style: 'long', type: 'conjunction' },
            pluralRules: {},
            collation: { sensitivity: 'base' }
        };
    }
    getDefaultFonts(locale) {
        const language = locale.split('-')[0];
        const fontMap = {
            'ar': ['Noto Sans Arabic', 'Tahoma', 'Arial Unicode MS'],
            'he': ['Noto Sans Hebrew', 'Tahoma', 'Arial Unicode MS'],
            'zh': ['Noto Sans CJK SC', 'Microsoft YaHei', 'SimSun'],
            'ja': ['Noto Sans CJK JP', 'Hiragino Kaku Gothic Pro', 'Meiryo'],
            'ko': ['Noto Sans CJK KR', 'Malgun Gothic', 'Dotum'],
            'th': ['Noto Sans Thai', 'Leelawadee UI', 'Tahoma'],
            'ru': ['Noto Sans', 'Segoe UI', 'Tahoma'],
            'default': ['Noto Sans', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif']
        };
        return fontMap[language] || fontMap.default;
    }
    emit(event, ...args) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(...args);
                }
                catch (error) {
                    console.error(`Error in LocalizationManager ${event} listener:`, error);
                }
            });
        }
    }
    initializeEventMaps() {
        const events = [
            'locale-changed',
            'translation-loaded',
            'translation-error'
        ];
        events.forEach(event => {
            this.eventListeners.set(event, []);
        });
    }
}
//# sourceMappingURL=LocalizationManager.js.map