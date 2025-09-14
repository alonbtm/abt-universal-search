/**
 * Internationalization Type Definitions
 * Comprehensive types for i18n, RTL support, and locale management
 */

/**
 * Supported text directions
 */
export type TextDirection = 'ltr' | 'rtl' | 'auto';

/**
 * Locale code format (ISO 639-1 language + ISO 3166-1 country)
 */
export type LocaleCode = string; // e.g., 'en-US', 'ar-SA', 'he-IL', 'zh-CN'

/**
 * Supported writing systems
 */
export type WritingSystem = 'latin' | 'arabic' | 'hebrew' | 'cjk' | 'cyrillic' | 'devanagari' | 'thai' | 'mixed';

/**
 * Font weight preferences for different writing systems
 */
export type FontWeight = 'normal' | 'medium' | 'semibold' | 'bold';

/**
 * Text alignment options that work with both LTR and RTL
 */
export type TextAlign = 'start' | 'end' | 'center' | 'justify';

/**
 * RTL layout configuration
 */
export interface RTLConfig {
  /** Enable RTL layout support */
  enabled: boolean;
  /** Automatically detect RTL from content */
  autoDetect: boolean;
  /** Force RTL direction regardless of content */
  forceDirection?: TextDirection;
  /** Mirror animations and transitions for RTL */
  mirrorAnimations: boolean;
  /** Use CSS logical properties */
  useLogicalProperties: boolean;
  /** RTL-specific CSS class names */
  rtlClassName: string;
  /** Debug mode for RTL development */
  debugMode: boolean;
}

/**
 * Text direction detection configuration
 */
export interface TextDirectionConfig {
  /** Threshold for RTL character detection (0-1) */
  rtlThreshold: number;
  /** Enable detection from user locale */
  detectFromLocale: boolean;
  /** Enable detection from content */
  detectFromContent: boolean;
  /** Cache detection results */
  cacheResults: boolean;
  /** Fallback direction when detection fails */
  fallbackDirection: TextDirection;
}

/**
 * Localization configuration
 */
export interface LocalizationConfig {
  /** Default locale */
  defaultLocale: LocaleCode;
  /** Available locales */
  supportedLocales: LocaleCode[];
  /** Fallback locale for missing translations */
  fallbackLocale: LocaleCode;
  /** Enable locale detection from browser */
  autoDetectLocale: boolean;
  /** Namespace for translation keys */
  namespace?: string;
  /** Enable pluralization support */
  enablePluralization: boolean;
  /** Enable interpolation support */
  enableInterpolation: boolean;
  /** Lazy load locale data */
  lazyLoad: boolean;
  /** Debug mode */
  debugMode: boolean;
}

/**
 * Unicode handling configuration
 */
export interface UnicodeConfig {
  /** Normalization form (NFC, NFD, NFKC, NFKD) */
  normalizationForm: 'NFC' | 'NFD' | 'NFKC' | 'NFKD';
  /** Enable bidirectional text support */
  enableBidi: boolean;
  /** Enable combining character support */
  enableCombining: boolean;
  /** Handle emoji and symbols */
  handleEmoji: boolean;
  /** Validate Unicode input */
  validateInput: boolean;
  /** Debug Unicode processing */
  debugMode: boolean;
}

/**
 * Locale formatting configuration
 */
export interface LocaleFormattingConfig {
  /** Date formatting options */
  dateFormat: Intl.DateTimeFormatOptions;
  /** Number formatting options */
  numberFormat: Intl.NumberFormatOptions;
  /** Currency formatting options */
  currencyFormat: Intl.NumberFormatOptions;
  /** Relative time formatting */
  relativeTimeFormat: Intl.RelativeTimeFormatOptions;
  /** List formatting options */
  listFormat: Intl.ListFormatOptions;
  /** Plural rule options */
  pluralRules: Intl.PluralRulesOptions;
  /** Collation options for sorting */
  collation: Intl.CollatorOptions;
}

/**
 * Font management configuration
 */
export interface FontConfig {
  /** Primary font family */
  primaryFont: string;
  /** Fallback fonts by writing system */
  fallbackFonts: Record<WritingSystem, string[]>;
  /** Web font loading strategy */
  loadingStrategy: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
  /** Font display property */
  fontDisplay: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
  /** Preload critical fonts */
  preloadFonts: string[];
  /** Font weight mapping for different scripts */
  weightMapping: Record<WritingSystem, FontWeight>;
  /** Enable font optimization */
  enableOptimization: boolean;
}

/**
 * Complete internationalization configuration
 */
export interface InternationalizationConfig {
  /** RTL layout configuration */
  rtl: RTLConfig;
  /** Text direction detection */
  textDirection: TextDirectionConfig;
  /** Localization settings */
  localization: LocalizationConfig;
  /** Unicode handling */
  unicode: UnicodeConfig;
  /** Locale formatting */
  formatting: LocaleFormattingConfig;
  /** Font management */
  fonts: FontConfig;
  /** Debug mode for entire i18n system */
  debugMode: boolean;
}

/**
 * Translation message with metadata
 */
export interface TranslationMessage {
  /** Translation key */
  key: string;
  /** Translated text */
  value: string;
  /** Locale for this translation */
  locale: LocaleCode;
  /** Text direction for this message */
  direction: TextDirection;
  /** Message context for translators */
  context?: string;
  /** Pluralization rules */
  plurals?: Record<string, string>;
  /** Interpolation variables */
  variables?: string[];
}

/**
 * Locale data structure
 */
export interface LocaleData {
  /** Locale code */
  code: LocaleCode;
  /** Display name in the locale itself */
  name: string;
  /** Display name in English */
  englishName: string;
  /** Text direction */
  direction: TextDirection;
  /** Writing system */
  script: WritingSystem;
  /** Translation messages */
  messages: Record<string, TranslationMessage>;
  /** Formatting configuration */
  formatting: LocaleFormattingConfig;
  /** Font preferences */
  fonts: string[];
  /** Metadata */
  metadata: {
    /** Completion percentage */
    completeness: number;
    /** Last update timestamp */
    lastUpdated: Date;
    /** Translator credits */
    translators?: string[];
  };
}

/**
 * Text direction detection result
 */
export interface DirectionDetectionResult {
  /** Detected direction */
  direction: TextDirection;
  /** Confidence score (0-1) */
  confidence: number;
  /** Detection method used */
  method: 'content' | 'locale' | 'configuration' | 'fallback';
  /** LTR character count */
  ltrChars: number;
  /** RTL character count */
  rtlChars: number;
  /** Neutral character count */
  neutralChars: number;
  /** Total character count */
  totalChars: number;
}

/**
 * RTL layout detection result
 */
export interface RTLDetectionResult {
  /** Whether RTL layout should be used */
  isRTL: boolean;
  /** Source of RTL detection */
  source: 'content' | 'locale' | 'configuration' | 'manual';
  /** Text direction */
  direction: TextDirection;
  /** Confidence level */
  confidence: number;
  /** Locale that influenced detection */
  influencingLocale?: LocaleCode;
}

/**
 * Unicode analysis result
 */
export interface UnicodeAnalysisResult {
  /** Original text */
  original: string;
  /** Normalized text */
  normalized: string;
  /** Detected writing systems */
  scripts: WritingSystem[];
  /** Contains bidirectional text */
  hasBidi: boolean;
  /** Contains combining characters */
  hasCombining: boolean;
  /** Contains emoji */
  hasEmoji: boolean;
  /** Character count by category */
  characterCounts: {
    latin: number;
    arabic: number;
    hebrew: number;
    cjk: number;
    cyrillic: number;
    other: number;
  };
  /** Validation result */
  isValid: boolean;
  /** Validation errors */
  validationErrors: string[];
}

/**
 * Font loading result
 */
export interface FontLoadingResult {
  /** Font family name */
  family: string;
  /** Loading status */
  status: 'loading' | 'loaded' | 'error' | 'timeout';
  /** Loading time in milliseconds */
  loadTime?: number;
  /** Error message if failed */
  error?: string;
  /** Writing systems supported */
  supportedScripts: WritingSystem[];
  /** Font weight */
  weight: FontWeight;
  /** Font style */
  style: 'normal' | 'italic' | 'oblique';
}

/**
 * Internationalization event types
 */
export interface InternationalizationEvents {
  'locale-changed': (locale: LocaleCode, previousLocale: LocaleCode) => void;
  'direction-changed': (direction: TextDirection, previousDirection: TextDirection) => void;
  'translation-loaded': (locale: LocaleCode, messages: Record<string, string>) => void;
  'translation-error': (locale: LocaleCode, error: Error) => void;
  'font-loaded': (result: FontLoadingResult) => void;
  'font-error': (family: string, error: Error) => void;
  'rtl-toggle': (isRTL: boolean) => void;
  'unicode-processed': (result: UnicodeAnalysisResult) => void;
}

/**
 * Pluralization rule function
 */
export type PluralizationRule = (count: number, locale: LocaleCode) => 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/**
 * Interpolation variable value
 */
export type InterpolationValue = string | number | Date | boolean;

/**
 * Translation interpolation context
 */
export interface InterpolationContext {
  /** Variable values */
  variables: Record<string, InterpolationValue>;
  /** Count for pluralization */
  count?: number;
  /** Context for conditional translations */
  context?: string;
  /** Locale for formatting */
  locale?: LocaleCode;
}

/**
 * Bidirectional text segment
 */
export interface BidiSegment {
  /** Text content */
  text: string;
  /** Text direction */
  direction: TextDirection;
  /** Start index in original text */
  start: number;
  /** End index in original text */
  end: number;
  /** Embedding level */
  level: number;
}

/**
 * Bidirectional text analysis result
 */
export interface BidiAnalysisResult {
  /** Original text */
  original: string;
  /** Base direction */
  baseDirection: TextDirection;
  /** Text segments with directions */
  segments: BidiSegment[];
  /** Requires special handling */
  requiresBidi: boolean;
  /** Maximum embedding level */
  maxLevel: number;
}

/**
 * Layout measurement for RTL positioning
 */
export interface LayoutMeasurement {
  /** Element width */
  width: number;
  /** Element height */
  height: number;
  /** Distance from left edge */
  left: number;
  /** Distance from right edge */
  right: number;
  /** Distance from top edge */
  top: number;
  /** Distance from bottom edge */
  bottom: number;
  /** Scroll position */
  scrollLeft: number;
  /** Scroll width */
  scrollWidth: number;
  /** Client width */
  clientWidth: number;
}

/**
 * RTL-aware positioning calculation
 */
export interface RTLPosition {
  /** Logical start position (left in LTR, right in RTL) */
  inlineStart: number;
  /** Logical end position (right in LTR, left in RTL) */
  inlineEnd: number;
  /** Block start position (top) */
  blockStart: number;
  /** Block end position (bottom) */
  blockEnd: number;
  /** Direction this position is calculated for */
  direction: TextDirection;
}

/**
 * Internationalization validation result
 */
export interface I18nValidationResult {
  /** Overall validation success */
  isValid: boolean;
  /** Validation score (0-100) */
  score: number;
  /** Validation warnings */
  warnings: I18nValidationWarning[];
  /** Validation errors */
  errors: I18nValidationError[];
  /** Tested locales */
  testedLocales: LocaleCode[];
  /** RTL compatibility score */
  rtlScore: number;
  /** Unicode support score */
  unicodeScore: number;
  /** Font compatibility score */
  fontScore: number;
}

/**
 * Internationalization validation warning
 */
export interface I18nValidationWarning {
  /** Warning type */
  type: 'missing-translation' | 'font-fallback' | 'layout-issue' | 'performance' | 'accessibility';
  /** Warning message */
  message: string;
  /** Affected locale */
  locale?: LocaleCode;
  /** Element or component affected */
  element?: HTMLElement;
  /** Severity level */
  severity: 'low' | 'medium' | 'high';
  /** Suggestion for fixing */
  suggestion?: string;
}

/**
 * Internationalization validation error
 */
export interface I18nValidationError {
  /** Error type */
  type: 'critical-missing-translation' | 'layout-broken' | 'font-missing' | 'unicode-error' | 'direction-mismatch';
  /** Error message */
  message: string;
  /** Affected locale */
  locale?: LocaleCode;
  /** Element that failed */
  element?: HTMLElement;
  /** Error details */
  details: string;
  /** How to fix this error */
  fix?: string;
}

/**
 * Export all types for consumption by other modules
 */
export type {
  TextDirection,
  LocaleCode,
  WritingSystem,
  FontWeight,
  TextAlign,
  PluralizationRule,
  InterpolationValue
};