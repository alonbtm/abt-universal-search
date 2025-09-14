/**
 * Localization Manager
 * Comprehensive text externalization with configurable labels and pluralization
 */

import { ValidationError } from '../utils/validation';
import { 
  normalizeLocale,
  getBrowserLocales,
  getBestMatchingLocale,
  formatMessage
} from '../utils/internationalization';
import type {
  LocalizationConfig,
  LocaleCode,
  LocaleData,
  TranslationMessage,
  InterpolationContext,
  InterpolationValue,
  PluralizationRule,
  InternationalizationEvents
} from '../types/Internationalization';

/**
 * Translation loading function type
 */
type TranslationLoader = (locale: LocaleCode) => Promise<Record<string, string>>;

/**
 * Comprehensive localization management with lazy loading and pluralization
 */
export class LocalizationManager {
  private config: LocalizationConfig;
  private currentLocale: LocaleCode;
  private isInitialized = false;
  private loadedLocales = new Map<LocaleCode, LocaleData>();
  private translationLoaders = new Map<LocaleCode, TranslationLoader>();
  private eventListeners: Map<keyof InternationalizationEvents, Function[]> = new Map();
  
  // Default messages for fallback
  private readonly defaultMessages: Record<string, string> = {
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
  private readonly pluralizationRules: Map<string, PluralizationRule> = new Map([
    ['en', (count: number) => count === 1 ? 'one' : 'other'],
    ['ar', (count: number) => {
      if (count === 0) return 'zero';
      if (count === 1) return 'one';
      if (count === 2) return 'two';
      if (count >= 3 && count <= 10) return 'few';
      if (count >= 11 && count <= 99) return 'many';
      return 'other';
    }],
    ['he', (count: number) => {
      if (count === 1) return 'one';
      if (count === 2) return 'two';
      if (count > 10 && count % 10 === 0) return 'many';
      return 'other';
    }],
    ['ru', (count: number) => {
      const mod10 = count % 10;
      const mod100 = count % 100;
      if (mod10 === 1 && mod100 !== 11) return 'one';
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
      return 'many';
    }]
  ]);

  constructor(config: Partial<LocalizationConfig> = {}) {
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
  public async init(): Promise<void> {
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
    } catch (error) {
      throw new ValidationError(`Failed to initialize LocalizationManager: ${error}`);
    }
  }

  /**
   * Destroy localization manager
   */
  public destroy(): void {
    this.loadedLocales.clear();
    this.translationLoaders.clear();
    this.eventListeners.clear();
    this.isInitialized = false;
  }

  /**
   * Set current locale
   */
  public async setLocale(locale: LocaleCode): Promise<void> {
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
    } catch (error) {
      throw new ValidationError(`Failed to set locale ${normalizedLocale}: ${error}`);
    }
  }

  /**
   * Get current locale
   */
  public getCurrentLocale(): LocaleCode {
    return this.currentLocale;
  }

  /**
   * Get supported locales
   */
  public getSupportedLocales(): LocaleCode[] {
    return [...this.config.supportedLocales];
  }

  /**
   * Check if locale is loaded
   */
  public isLocaleLoaded(locale: LocaleCode): boolean {
    return this.loadedLocales.has(normalizeLocale(locale));
  }

  /**
   * Get translation with interpolation and pluralization
   */
  public getText(
    key: string,
    context: InterpolationContext = {}
  ): string {
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
  public getRawText(key: string, locale?: LocaleCode): string {
    const targetLocale = locale || this.currentLocale;
    return this.getTranslation(key, targetLocale);
  }

  /**
   * Check if translation exists
   */
  public hasTranslation(key: string, locale?: LocaleCode): boolean {
    const targetLocale = locale || this.currentLocale;
    const localeData = this.loadedLocales.get(targetLocale);
    
    return !!(localeData && localeData.messages[key]);
  }

  /**
   * Get all translations for current locale
   */
  public getAllTranslations(locale?: LocaleCode): Record<string, string> {
    const targetLocale = locale || this.currentLocale;
    const localeData = this.loadedLocales.get(targetLocale);
    
    if (!localeData) {
      return {};
    }

    const translations: Record<string, string> = {};
    Object.entries(localeData.messages).forEach(([key, message]) => {
      translations[key] = message.value;
    });

    return translations;
  }

  /**
   * Add translation loader for locale
   */
  public addTranslationLoader(locale: LocaleCode, loader: TranslationLoader): void {
    this.translationLoaders.set(normalizeLocale(locale), loader);
  }

  /**
   * Remove translation loader
   */
  public removeTranslationLoader(locale: LocaleCode): void {
    this.translationLoaders.delete(normalizeLocale(locale));
  }

  /**
   * Add translations programmatically
   */
  public addTranslations(
    locale: LocaleCode,
    translations: Record<string, string | TranslationMessage>
  ): void {
    const normalizedLocale = normalizeLocale(locale);
    let localeData = this.loadedLocales.get(normalizedLocale);

    if (!localeData) {
      localeData = this.createEmptyLocaleData(normalizedLocale);
      this.loadedLocales.set(normalizedLocale, localeData);
    }

    Object.entries(translations).forEach(([key, value]) => {
      if (typeof value === 'string') {
        localeData!.messages[key] = {
          key,
          value,
          locale: normalizedLocale,
          direction: 'auto'
        };
      } else {
        localeData!.messages[key] = value;
      }
    });

    // Update metadata
    localeData.metadata.lastUpdated = new Date();
    localeData.metadata.completeness = this.calculateCompleteness(localeData);
  }

  /**
   * Remove translations
   */
  public removeTranslations(locale: LocaleCode, keys: string[]): void {
    const normalizedLocale = normalizeLocale(locale);
    const localeData = this.loadedLocales.get(normalizedLocale);

    if (!localeData) return;

    keys.forEach(key => {
      delete localeData!.messages[key];
    });

    // Update metadata
    localeData.metadata.lastUpdated = new Date();
    localeData.metadata.completeness = this.calculateCompleteness(localeData);
  }

  /**
   * Get locale data
   */
  public getLocaleData(locale?: LocaleCode): LocaleData | null {
    const targetLocale = locale || this.currentLocale;
    return this.loadedLocales.get(targetLocale) || null;
  }

  /**
   * Get missing translation keys
   */
  public getMissingKeys(locale?: LocaleCode): string[] {
    const targetLocale = locale || this.currentLocale;
    const localeData = this.loadedLocales.get(targetLocale);
    
    if (!localeData) return Object.keys(this.defaultMessages);

    const existingKeys = new Set(Object.keys(localeData.messages));
    const defaultKeys = Object.keys(this.defaultMessages);
    
    return defaultKeys.filter(key => !existingKeys.has(key));
  }

  /**
   * Format number according to locale
   */
  public formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    try {
      return new Intl.NumberFormat(this.currentLocale, options).format(value);
    } catch {
      return value.toString();
    }
  }

  /**
   * Format date according to locale
   */
  public formatDate(value: Date, options?: Intl.DateTimeFormatOptions): string {
    try {
      return new Intl.DateTimeFormat(this.currentLocale, options).format(value);
    } catch {
      return value.toISOString();
    }
  }

  /**
   * Format relative time according to locale
   */
  public formatRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit): string {
    try {
      return new Intl.RelativeTimeFormat(this.currentLocale).format(value, unit);
    } catch {
      return `${value} ${unit}`;
    }
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

  private async loadLocale(locale: LocaleCode): Promise<void> {
    const normalizedLocale = normalizeLocale(locale);

    if (this.loadedLocales.has(normalizedLocale)) {
      return;
    }

    try {
      let translations: Record<string, string> = {};

      // Try custom loader first
      const loader = this.translationLoaders.get(normalizedLocale);
      if (loader) {
        translations = await loader(normalizedLocale);
      } else if (this.config.lazyLoad) {
        // Try to load from default location
        try {
          const response = await fetch(`/locales/${normalizedLocale}.json`);
          if (response.ok) {
            translations = await response.json();
          }
        } catch {
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
    } catch (error) {
      this.emit('translation-error', normalizedLocale, error as Error);
      
      // Fallback to default messages if this is the fallback locale
      if (normalizedLocale === this.config.fallbackLocale) {
        const localeData = this.createLocaleData(normalizedLocale, this.defaultMessages);
        this.loadedLocales.set(normalizedLocale, localeData);
      } else {
        throw error;
      }
    }
  }

  private createLocaleData(locale: LocaleCode, translations: Record<string, string>): LocaleData {
    const messages: Record<string, TranslationMessage> = {};
    
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
        completeness: this.calculateCompleteness({ messages } as LocaleData),
        lastUpdated: new Date()
      }
    };
  }

  private createEmptyLocaleData(locale: LocaleCode): LocaleData {
    return this.createLocaleData(locale, {});
  }

  private getTranslation(key: string, locale: LocaleCode): string {
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

  private pluralize(translation: string, count: number, locale: LocaleCode): string {
    // Check if translation has plural forms
    if (!translation.includes('|')) {
      return translation;
    }

    const language = locale.split('-')[0];
    const pluralRule = this.pluralizationRules.get(language) || this.pluralizationRules.get('en')!;
    const pluralForm = pluralRule(count);

    // Parse plural forms: "zero|one|two|few|many|other"
    const forms = translation.split('|');
    const formMap: Record<string, string> = {
      zero: forms[0] || forms[forms.length - 1],
      one: forms[1] || forms[0] || forms[forms.length - 1],
      two: forms[2] || forms[1] || forms[0] || forms[forms.length - 1],
      few: forms[3] || forms[forms.length - 1],
      many: forms[4] || forms[forms.length - 1],
      other: forms[forms.length - 1]
    };

    return formMap[pluralForm] || formMap.other;
  }

  private interpolate(text: string, variables: Record<string, InterpolationValue>): string {
    return text.replace(/\{(\w+)\}/g, (match, key) => {
      const value = variables[key];
      if (value === undefined || value === null) {
        return match;
      }
      return String(value);
    });
  }

  private detectBrowserLocale(): LocaleCode | null {
    const browserLocales = getBrowserLocales();
    return getBestMatchingLocale(browserLocales[0], this.config.supportedLocales);
  }

  private calculateCompleteness(localeData: LocaleData): number {
    const totalKeys = Object.keys(this.defaultMessages).length;
    const translatedKeys = Object.keys(localeData.messages).length;
    return totalKeys > 0 ? Math.round((translatedKeys / totalKeys) * 100) : 0;
  }

  private getLocaleName(locale: LocaleCode): string {
    try {
      return new Intl.DisplayNames([locale], { type: 'language' }).of(locale.split('-')[0]) || locale;
    } catch {
      return locale;
    }
  }

  private getEnglishName(locale: LocaleCode): string {
    try {
      return new Intl.DisplayNames(['en'], { type: 'language' }).of(locale.split('-')[0]) || locale;
    } catch {
      return locale;
    }
  }

  private getDefaultFormatting(locale: LocaleCode): any {
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

  private getDefaultFonts(locale: LocaleCode): string[] {
    const language = locale.split('-')[0];
    const fontMap: Record<string, string[]> = {
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
          console.error(`Error in LocalizationManager ${event} listener:`, error);
        }
      });
    }
  }

  private initializeEventMaps(): void {
    const events: (keyof InternationalizationEvents)[] = [
      'locale-changed',
      'translation-loaded',
      'translation-error'
    ];

    events.forEach(event => {
      this.eventListeners.set(event, []);
    });
  }
}