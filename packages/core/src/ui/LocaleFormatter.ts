/**
 * Locale Formatter
 * Comprehensive locale-specific formatting for dates, numbers, and currency
 */

import { ValidationError } from '../utils/validation';
import { normalizeLocale } from '../utils/internationalization';
import type {
  LocaleFormattingConfig,
  LocaleCode,
  InternationalizationEvents
} from '../types/Internationalization';

/**
 * Formatting cache entry
 */
interface FormatterCacheEntry {
  formatter: Intl.DateTimeFormat | Intl.NumberFormat | Intl.RelativeTimeFormat | Intl.ListFormat;
  timestamp: number;
  expiresAt: number;
}

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
 * Measurement unit information
 */
interface MeasurementUnit {
  unit: string;
  system: 'metric' | 'imperial';
  type: 'length' | 'weight' | 'volume' | 'temperature' | 'area';
}

/**
 * Comprehensive locale-specific formatting with caching and fallbacks
 */
export class LocaleFormatter {
  private config: LocaleFormattingConfig;
  private currentLocale: LocaleCode;
  private isInitialized = false;
  private formatterCache = new Map<string, FormatterCacheEntry>();
  private cacheCleanupInterval: number | null = null;
  private eventListeners: Map<keyof InternationalizationEvents, Function[]> = new Map();

  // Default configuration by locale
  private readonly localeDefaults: Record<string, Partial<LocaleFormattingConfig>> = {
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
  private readonly currencyInfo: Record<string, CurrencyInfo> = {
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
  private readonly measurementUnits: Record<string, MeasurementUnit[]> = {
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

  constructor(locale: LocaleCode = 'en-US', config: Partial<LocaleFormattingConfig> = {}) {
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
  public async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Validate Intl API support
      this.validateIntlSupport();
      
      // Setup cache cleanup
      this.setupCacheCleanup();
      
      this.isInitialized = true;
    } catch (error) {
      throw new ValidationError(`Failed to initialize LocaleFormatter: ${error}`);
    }
  }

  /**
   * Destroy formatter and cleanup resources
   */
  public destroy(): void {
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
  public setLocale(locale: LocaleCode): void {
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
  public getCurrentLocale(): LocaleCode {
    return this.currentLocale;
  }

  /**
   * Format date according to locale
   */
  public formatDate(
    date: Date | number | string,
    options?: Intl.DateTimeFormatOptions
  ): string {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      const formatOptions = { ...this.config.dateFormat, ...options };
      const formatter = this.getDateTimeFormatter(formatOptions);
      
      return formatter.format(dateObj);
    } catch (error) {
      console.error('Date formatting failed:', error);
      return String(date);
    }
  }

  /**
   * Format relative time (e.g., "2 days ago", "in 3 hours")
   */
  public formatRelativeTime(
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    options?: Intl.RelativeTimeFormatOptions
  ): string {
    try {
      const formatOptions = { ...this.config.relativeTimeFormat, ...options };
      const formatter = this.getRelativeTimeFormatter(formatOptions);
      
      return formatter.format(value, unit);
    } catch (error) {
      console.error('Relative time formatting failed:', error);
      return `${value} ${unit}`;
    }
  }

  /**
   * Format time ago (automatically determines unit)
   */
  public formatTimeAgo(date: Date | number | string): string {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      const now = new Date();
      const diffMs = now.getTime() - dateObj.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);

      if (diffSeconds < 60) {
        return this.formatRelativeTime(-diffSeconds, 'second');
      } else if (diffSeconds < 3600) {
        return this.formatRelativeTime(-Math.floor(diffSeconds / 60), 'minute');
      } else if (diffSeconds < 86400) {
        return this.formatRelativeTime(-Math.floor(diffSeconds / 3600), 'hour');
      } else if (diffSeconds < 2592000) {
        return this.formatRelativeTime(-Math.floor(diffSeconds / 86400), 'day');
      } else if (diffSeconds < 31536000) {
        return this.formatRelativeTime(-Math.floor(diffSeconds / 2592000), 'month');
      } else {
        return this.formatRelativeTime(-Math.floor(diffSeconds / 31536000), 'year');
      }
    } catch (error) {
      console.error('Time ago formatting failed:', error);
      return this.formatDate(date);
    }
  }

  /**
   * Format number according to locale
   */
  public formatNumber(
    value: number,
    options?: Intl.NumberFormatOptions
  ): string {
    try {
      const formatOptions = { ...this.config.numberFormat, ...options };
      const formatter = this.getNumberFormatter(formatOptions);
      
      return formatter.format(value);
    } catch (error) {
      console.error('Number formatting failed:', error);
      return value.toString();
    }
  }

  /**
   * Format currency according to locale
   */
  public formatCurrency(
    value: number,
    currency?: string,
    options?: Intl.NumberFormatOptions
  ): string {
    try {
      const currencyCode = currency || this.config.currencyFormat?.currency || 'USD';
      const formatOptions = { 
        ...this.config.currencyFormat, 
        currency: currencyCode,
        ...options 
      };
      const formatter = this.getNumberFormatter(formatOptions);
      
      return formatter.format(value);
    } catch (error) {
      console.error('Currency formatting failed:', error);
      const currencyInfo = this.currencyInfo[currency || 'USD'];
      return `${currencyInfo?.symbol || '$'}${value}`;
    }
  }

  /**
   * Format percentage according to locale
   */
  public formatPercentage(
    value: number,
    options?: Intl.NumberFormatOptions
  ): string {
    try {
      const formatOptions = { 
        style: 'percent',
        ...this.config.numberFormat,
        ...options 
      };
      const formatter = this.getNumberFormatter(formatOptions);
      
      return formatter.format(value);
    } catch (error) {
      console.error('Percentage formatting failed:', error);
      return `${(value * 100).toFixed(1)}%`;
    }
  }

  /**
   * Format list according to locale
   */
  public formatList(
    items: string[],
    options?: Intl.ListFormatOptions
  ): string {
    try {
      const formatOptions = { ...this.config.listFormat, ...options };
      const formatter = this.getListFormatter(formatOptions);
      
      return formatter.format(items);
    } catch (error) {
      console.error('List formatting failed:', error);
      return items.join(', ');
    }
  }

  /**
   * Format file size with locale-appropriate units
   */
  public formatFileSize(bytes: number, binary = true): string {
    const base = binary ? 1024 : 1000;
    const units = binary 
      ? ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
      : ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

    if (bytes === 0) return '0 B';

    const exponent = Math.floor(Math.log(bytes) / Math.log(base));
    const value = bytes / Math.pow(base, exponent);
    const unit = units[Math.min(exponent, units.length - 1)];

    return `${this.formatNumber(value, { maximumFractionDigits: 1 })} ${unit}`;
  }

  /**
   * Format measurement value with appropriate units
   */
  public formatMeasurement(
    value: number,
    type: 'length' | 'weight' | 'volume' | 'temperature',
    preferredSystem?: 'metric' | 'imperial'
  ): string {
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
  public formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return this.formatList([
        `${days} ${days === 1 ? 'day' : 'days'}`,
        ...(hours % 24 > 0 ? [`${hours % 24} ${hours % 24 === 1 ? 'hour' : 'hours'}`] : [])
      ]);
    } else if (hours > 0) {
      return this.formatList([
        `${hours} ${hours === 1 ? 'hour' : 'hours'}`,
        ...(minutes % 60 > 0 ? [`${minutes % 60} ${minutes % 60 === 1 ? 'minute' : 'minutes'}`] : [])
      ]);
    } else if (minutes > 0) {
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    } else {
      return `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
    }
  }

  /**
   * Get currency information
   */
  public getCurrencyInfo(currency: string): CurrencyInfo | null {
    return this.currencyInfo[currency] || null;
  }

  /**
   * Get supported currencies
   */
  public getSupportedCurrencies(): string[] {
    return Object.keys(this.currencyInfo);
  }

  /**
   * Clear formatter cache
   */
  public clearCache(): void {
    this.formatterCache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; hitRate: number } {
    // This is a simplified implementation
    return {
      size: this.formatterCache.size,
      hitRate: 0.85 // Placeholder
    };
  }

  /**
   * Add event listener
   */
  public on<K extends keyof InternationalizationEvents>(
    event: K,
    handler: InternationalizationEvents[K]
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(handler);
  }

  /**
   * Remove event listener
   */
  public off<K extends keyof InternationalizationEvents>(
    event: K,
    handler: InternationalizationEvents[K]
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(handler);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    }
  }

  // Private implementation methods

  private getDateTimeFormatter(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
    const cacheKey = `date:${this.currentLocale}:${JSON.stringify(options)}`;
    const cached = this.getCachedFormatter(cacheKey);
    
    if (cached) {
      return cached as Intl.DateTimeFormat;
    }

    const formatter = new Intl.DateTimeFormat(this.currentLocale, options);
    this.setCachedFormatter(cacheKey, formatter);
    
    return formatter;
  }

  private getNumberFormatter(options: Intl.NumberFormatOptions): Intl.NumberFormat {
    const cacheKey = `number:${this.currentLocale}:${JSON.stringify(options)}`;
    const cached = this.getCachedFormatter(cacheKey);
    
    if (cached) {
      return cached as Intl.NumberFormat;
    }

    const formatter = new Intl.NumberFormat(this.currentLocale, options);
    this.setCachedFormatter(cacheKey, formatter);
    
    return formatter;
  }

  private getRelativeTimeFormatter(options: Intl.RelativeTimeFormatOptions): Intl.RelativeTimeFormat {
    const cacheKey = `relativeTime:${this.currentLocale}:${JSON.stringify(options)}`;
    const cached = this.getCachedFormatter(cacheKey);
    
    if (cached) {
      return cached as Intl.RelativeTimeFormat;
    }

    const formatter = new Intl.RelativeTimeFormat(this.currentLocale, options);
    this.setCachedFormatter(cacheKey, formatter);
    
    return formatter;
  }

  private getListFormatter(options: Intl.ListFormatOptions): Intl.ListFormat {
    const cacheKey = `list:${this.currentLocale}:${JSON.stringify(options)}`;
    const cached = this.getCachedFormatter(cacheKey);
    
    if (cached) {
      return cached as Intl.ListFormat;
    }

    const formatter = new Intl.ListFormat(this.currentLocale, options);
    this.setCachedFormatter(cacheKey, formatter);
    
    return formatter;
  }

  private getCachedFormatter(cacheKey: string): any {
    const entry = this.formatterCache.get(cacheKey);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.formatterCache.delete(cacheKey);
      return null;
    }
    
    return entry.formatter;
  }

  private setCachedFormatter(cacheKey: string, formatter: any): void {
    const now = Date.now();
    const entry: FormatterCacheEntry = {
      formatter,
      timestamp: now,
      expiresAt: now + (30 * 60 * 1000) // 30 minutes
    };
    
    this.formatterCache.set(cacheKey, entry);
  }

  private getPreferredMeasurementSystem(): 'metric' | 'imperial' {
    // Determine preferred measurement system based on locale
    const imperialLocales = ['en-US', 'en-GB', 'my-MM'];
    return imperialLocales.includes(this.currentLocale) ? 'imperial' : 'metric';
  }

  private validateIntlSupport(): void {
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

  private setupCacheCleanup(): void {
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

  private emit<K extends keyof InternationalizationEvents>(
    event: K,
    ...args: Parameters<InternationalizationEvents[K]>
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          (listener as any)(...args);
        } catch (error) {
          console.error(`Error in LocaleFormatter ${event} listener:`, error);
        }
      });
    }
  }

  private initializeEventMaps(): void {
    const events: (keyof InternationalizationEvents)[] = [
      'locale-changed'
    ];

    events.forEach(event => {
      this.eventListeners.set(event, []);
    });
  }
}