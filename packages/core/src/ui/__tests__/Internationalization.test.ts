/**
 * Internationalization Tests
 * Comprehensive test suite for internationalization and RTL support
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { RTLManager } from '../RTLManager';
import { TextDirectionDetector } from '../TextDirectionDetector';
import { LocalizationManager } from '../LocalizationManager';
import { UnicodeHandler } from '../UnicodeHandler';
import { LocaleFormatter } from '../LocaleFormatter';
import { FontManager } from '../FontManager';
import type { 
  RTLConfig, 
  TextDirectionConfig, 
  LocalizationConfig,
  UnicodeConfig,
  LocaleFormattingConfig,
  FontConfig,
  LocaleCode,
  DirectionDetectionResult 
} from '../../types/Internationalization';

describe('Internationalization - Core Components', () => {
  // Test fixtures for international content
  const testTexts = {
    english: 'Hello, World! This is an English sentence.',
    arabic: 'مرحبا بالعالم! هذه جملة باللغة العربية.',
    hebrew: 'שלום עולם! זה משפט בעברית.',
    chinese: '你好世界！这是一个中文句子。',
    japanese: 'こんにちは世界！これは日本語の文章です。',
    korean: '안녕하세요, 세상! 이것은 한국어 문장입니다.',
    russian: 'Привет, мир! Это предложение на русском языке.',
    mixed: 'Hello مرحبا שלום 世界',
    rtlNumbers: 'يوجد ١٢٣ عنصر في القائمة',
    complexBidi: 'The word العربية means Arabic in שפה עברית language'
  };

  const testLocales: LocaleCode[] = [
    'en-US', 'ar-SA', 'he-IL', 'zh-CN', 'ja-JP', 'ko-KR', 'ru-RU',
    'fr-FR', 'de-DE', 'es-ES', 'it-IT', 'pt-BR'
  ];

  let mockDocument: Document;

  beforeEach(() => {
    // Mock DOM environment
    mockDocument = {
      documentElement: { lang: 'en-US' },
      body: document.createElement('div'),
      createElement: jest.fn(() => document.createElement('div')),
      createTreeWalker: jest.fn(),
      head: { appendChild: jest.fn() },
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(() => [])
    } as any;

    (global as any).document = mockDocument;
    (global as any).window = {
      navigator: { languages: ['en-US', 'en'] },
      getComputedStyle: jest.fn(() => ({ direction: 'ltr', display: 'block', visibility: 'visible' })),
      setInterval: jest.fn(),
      clearInterval: jest.fn(),
      FontFace: jest.fn()
    };

    // Mock Intl APIs
    (global as any).Intl = {
      DateTimeFormat: jest.fn(() => ({ format: (date: Date) => date.toLocaleDateString() })),
      NumberFormat: jest.fn(() => ({ format: (num: number) => num.toString() })),
      RelativeTimeFormat: jest.fn(() => ({ format: (value: number, unit: string) => `${value} ${unit} ago` })),
      ListFormat: jest.fn(() => ({ format: (items: string[]) => items.join(', ') }))
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('RTLManager', () => {
    let rtlManager: RTLManager;

    beforeEach(async () => {
      rtlManager = new RTLManager();
      await rtlManager.init();
    });

    afterEach(() => {
      rtlManager.destroy();
    });

    test('should detect RTL languages correctly', () => {
      expect(rtlManager.isRTLLocale('ar-SA')).toBe(true);
      expect(rtlManager.isRTLLocale('he-IL')).toBe(true);
      expect(rtlManager.isRTLLocale('fa-IR')).toBe(true);
      expect(rtlManager.isRTLLocale('ur-PK')).toBe(true);
      
      expect(rtlManager.isRTLLocale('en-US')).toBe(false);
      expect(rtlManager.isRTLLocale('zh-CN')).toBe(false);
      expect(rtlManager.isRTLLocale('ja-JP')).toBe(false);
    });

    test('should set document direction correctly', () => {
      rtlManager.setDirection('rtl');
      expect(rtlManager.isRTL()).toBe(true);
      
      rtlManager.setDirection('ltr');
      expect(rtlManager.isRTL()).toBe(false);
    });

    test('should calculate RTL-aware dropdown positions', () => {
      const mockTrigger = document.createElement('div');
      const mockDropdown = document.createElement('div');
      
      // Mock getBoundingClientRect
      mockTrigger.getBoundingClientRect = jest.fn(() => ({
        left: 100, top: 50, right: 200, bottom: 80, width: 100, height: 30
      } as DOMRect));

      rtlManager.setDirection('rtl');
      const position = rtlManager.getDropdownPosition(mockTrigger, mockDropdown, 'start');
      
      expect(position).toBeDefined();
      expect(position.direction).toBe('rtl');
    });

    test('should apply RTL layout to elements', () => {
      const element = document.createElement('div');
      rtlManager.setDirection('rtl');
      
      rtlManager.applyRTLLayout(element);
      
      expect(element.dir).toBe('rtl');
      expect(element.style.direction).toBe('rtl');
    });

    test('should handle RTL CSS logical properties', () => {
      const element = document.createElement('div');
      rtlManager.setDirection('rtl');
      
      const properties = rtlManager.getLogicalProperties({
        marginInlineStart: '10px',
        paddingBlockEnd: '5px'
      });
      
      expect(properties).toBeDefined();
      expect(typeof properties).toBe('object');
    });
  });

  describe('TextDirectionDetector', () => {
    let detector: TextDirectionDetector;

    beforeEach(async () => {
      detector = new TextDirectionDetector();
      await detector.init();
    });

    afterEach(() => {
      detector.destroy();
    });

    test('should detect LTR text correctly', () => {
      const result = detector.detectFromContent(testTexts.english);
      expect(result.direction).toBe('ltr');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.method).toBe('content');
    });

    test('should detect RTL text correctly', () => {
      const arabicResult = detector.detectFromContent(testTexts.arabic);
      expect(arabicResult.direction).toBe('rtl');
      expect(arabicResult.confidence).toBeGreaterThan(0.7);

      const hebrewResult = detector.detectFromContent(testTexts.hebrew);
      expect(hebrewResult.direction).toBe('rtl');
      expect(hebrewResult.confidence).toBeGreaterThan(0.7);
    });

    test('should detect direction from locale', () => {
      const arabicResult = detector.detectFromLocale('ar-SA');
      expect(arabicResult.direction).toBe('rtl');
      expect(arabicResult.confidence).toBe(0.9);
      expect(arabicResult.method).toBe('locale');

      const englishResult = detector.detectFromLocale('en-US');
      expect(englishResult.direction).toBe('ltr');
      expect(englishResult.confidence).toBe(0.9);
    });

    test('should handle mixed direction text', () => {
      const result = detector.detectFromContent(testTexts.mixed);
      expect(result.direction).toBeOneOf(['ltr', 'rtl']);
      expect(result.ltrChars).toBeGreaterThan(0);
      expect(result.rtlChars).toBeGreaterThan(0);
    });

    test('should cache detection results', () => {
      const text = testTexts.english;
      const result1 = detector.detectFromContent(text);
      const result2 = detector.detectFromContent(text);
      
      expect(result1).toEqual(result2);
      expect(detector.getCacheSize()).toBeGreaterThan(0);
    });

    test('should handle element direction detection', () => {
      const element = document.createElement('div');
      element.textContent = testTexts.arabic;
      element.setAttribute('lang', 'ar-SA');
      
      const result = detector.detectFromElement(element);
      expect(result.direction).toBe('rtl');
    });

    test('should support manual overrides', () => {
      const element = document.createElement('div');
      detector.setManualOverride(element, 'rtl');
      
      expect(detector.hasManualOverride(element)).toBe(true);
      expect(element.getAttribute('dir')).toBe('rtl');
      expect(element.getAttribute('data-direction-manual')).toBe('true');
    });
  });

  describe('LocalizationManager', () => {
    let localizationManager: LocalizationManager;

    beforeEach(async () => {
      localizationManager = new LocalizationManager('en-US');
      await localizationManager.init();
    });

    afterEach(() => {
      localizationManager.destroy();
    });

    test('should set and get locale', () => {
      expect(localizationManager.getCurrentLocale()).toBe('en-US');
      
      localizationManager.setLocale('ar-SA');
      expect(localizationManager.getCurrentLocale()).toBe('ar-SA');
    });

    test('should handle translations', () => {
      const translations = {
        'loading': 'Loading...',
        'search': 'Search',
        'noResults': 'No results found',
        'error': 'An error occurred'
      };

      localizationManager.addTranslations('en-US', translations);
      
      expect(localizationManager.getText('loading')).toBe('Loading...');
      expect(localizationManager.getText('search')).toBe('Search');
    });

    test('should support text interpolation', () => {
      const translations = {
        'welcome': 'Welcome, {{name}}!',
        'itemCount': 'Found {{count}} items'
      };

      localizationManager.addTranslations('en-US', translations);
      
      expect(localizationManager.getText('welcome', { variables: { name: 'John' } }))
        .toBe('Welcome, John!');
      expect(localizationManager.getText('itemCount', { variables: { count: 5 } }))
        .toBe('Found 5 items');
    });

    test('should support pluralization', () => {
      const translations = {
        'itemCount': {
          'one': '{{count}} item',
          'other': '{{count}} items'
        }
      };

      localizationManager.addTranslations('en-US', translations);
      
      expect(localizationManager.getText('itemCount', { count: 1 }))
        .toBe('1 item');
      expect(localizationManager.getText('itemCount', { count: 5 }))
        .toBe('5 items');
    });

    test('should fall back to fallback locale', () => {
      const fallbackTranslations = { 'test': 'Test' };
      localizationManager.addTranslations('en-US', fallbackTranslations);
      
      localizationManager.setLocale('fr-FR');
      expect(localizationManager.getText('test')).toBe('Test');
    });

    test('should return key when translation not found', () => {
      expect(localizationManager.getText('nonexistent')).toBe('nonexistent');
    });
  });

  describe('UnicodeHandler', () => {
    let unicodeHandler: UnicodeHandler;

    beforeEach(async () => {
      unicodeHandler = new UnicodeHandler();
      await unicodeHandler.init();
    });

    afterEach(() => {
      unicodeHandler.destroy();
    });

    test('should normalize Unicode text', () => {
      const text = 'café'; // e with combining acute accent
      const normalized = unicodeHandler.normalizeText(text, 'NFC');
      
      expect(normalized).toBeDefined();
      expect(typeof normalized).toBe('string');
    });

    test('should detect bidirectional text', () => {
      expect(unicodeHandler.hasBidirectionalText(testTexts.english)).toBe(false);
      expect(unicodeHandler.hasBidirectionalText(testTexts.arabic)).toBe(false); // Pure RTL
      expect(unicodeHandler.hasBidirectionalText(testTexts.mixed)).toBe(true);
      expect(unicodeHandler.hasBidirectionalText(testTexts.complexBidi)).toBe(true);
    });

    test('should process bidirectional text', () => {
      const result = unicodeHandler.processBidirectionalText(testTexts.complexBidi);
      
      expect(result.processedText).toBeDefined();
      expect(result.hasRTLText).toBe(true);
      expect(result.hasLTRText).toBe(true);
      expect(result.segments).toBeDefined();
    });

    test('should analyze Unicode text', () => {
      const analysis = unicodeHandler.analyzeText(testTexts.chinese);
      
      expect(analysis.scripts).toContain('Han');
      expect(analysis.charCount).toBeGreaterThan(0);
      expect(analysis.complexity).toBe('high'); // CJK characters are complex
    });

    test('should validate Unicode text', () => {
      expect(unicodeHandler.isValidUnicode(testTexts.english)).toBe(true);
      expect(unicodeHandler.isValidUnicode(testTexts.arabic)).toBe(true);
      expect(unicodeHandler.isValidUnicode(testTexts.chinese)).toBe(true);
    });

    test('should handle search query processing', () => {
      const query = 'Hello مرحبا';
      const processed = unicodeHandler.processSearchQuery(query);
      
      expect(processed.normalized).toBeDefined();
      expect(processed.sanitized).toBeDefined();
      expect(processed.direction).toBeOneOf(['ltr', 'rtl']);
    });

    test('should identify writing systems', () => {
      const arabicSystems = unicodeHandler.getWritingSystems(testTexts.arabic);
      expect(arabicSystems).toContain('arabic');
      
      const chineseSystems = unicodeHandler.getWritingSystems(testTexts.chinese);
      expect(chineseSystems).toContain('cjk');
    });
  });

  describe('LocaleFormatter', () => {
    let formatter: LocaleFormatter;

    beforeEach(async () => {
      formatter = new LocaleFormatter('en-US');
      await formatter.init();
    });

    afterEach(() => {
      formatter.destroy();
    });

    test('should format dates according to locale', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      
      formatter.setLocale('en-US');
      const usFormat = formatter.formatDate(date);
      expect(typeof usFormat).toBe('string');
      
      formatter.setLocale('de-DE');
      const deFormat = formatter.formatDate(date);
      expect(typeof deFormat).toBe('string');
    });

    test('should format numbers according to locale', () => {
      const number = 1234567.89;
      
      formatter.setLocale('en-US');
      const usFormat = formatter.formatNumber(number);
      expect(typeof usFormat).toBe('string');
      
      formatter.setLocale('de-DE');
      const deFormat = formatter.formatNumber(number);
      expect(typeof deFormat).toBe('string');
    });

    test('should format currency according to locale', () => {
      const amount = 1234.56;
      
      const usd = formatter.formatCurrency(amount, 'USD');
      expect(typeof usd).toBe('string');
      
      const eur = formatter.formatCurrency(amount, 'EUR');
      expect(typeof eur).toBe('string');
    });

    test('should format relative time', () => {
      const relativeTime = formatter.formatRelativeTime(-2, 'day');
      expect(typeof relativeTime).toBe('string');
    });

    test('should format time ago automatically', () => {
      const pastDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const timeAgo = formatter.formatTimeAgo(pastDate);
      expect(typeof timeAgo).toBe('string');
    });

    test('should format lists according to locale', () => {
      const items = ['Apple', 'Orange', 'Banana'];
      const formatted = formatter.formatList(items);
      expect(typeof formatted).toBe('string');
    });

    test('should format file sizes', () => {
      expect(formatter.formatFileSize(1024)).toContain('1');
      expect(formatter.formatFileSize(1048576)).toContain('1');
      expect(formatter.formatFileSize(0)).toBe('0 B');
    });

    test('should get currency information', () => {
      const usdInfo = formatter.getCurrencyInfo('USD');
      expect(usdInfo).toMatchObject({
        code: 'USD',
        symbol: '$',
        decimals: 2
      });
    });
  });

  describe('FontManager', () => {
    let fontManager: FontManager;

    beforeEach(async () => {
      fontManager = new FontManager();
      await fontManager.init();
    });

    afterEach(() => {
      fontManager.destroy();
    });

    test('should get font stacks for different writing systems', () => {
      const latinStack = fontManager.getFontStackForWritingSystem('latin');
      expect(latinStack).toContain('system-ui');
      
      const arabicStack = fontManager.getFontStackForWritingSystem('arabic');
      expect(arabicStack.some(font => font.includes('Arabic'))).toBe(true);
      
      const cjkStack = fontManager.getFontStackForWritingSystem('cjk');
      expect(cjkStack.some(font => font.includes('CJK'))).toBe(true);
    });

    test('should get font stacks for different locales', () => {
      const enStack = fontManager.getFontStackForLocale('en-US');
      expect(Array.isArray(enStack)).toBe(true);
      
      const arStack = fontManager.getFontStackForLocale('ar-SA');
      expect(Array.isArray(arStack)).toBe(true);
      
      const zhStack = fontManager.getFontStackForLocale('zh-CN');
      expect(Array.isArray(zhStack)).toBe(true);
    });

    test('should get font stacks for text content', () => {
      const englishStack = fontManager.getFontStackForText(testTexts.english);
      expect(Array.isArray(englishStack)).toBe(true);
      
      const arabicStack = fontManager.getFontStackForText(testTexts.arabic);
      expect(Array.isArray(arabicStack)).toBe(true);
      
      const mixedStack = fontManager.getFontStackForText(testTexts.mixed);
      expect(Array.isArray(mixedStack)).toBe(true);
    });

    test('should apply font stacks to elements', () => {
      const element = document.createElement('div');
      fontManager.applyFontStack(element, testTexts.chinese, 'cjk');
      
      expect(element.style.fontFamily).toBeDefined();
    });

    test('should get supported scripts for fonts', () => {
      const interScripts = fontManager.getSupportedScripts('Inter');
      expect(interScripts).toContain('latin');
      
      const arabicScripts = fontManager.getSupportedScripts('Noto Sans Arabic');
      expect(arabicScripts).toContain('arabic');
    });

    test('should generate font face CSS', () => {
      const css = fontManager.generateFontFaceCSS();
      expect(typeof css).toBe('string');
      expect(css.length).toBeGreaterThan(0);
    });

    test('should track font loading status', () => {
      expect(fontManager.isFontLoaded('system-ui')).toBe(false);
      expect(fontManager.isFontLoading('system-ui')).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    test('should work together for complete i18n workflow', async () => {
      // Initialize all components
      const rtlManager = new RTLManager();
      const detector = new TextDirectionDetector();
      const localization = new LocalizationManager('en-US');
      const unicode = new UnicodeHandler();
      const formatter = new LocaleFormatter('en-US');
      const fonts = new FontManager();

      await Promise.all([
        rtlManager.init(),
        detector.init(),
        localization.init(),
        unicode.init(),
        formatter.init(),
        fonts.init()
      ]);

      // Test Arabic locale workflow
      localization.setLocale('ar-SA');
      formatter.setLocale('ar-SA');
      rtlManager.setDirection('rtl');

      // Add Arabic translations
      localization.addTranslations('ar-SA', {
        'search': 'بحث',
        'loading': 'جاري التحميل...',
        'noResults': 'لم يتم العثور على نتائج'
      });

      // Test Arabic text processing
      const arabicText = 'مرحبا بالعالم';
      const processedText = unicode.processSearchQuery(arabicText);
      const direction = detector.detectFromContent(arabicText);
      const fontStack = fonts.getFontStackForText(arabicText);

      expect(localization.getText('search')).toBe('بحث');
      expect(direction.direction).toBe('rtl');
      expect(processedText.direction).toBe('rtl');
      expect(fontStack.some(font => font.includes('Arabic'))).toBe(true);

      // Cleanup
      [rtlManager, detector, localization, unicode, formatter, fonts]
        .forEach(manager => manager.destroy());
    });

    test('should handle locale switching seamlessly', async () => {
      const localization = new LocalizationManager('en-US');
      const formatter = new LocaleFormatter('en-US');
      
      await Promise.all([
        localization.init(),
        formatter.init()
      ]);

      // Add translations for multiple locales
      localization.addTranslations('en-US', { 'greeting': 'Hello' });
      localization.addTranslations('fr-FR', { 'greeting': 'Bonjour' });
      localization.addTranslations('ja-JP', { 'greeting': 'こんにちは' });

      // Test switching between locales
      expect(localization.getText('greeting')).toBe('Hello');

      localization.setLocale('fr-FR');
      formatter.setLocale('fr-FR');
      expect(localization.getText('greeting')).toBe('Bonjour');

      localization.setLocale('ja-JP');
      formatter.setLocale('ja-JP');
      expect(localization.getText('greeting')).toBe('こんにちは');

      // Cleanup
      localization.destroy();
      formatter.destroy();
    });

    test('should handle complex bidirectional text scenarios', async () => {
      const detector = new TextDirectionDetector();
      const unicode = new UnicodeHandler();
      
      await Promise.all([
        detector.init(),
        unicode.init()
      ]);

      const complexTexts = [
        'Visit our website at https://example.com للمزيد من المعلومات',
        'Email: user@domain.com או התקשרו למספר 123-456-7890',
        'Price: $99.99 سعر المنتج ومواصفاته التقنية'
      ];

      for (const text of complexTexts) {
        const direction = detector.detectFromContent(text);
        const processed = unicode.processBidirectionalText(text);
        
        expect(direction).toBeDefined();
        expect(processed.hasRTLText).toBe(true);
        expect(processed.hasLTRText).toBe(true);
        expect(processed.processedText).toBeDefined();
      }

      // Cleanup
      detector.destroy();
      unicode.destroy();
    });
  });

  describe('Performance Tests', () => {
    test('should handle large text processing efficiently', async () => {
      const unicode = new UnicodeHandler();
      await unicode.init();

      const largeText = testTexts.mixed.repeat(1000);
      const startTime = performance.now();
      
      const result = unicode.processBidirectionalText(largeText);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100); // Should process in under 100ms
      expect(result.processedText).toBeDefined();
      
      unicode.destroy();
    });

    test('should cache detection results for performance', async () => {
      const detector = new TextDirectionDetector();
      await detector.init();

      const text = testTexts.arabic;
      
      // First detection (cache miss)
      const start1 = performance.now();
      const result1 = detector.detectFromContent(text);
      const time1 = performance.now() - start1;
      
      // Second detection (cache hit)
      const start2 = performance.now();
      const result2 = detector.detectFromContent(text);
      const time2 = performance.now() - start2;
      
      expect(result1).toEqual(result2);
      expect(time2).toBeLessThan(time1); // Cached should be faster
      expect(detector.getCacheSize()).toBeGreaterThan(0);
      
      detector.destroy();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid locale codes gracefully', async () => {
      const localization = new LocalizationManager('en-US');
      await localization.init();

      expect(() => localization.setLocale('invalid-locale' as LocaleCode)).not.toThrow();
      expect(localization.getCurrentLocale()).toBe('en-US'); // Should fallback
      
      localization.destroy();
    });

    test('should handle malformed Unicode text', async () => {
      const unicode = new UnicodeHandler();
      await unicode.init();

      const malformedText = '\uD800'; // Lone surrogate
      
      expect(() => unicode.normalizeText(malformedText)).not.toThrow();
      expect(unicode.isValidUnicode(malformedText)).toBe(false);
      
      unicode.destroy();
    });

    test('should handle missing translations gracefully', async () => {
      const localization = new LocalizationManager('en-US');
      await localization.init();

      const missingKey = localization.getText('nonexistent.key');
      expect(missingKey).toBe('nonexistent.key');
      
      localization.destroy();
    });
  });
});

// Helper function for test assertions
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(items: any[]): R;
    }
  }
}

expect.extend({
  toBeOneOf(received: any, items: any[]) {
    const pass = items.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${items.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${items.join(', ')}`,
        pass: false,
      };
    }
  },
});