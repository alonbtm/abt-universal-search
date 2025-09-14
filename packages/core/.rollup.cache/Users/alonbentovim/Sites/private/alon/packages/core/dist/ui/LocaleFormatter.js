/**
 * Locale Formatter
 * Comprehensive locale-specific formatting for dates, numbers, and currency
 */
import { ValidationError } from '../utils/validation';
import { normalizeLocale } from '../utils/internationalization';
/**
 * Comprehensive locale-specific formatting with caching and fallbacks
 */
export class LocaleFormatter {
    constructor(locale = 'en-US', config = {}) {
        this.isInitialized = false;
        this.formatterCache = new Map();
        this.cacheCleanupInterval = null;
        this.eventListeners = new Map();
        // Default configuration by locale
        this.localeDefaults = {
            'en-US': {
                dateFormat: { dateStyle: 'medium' },
                numberFormat: { useGrouping: true },
                currencyFormat: { style: 'currency', currency: 'USD' }
            },
            'ar-SA': {
                dateFormat: { dateStyle: 'medium', calendar: 'islamic' },
                numberFormat: { useGrouping: true, numberingSystem: 'arab' },
                currencyFormat: { style: 'currency', currency: 'SAR' }
            },
            'he-IL': {
                dateFormat: { dateStyle: 'medium', calendar: 'hebrew' },
                numberFormat: { useGrouping: true },
                currencyFormat: { style: 'currency', currency: 'ILS' }
            },
            'zh-CN': {
                dateFormat: { dateStyle: 'medium' },
                numberFormat: { useGrouping: true },
                currencyFormat: { style: 'currency', currency: 'CNY' }
            },
            'ja-JP': {
                dateFormat: { dateStyle: 'medium', calendar: 'japanese' },
                numberFormat: { useGrouping: true },
                currencyFormat: { style: 'currency', currency: 'JPY', minimumFractionDigits: 0 }
            },
            'de-DE': {
                dateFormat: { dateStyle: 'medium' },
                numberFormat: { useGrouping: true },
                currencyFormat: { style: 'currency', currency: 'EUR' }
            },
            'fr-FR': {
                dateFormat: { dateStyle: 'medium' },
                numberFormat: { useGrouping: true },
                currencyFormat: { style: 'currency', currency: 'EUR' }
            },
            'ru-RU': {
                dateFormat: { dateStyle: 'medium' },
                numberFormat: { useGrouping: true },
                currencyFormat: { style: 'currency', currency: 'RUB' }
            }
        };
        // Currency information by locale
        this.currencyInfo = {
            'USD': { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2 },
            'EUR': { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2 },
            'GBP': { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2 },
            'JPY': { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimals: 0 },
            'CNY': { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', decimals: 2 },
            'SAR': { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal', decimals: 2 },
            'ILS': { code: 'ILS', symbol: '₪', name: 'Israeli Shekel', decimals: 2 },
            'RUB': { code: 'RUB', symbol: '₽', name: 'Russian Ruble', decimals: 2 },
            'INR': { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimals: 2 },
            'KRW': { code: 'KRW', symbol: '₩', name: 'South Korean Won', decimals: 0 }
        };
        // Measurement units by locale preference
        this.measurementUnits = {
            'metric': [
                { unit: 'meter', system: 'metric', type: 'length' },
                { unit: 'kilogram', system: 'metric', type: 'weight' },
                { unit: 'liter', system: 'metric', type: 'volume' },
                { unit: 'celsius', system: 'metric', type: 'temperature' }
            ],
            'imperial': [
                { unit: 'foot', system: 'imperial', type: 'length' },
                { unit: 'pound', system: 'imperial', type: 'weight' },
                { unit: 'gallon', system: 'imperial', type: 'volume' },
                { unit: 'fahrenheit', system: 'imperial', type: 'temperature' }
            ]
        };
        this.currentLocale = normalizeLocale(locale);
        // Merge default configuration with locale-specific defaults
        const localeDefaults = this.localeDefaults[this.currentLocale] || this.localeDefaults['en-US'];
        this.config = {
            dateFormat: { dateStyle: 'medium' },
            numberFormat: { useGrouping: true },
            currencyFormat: { style: 'currency', currency: 'USD' },
            relativeTimeFormat: { numeric: 'auto', style: 'long' },
            listFormat: { style: 'long', type: 'conjunction' },
            pluralRules: {},
            collation: { sensitivity: 'base', numeric: true },
            ...localeDefaults,
            ...config
        };
        this.initializeEventMaps();
    }
    /**
     * Initialize locale formatter
     */
    async init() {
        if (this.isInitialized) {
            return;
        }
        try {
            // Validate Intl API support
            this.validateIntlSupport();
            // Setup cache cleanup
            this.setupCacheCleanup();
            this.isInitialized = true;
        }
        catch (error) {
            throw new ValidationError(`Failed to initialize LocaleFormatter: ${error}`);
        }
    }
    /**
     * Destroy formatter and cleanup resources
     */
    destroy() {
        if (this.cacheCleanupInterval) {
            clearInterval(this.cacheCleanupInterval);
            this.cacheCleanupInterval = null;
        }
        this.formatterCache.clear();
        this.eventListeners.clear();
        this.isInitialized = false;
    }
    /**
     * Set current locale
     */
    setLocale(locale) {
        const normalizedLocale = normalizeLocale(locale);
        if (normalizedLocale === this.currentLocale) {
            return;
        }
        const previousLocale = this.currentLocale;
        this.currentLocale = normalizedLocale;
        // Update configuration with locale defaults
        const localeDefaults = this.localeDefaults[this.currentLocale] || this.localeDefaults['en-US'];
        this.config = { ...this.config, ...localeDefaults };
        // Clear cache to force recreation with new locale
        this.formatterCache.clear();
        this.emit('locale-changed', normalizedLocale, previousLocale);
    }
    /**
     * Get current locale
     */
    getCurrentLocale() {
        return this.currentLocale;
    }
    /**
     * Format date according to locale
     */
    formatDate(date, options) {
        try {
            const dateObj = date instanceof Date ? date : new Date(date);
            const formatOptions = { ...this.config.dateFormat, ...options };
            const formatter = this.getDateTimeFormatter(formatOptions);
            return formatter.format(dateObj);
        }
        catch (error) {
            console.error('Date formatting failed:', error);
            return String(date);
        }
    }
    /**
     * Format relative time (e.g., "2 days ago", "in 3 hours")
     */
    formatRelativeTime(value, unit, options) {
        try {
            const formatOptions = { ...this.config.relativeTimeFormat, ...options };
            const formatter = this.getRelativeTimeFormatter(formatOptions);
            return formatter.format(value, unit);
        }
        catch (error) {
            console.error('Relative time formatting failed:', error);
            return `${value} ${unit}`;
        }
    }
    /**
     * Format time ago (automatically determines unit)
     */
    formatTimeAgo(date) {
        try {
            const dateObj = date instanceof Date ? date : new Date(date);
            const now = new Date();
            const diffMs = now.getTime() - dateObj.getTime();
            const diffSeconds = Math.floor(diffMs / 1000);
            if (diffSeconds < 60) {
                return this.formatRelativeTime(-diffSeconds, 'second');
            }
            else if (diffSeconds < 3600) {
                return this.formatRelativeTime(-Math.floor(diffSeconds / 60), 'minute');
            }
            else if (diffSeconds < 86400) {
                return this.formatRelativeTime(-Math.floor(diffSeconds / 3600), 'hour');
            }
            else if (diffSeconds < 2592000) {
                return this.formatRelativeTime(-Math.floor(diffSeconds / 86400), 'day');
            }
            else if (diffSeconds < 31536000) {
                return this.formatRelativeTime(-Math.floor(diffSeconds / 2592000), 'month');
            }
            else {
                return this.formatRelativeTime(-Math.floor(diffSeconds / 31536000), 'year');
            }
        }
        catch (error) {
            console.error('Time ago formatting failed:', error);
            return this.formatDate(date);
        }
    }
    /**
     * Format number according to locale
     */
    formatNumber(value, options) {
        try {
            const formatOptions = { ...this.config.numberFormat, ...options };
            const formatter = this.getNumberFormatter(formatOptions);
            return formatter.format(value);
        }
        catch (error) {
            console.error('Number formatting failed:', error);
            return value.toString();
        }
    }
    /**
     * Format currency according to locale
     */
    formatCurrency(value, currency, options) {
        try {
            const currencyCode = currency || this.config.currencyFormat?.currency || 'USD';
            const formatOptions = {
                ...this.config.currencyFormat,
                currency: currencyCode,
                ...options
            };
            const formatter = this.getNumberFormatter(formatOptions);
            return formatter.format(value);
        }
        catch (error) {
            console.error('Currency formatting failed:', error);
            const currencyInfo = this.currencyInfo[currency || 'USD'];
            return `${currencyInfo?.symbol || '$'}${value}`;
        }
    }
    /**
     * Format percentage according to locale
     */
    formatPercentage(value, options) {
        try {
            const formatOptions = {
                style: 'percent',
                ...this.config.numberFormat,
                ...options
            };
            const formatter = this.getNumberFormatter(formatOptions);
            return formatter.format(value);
        }
        catch (error) {
            console.error('Percentage formatting failed:', error);
            return `${(value * 100).toFixed(1)}%`;
        }
    }
    /**
     * Format list according to locale
     */
    formatList(items, options) {
        try {
            const formatOptions = { ...this.config.listFormat, ...options };
            const formatter = this.getListFormatter(formatOptions);
            return formatter.format(items);
        }
        catch (error) {
            console.error('List formatting failed:', error);
            return items.join(', ');
        }
    }
    /**
     * Format file size with locale-appropriate units
     */
    formatFileSize(bytes, binary = true) {
        const base = binary ? 1024 : 1000;
        const units = binary
            ? ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
            : ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        if (bytes === 0)
            return '0 B';
        const exponent = Math.floor(Math.log(bytes) / Math.log(base));
        const value = bytes / Math.pow(base, exponent);
        const unit = units[Math.min(exponent, units.length - 1)];
        return `${this.formatNumber(value, { maximumFractionDigits: 1 })} ${unit}`;
    }
    /**
     * Format measurement value with appropriate units
     */
    formatMeasurement(value, type, preferredSystem) {
        const system = preferredSystem || this.getPreferredMeasurementSystem();
        const units = this.measurementUnits[system].filter(unit => unit.type === type);
        if (units.length === 0) {
            return this.formatNumber(value);
        }
        const unit = units[0];
        const formattedValue = this.formatNumber(value);
        return `${formattedValue} ${unit.unit}`;
    }
    /**
     * Format duration in human-readable format
     */
    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (days > 0) {
            return this.formatList([
                `${days} ${days === 1 ? 'day' : 'days'}`,
                ...(hours % 24 > 0 ? [`${hours % 24} ${hours % 24 === 1 ? 'hour' : 'hours'}`] : [])
            ]);
        }
        else if (hours > 0) {
            return this.formatList([
                `${hours} ${hours === 1 ? 'hour' : 'hours'}`,
                ...(minutes % 60 > 0 ? [`${minutes % 60} ${minutes % 60 === 1 ? 'minute' : 'minutes'}`] : [])
            ]);
        }
        else if (minutes > 0) {
            return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
        }
        else {
            return `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
        }
    }
    /**
     * Get currency information
     */
    getCurrencyInfo(currency) {
        return this.currencyInfo[currency] || null;
    }
    /**
     * Get supported currencies
     */
    getSupportedCurrencies() {
        return Object.keys(this.currencyInfo);
    }
    /**
     * Clear formatter cache
     */
    clearCache() {
        this.formatterCache.clear();
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        // This is a simplified implementation
        return {
            size: this.formatterCache.size,
            hitRate: 0.85 // Placeholder
        };
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
    getDateTimeFormatter(options) {
        const cacheKey = `date:${this.currentLocale}:${JSON.stringify(options)}`;
        const cached = this.getCachedFormatter(cacheKey);
        if (cached) {
            return cached;
        }
        const formatter = new Intl.DateTimeFormat(this.currentLocale, options);
        this.setCachedFormatter(cacheKey, formatter);
        return formatter;
    }
    getNumberFormatter(options) {
        const cacheKey = `number:${this.currentLocale}:${JSON.stringify(options)}`;
        const cached = this.getCachedFormatter(cacheKey);
        if (cached) {
            return cached;
        }
        const formatter = new Intl.NumberFormat(this.currentLocale, options);
        this.setCachedFormatter(cacheKey, formatter);
        return formatter;
    }
    getRelativeTimeFormatter(options) {
        const cacheKey = `relativeTime:${this.currentLocale}:${JSON.stringify(options)}`;
        const cached = this.getCachedFormatter(cacheKey);
        if (cached) {
            return cached;
        }
        const formatter = new Intl.RelativeTimeFormat(this.currentLocale, options);
        this.setCachedFormatter(cacheKey, formatter);
        return formatter;
    }
    getListFormatter(options) {
        const cacheKey = `list:${this.currentLocale}:${JSON.stringify(options)}`;
        const cached = this.getCachedFormatter(cacheKey);
        if (cached) {
            return cached;
        }
        const formatter = new Intl.ListFormat(this.currentLocale, options);
        this.setCachedFormatter(cacheKey, formatter);
        return formatter;
    }
    getCachedFormatter(cacheKey) {
        const entry = this.formatterCache.get(cacheKey);
        if (!entry)
            return null;
        if (Date.now() > entry.expiresAt) {
            this.formatterCache.delete(cacheKey);
            return null;
        }
        return entry.formatter;
    }
    setCachedFormatter(cacheKey, formatter) {
        const now = Date.now();
        const entry = {
            formatter,
            timestamp: now,
            expiresAt: now + (30 * 60 * 1000) // 30 minutes
        };
        this.formatterCache.set(cacheKey, entry);
    }
    getPreferredMeasurementSystem() {
        // Determine preferred measurement system based on locale
        const imperialLocales = ['en-US', 'en-GB', 'my-MM'];
        return imperialLocales.includes(this.currentLocale) ? 'imperial' : 'metric';
    }
    validateIntlSupport() {
        const requiredAPIs = [
            'DateTimeFormat',
            'NumberFormat',
            'RelativeTimeFormat',
            'ListFormat'
        ];
        for (const api of requiredAPIs) {
            if (!(api in Intl)) {
                throw new Error(`Intl.${api} is not supported`);
            }
        }
    }
    setupCacheCleanup() {
        // Clean expired cache entries every 10 minutes
        this.cacheCleanupInterval = window.setInterval(() => {
            const now = Date.now();
            for (const [key, entry] of this.formatterCache.entries()) {
                if (now > entry.expiresAt) {
                    this.formatterCache.delete(key);
                }
            }
        }, 10 * 60 * 1000);
    }
    emit(event, ...args) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(...args);
                }
                catch (error) {
                    console.error(`Error in LocaleFormatter ${event} listener:`, error);
                }
            });
        }
    }
    initializeEventMaps() {
        const events = [
            'locale-changed'
        ];
        events.forEach(event => {
            this.eventListeners.set(event, []);
        });
    }
}
//# sourceMappingURL=LocaleFormatter.js.map