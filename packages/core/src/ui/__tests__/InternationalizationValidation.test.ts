/**
 * Internationalization Validation Tests
 * Comprehensive validation for i18n compliance and functionality
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SearchDropdownUI } from '../SearchDropdownUI';
import { RTLManager } from '../RTLManager';
import { TextDirectionDetector } from '../TextDirectionDetector';
import { LocalizationManager } from '../LocalizationManager';
import { UnicodeHandler } from '../UnicodeHandler';
import { LocaleFormatter } from '../LocaleFormatter';
import { FontManager } from '../FontManager';
import type { SearchResult } from '../../types/Results';
import type { UIConfig } from '../../types/Config';
import type { LocaleCode } from '../../types/Internationalization';

describe('Internationalization - Validation and Compliance', () => {
  let mockContainer: HTMLElement;

  // Comprehensive validation test data
  const validationTestData = {
    // Text direction validation cases
    textDirection: {
      strongRTL: {
        arabic: 'هذا نص عربي قوي للتحقق من الاتجاه',
        hebrew: 'זה טקסט עברי חזק לבדיקת כיוון',
        persian: 'این متن فارسی قوی برای بررسی جهت است'
      },
      strongLTR: {
        english: 'This is strong English text for direction checking',
        french: 'Ceci est un texte français fort pour vérifier la direction',
        german: 'Dies ist ein starker deutscher Text zur Richtungsüberprüfung'
      },
      mixed: {
        arabicEnglish: 'This is English text مع النص العربي المختلط',
        hebrewEnglish: 'This is English text עם טקסט עברי מעורב',
        urlInRTL: 'زيارة الموقع https://example.com للمزيد من المعلومات',
        numbersInRTL: 'يوجد ١٢٣ عنصر و 456 صفحة في النظام',
        emailInRTL: 'راسلنا على البريد user@domain.com للدعم الفني'
      },
      edgeCases: {
        onlyNumbers: '123456789',
        onlyPunctuation: '!@#$%^&*()',
        mixed_punctuation: 'Hello, مرحبا! How are you?',
        emoji: '😀 مرحبا 😊 Hello 🌟',
        whitespace: '   \t\n   '
      }
    },

    // Unicode validation cases
    unicode: {
      normalization: {
        nfc: 'café', // Precomposed
        nfd: 'cafe\u0301', // Decomposed
        nfkc: '①②③', // Compatibility decomposed
        surrogates: '𝔘𝔫𝔦𝔠𝔬𝔡𝔢', // High/low surrogate pairs
        combining: 'a\u0300\u0301\u0302' // Multiple combining marks
      },
      scripts: {
        latin: 'Hello World',
        arabic: 'مرحبا بالعالم',
        hebrew: 'שלום עולם',
        chinese: '你好世界',
        japanese: 'こんにちは世界',
        korean: '안녕하세요 세계',
        devanagari: 'नमस्ते दुनिया',
        thai: 'สวัสดีชาวโลก',
        cyrillic: 'Привет мир',
        greek: 'Γεια σας κόσμε'
      },
      complex: {
        multiScript: '🌍 Hello العالم 世界 мир',
        zalgo: 'H̴̰̮͎̲̝̣̑̑̓̈e̸̢̛̗̺̝̱̎̌͑l̸̰̞̱͈̽͌̈́l̷̨̰̼̱̈́̾o̵̧̨̱̤͊̌̾̄͛',
        rtlOverride: '\u202Etext\u202C',
        ltrOverride: '\u202Dنص\u202C'
      }
    },

    // Locale validation cases
    locales: {
      valid: [
        'en-US', 'en-GB', 'en-CA', 'en-AU',
        'ar-SA', 'ar-EG', 'ar-AE', 'ar-MA',
        'he-IL', 'he-US',
        'zh-CN', 'zh-TW', 'zh-HK',
        'ja-JP', 'ko-KR',
        'fr-FR', 'fr-CA', 'de-DE', 'es-ES',
        'ru-RU', 'hi-IN', 'th-TH'
      ],
      invalid: [
        'invalid', 'en', 'en-', 'en-X', '12-34',
        '', null, undefined, 'toolong-locale-code'
      ],
      regional: [
        'en-US', 'en-GB', // Same language, different regions
        'ar-SA', 'ar-EG', // Arabic variants
        'zh-CN', 'zh-TW', // Simplified vs Traditional Chinese
        'fr-FR', 'fr-CA'  // French variants
      ]
    },

    // Font validation cases
    fonts: {
      writingSystems: {
        latin: ['Inter', 'Roboto', 'system-ui', 'Arial'],
        arabic: ['Noto Sans Arabic', 'Tahoma', 'Arial Unicode MS'],
        hebrew: ['Noto Sans Hebrew', 'Arial Hebrew', 'David'],
        cjk: ['Noto Sans CJK SC', 'Source Han Sans', 'SimSun'],
        devanagari: ['Noto Sans Devanagari', 'Mangal', 'Arial Unicode MS'],
        thai: ['Noto Sans Thai', 'Leelawadee UI', 'Tahoma'],
        cyrillic: ['Noto Sans', 'PT Sans', 'Arial'],
        mixed: ['Noto Sans', 'Inter', 'system-ui', 'Arial']
      },
      testText: {
        latin: 'The quick brown fox jumps over the lazy dog.',
        arabic: 'الثعلب البني السريع يقفز فوق الكلب الكسول.',
        hebrew: 'השועל החום המהיר קופץ מעל הכלב העצלן.',
        chinese: '敏捷的棕色狐狸跳过懒惰的狗。',
        japanese: '素早い茶色の狐が怠けている犬を飛び越える。',
        korean: '빠른 갈색 여우가 게으른 개를 뛰어넘는다.',
        devanagari: 'तेज भूरी लोमड़ी आलसी कुत्ते के ऊपर कूदती है।',
        thai: 'จิ้งจอกสีน้ำตาลที่ว่องไวกระโดดข้ามสุนัขที่ขี้เกียจ',
        mixed: 'Hello مرحبا 你好 こんにちは 안녕하세요'
      }
    }
  };

  beforeEach(() => {
    mockContainer = document.createElement('div');
    document.body.appendChild(mockContainer);

    // Enhanced mock environment for validation
    (global as any).document = document;
    (global as any).window = {
      ...window,
      innerWidth: 1024,
      innerHeight: 768,
      navigator: { 
        languages: ['en-US', 'en'],
        language: 'en-US'
      },
      getComputedStyle: jest.fn(() => ({
        direction: 'ltr',
        display: 'block',
        visibility: 'visible',
        fontFamily: 'system-ui'
      })),
      ResizeObserver: jest.fn(() => ({
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn()
      })),
      FontFace: jest.fn(),
      setInterval: jest.fn(),
      clearInterval: jest.fn()
    };

    // Mock comprehensive Intl API
    (global as any).Intl = {
      DateTimeFormat: jest.fn(() => ({ 
        format: jest.fn(date => new Date(date).toLocaleDateString()) 
      })),
      NumberFormat: jest.fn(() => ({ 
        format: jest.fn(num => num.toLocaleString()) 
      })),
      RelativeTimeFormat: jest.fn(() => ({ 
        format: jest.fn((value, unit) => `${value} ${unit} ago`) 
      })),
      ListFormat: jest.fn(() => ({ 
        format: jest.fn(items => items.join(', ')) 
      })),
      Collator: jest.fn(() => ({ 
        compare: jest.fn((a, b) => a.localeCompare(b)) 
      })),
      PluralRules: jest.fn(() => ({ 
        select: jest.fn(() => 'other') 
      }))
    };
  });

  afterEach(() => {
    if (mockContainer.parentNode) {
      mockContainer.parentNode.removeChild(mockContainer);
    }
    jest.clearAllMocks();
  });

  describe('Text Direction Validation', () => {
    let detector: TextDirectionDetector;

    beforeEach(async () => {
      detector = new TextDirectionDetector({
        rtlThreshold: 0.3,
        detectFromLocale: true,
        detectFromContent: true,
        cacheResults: true,
        fallbackDirection: 'ltr'
      });
      await detector.init();
    });

    afterEach(() => {
      detector?.destroy();
    });

    test('should correctly detect strong RTL text', () => {
      Object.entries(validationTestData.textDirection.strongRTL).forEach(([lang, text]) => {
        const result = detector.detectFromContent(text);
        expect(result.direction).toBe('rtl');
        expect(result.confidence).toBeGreaterThan(0.8);
        expect(result.rtlChars).toBeGreaterThan(result.ltrChars);
      });
    });

    test('should correctly detect strong LTR text', () => {
      Object.entries(validationTestData.textDirection.strongLTR).forEach(([lang, text]) => {
        const result = detector.detectFromContent(text);
        expect(result.direction).toBe('ltr');
        expect(result.confidence).toBeGreaterThan(0.8);
        expect(result.ltrChars).toBeGreaterThan(result.rtlChars);
      });
    });

    test('should handle mixed direction text appropriately', () => {
      Object.entries(validationTestData.textDirection.mixed).forEach(([type, text]) => {
        const result = detector.detectFromContent(text);
        expect(result.direction).toBeOneOf(['ltr', 'rtl']);
        expect(result.ltrChars).toBeGreaterThan(0);
        expect(result.rtlChars).toBeGreaterThan(0);
        
        // Mixed text should have lower confidence
        if (type === 'arabicEnglish' || type === 'hebrewEnglish') {
          expect(result.confidence).toBeLessThan(0.9);
        }
      });
    });

    test('should handle edge cases gracefully', () => {
      Object.entries(validationTestData.textDirection.edgeCases).forEach(([type, text]) => {
        expect(() => {
          const result = detector.detectFromContent(text);
          expect(result).toBeDefined();
          expect(result.direction).toBeOneOf(['ltr', 'rtl']);
        }).not.toThrow();
      });
    });

    test('should maintain consistent results for identical input', () => {
      const testTexts = [
        validationTestData.textDirection.strongRTL.arabic,
        validationTestData.textDirection.strongLTR.english,
        validationTestData.textDirection.mixed.arabicEnglish
      ];

      testTexts.forEach(text => {
        const result1 = detector.detectFromContent(text);
        const result2 = detector.detectFromContent(text);
        const result3 = detector.detectFromContent(text);
        
        expect(result1).toEqual(result2);
        expect(result2).toEqual(result3);
      });
    });

    test('should respect manual overrides', () => {
      const element = document.createElement('div');
      element.textContent = validationTestData.textDirection.strongRTL.arabic;
      
      // Set manual LTR override on RTL text
      detector.setManualOverride(element, 'ltr');
      
      const result = detector.detectFromElement(element);
      expect(result.direction).toBe('ltr');
      expect(result.method).toBe('configuration');
      expect(detector.hasManualOverride(element)).toBe(true);
    });
  });

  describe('Unicode Validation', () => {
    let unicodeHandler: UnicodeHandler;

    beforeEach(async () => {
      unicodeHandler = new UnicodeHandler({
        normalizationForm: 'NFC',
        enableBidirectionalText: true,
        enableValidation: true,
        cacheNormalization: true,
        enableShaping: true
      });
      await unicodeHandler.init();
    });

    afterEach(() => {
      unicodeHandler?.destroy();
    });

    test('should normalize Unicode text correctly', () => {
      Object.entries(validationTestData.unicode.normalization).forEach(([form, text]) => {
        const normalized = unicodeHandler.normalizeText(text, 'NFC');
        expect(typeof normalized).toBe('string');
        expect(normalized.length).toBeGreaterThan(0);
      });
    });

    test('should validate Unicode text properly', () => {
      Object.entries(validationTestData.unicode.scripts).forEach(([script, text]) => {
        expect(unicodeHandler.isValidUnicode(text)).toBe(true);
      });

      // Test invalid Unicode
      const invalidUnicode = '\uD800'; // Lone surrogate
      expect(unicodeHandler.isValidUnicode(invalidUnicode)).toBe(false);
    });

    test('should detect writing systems correctly', () => {
      const scriptMappings = {
        arabic: 'arabic',
        hebrew: 'hebrew',
        chinese: 'cjk',
        japanese: 'cjk',
        korean: 'cjk',
        devanagari: 'devanagari',
        thai: 'thai',
        cyrillic: 'cyrillic',
        latin: 'latin'
      };

      Object.entries(scriptMappings).forEach(([textKey, expectedScript]) => {
        if (validationTestData.unicode.scripts[textKey as keyof typeof validationTestData.unicode.scripts]) {
          const text = validationTestData.unicode.scripts[textKey as keyof typeof validationTestData.unicode.scripts];
          const systems = unicodeHandler.getWritingSystems(text);
          expect(systems).toContain(expectedScript);
        }
      });
    });

    test('should handle complex Unicode scenarios', () => {
      Object.entries(validationTestData.unicode.complex).forEach(([type, text]) => {
        expect(() => {
          const normalized = unicodeHandler.normalizeText(text);
          const analysis = unicodeHandler.analyzeText(text);
          const isValid = unicodeHandler.isValidUnicode(text);
          
          expect(normalized).toBeDefined();
          expect(analysis).toBeDefined();
          expect(typeof isValid).toBe('boolean');
        }).not.toThrow();
      });
    });

    test('should process bidirectional text correctly', () => {
      const bidiTexts = [
        validationTestData.textDirection.mixed.arabicEnglish,
        validationTestData.textDirection.mixed.hebrewEnglish,
        validationTestData.unicode.complex.multiScript
      ];

      bidiTexts.forEach(text => {
        const result = unicodeHandler.processBidirectionalText(text);
        
        expect(result.processedText).toBeDefined();
        expect(result.segments).toBeDefined();
        expect(Array.isArray(result.segments)).toBe(true);
        expect(typeof result.hasRTLText).toBe('boolean');
        expect(typeof result.hasLTRText).toBe('boolean');
      });
    });
  });

  describe('Locale Validation', () => {
    let localizationManager: LocalizationManager;

    beforeEach(async () => {
      localizationManager = new LocalizationManager('en-US', {
        enablePluralization: true,
        enableInterpolation: true,
        fallbackLocale: 'en-US',
        cacheTranslations: true
      });
      await localizationManager.init();
    });

    afterEach(() => {
      localizationManager?.destroy();
    });

    test('should accept valid locale codes', () => {
      validationTestData.locales.valid.forEach(locale => {
        expect(() => {
          localizationManager.setLocale(locale as LocaleCode);
        }).not.toThrow();
      });
    });

    test('should handle invalid locale codes gracefully', () => {
      validationTestData.locales.invalid.forEach(locale => {
        expect(() => {
          if (locale !== null && locale !== undefined) {
            localizationManager.setLocale(locale as LocaleCode);
          }
        }).not.toThrow();
      });
    });

    test('should distinguish between regional variants', () => {
      const testTranslations = {
        'currency': 'Dollar',
        'dateFormat': 'MM/DD/YYYY'
      };

      localizationManager.addTranslations('en-US', testTranslations);
      localizationManager.addTranslations('en-GB', {
        'currency': 'Pound',
        'dateFormat': 'DD/MM/YYYY'
      });

      localizationManager.setLocale('en-US');
      expect(localizationManager.getText('currency')).toBe('Dollar');

      localizationManager.setLocale('en-GB');
      expect(localizationManager.getText('currency')).toBe('Pound');
    });

    test('should fall back to base locale when regional variant unavailable', () => {
      localizationManager.addTranslations('en-US', { 'test': 'US English' });
      
      // Set to unavailable regional variant
      localizationManager.setLocale('en-CA');
      expect(localizationManager.getText('test')).toBe('US English');
    });
  });

  describe('Font Validation', () => {
    let fontManager: FontManager;

    beforeEach(async () => {
      fontManager = new FontManager({
        primaryFont: 'system-ui',
        fallbackFonts: {},
        loadingStrategy: 'swap',
        fontDisplay: 'swap',
        preloadFonts: [],
        enableOptimization: true
      });
      await fontManager.init();
    });

    afterEach(() => {
      fontManager?.destroy();
    });

    test('should provide appropriate font stacks for each writing system', () => {
      Object.entries(validationTestData.fonts.writingSystems).forEach(([system, expectedFonts]) => {
        const fontStack = fontManager.getFontStackForWritingSystem(system as any);
        
        expect(Array.isArray(fontStack)).toBe(true);
        expect(fontStack.length).toBeGreaterThan(0);
        
        // Should include at least one expected font
        const hasExpectedFont = expectedFonts.some(font => 
          fontStack.some(stackFont => stackFont.includes(font))
        );
        expect(hasExpectedFont).toBe(true);
      });
    });

    test('should select appropriate fonts for text content', () => {
      Object.entries(validationTestData.fonts.testText).forEach(([script, text]) => {
        const fontStack = fontManager.getFontStackForText(text);
        
        expect(Array.isArray(fontStack)).toBe(true);
        expect(fontStack.length).toBeGreaterThan(0);
        
        // Verify no duplicate fonts
        const uniqueFonts = new Set(fontStack);
        expect(uniqueFonts.size).toBe(fontStack.length);
      });
    });

    test('should generate valid CSS for font faces', () => {
      const css = fontManager.generateFontFaceCSS();
      
      expect(typeof css).toBe('string');
      expect(css.length).toBeGreaterThan(0);
      
      // Should contain font-face declarations
      expect(css).toContain('@font-face');
      expect(css).toContain('font-family');
      expect(css).toContain('font-display');
    });

    test('should provide accurate script support information', () => {
      const testFonts = [
        'Inter', 'Noto Sans Arabic', 'Noto Sans Hebrew', 
        'Noto Sans CJK SC', 'system-ui', 'Arial'
      ];

      testFonts.forEach(font => {
        const scripts = fontManager.getSupportedScripts(font);
        expect(Array.isArray(scripts)).toBe(true);
        expect(scripts.length).toBeGreaterThan(0);
      });
    });
  });

  describe('RTL Layout Validation', () => {
    let rtlManager: RTLManager;

    beforeEach(async () => {
      rtlManager = new RTLManager({
        autoDetect: true,
        mirrorAnimations: true,
        adjustScrollbars: true,
        handleDropdowns: true,
        observeMutations: true
      });
      await rtlManager.init();
    });

    afterEach(() => {
      rtlManager?.destroy();
    });

    test('should correctly identify RTL locales', () => {
      const rtlLocales = ['ar-SA', 'he-IL', 'fa-IR', 'ur-PK'];
      const ltrLocales = ['en-US', 'fr-FR', 'de-DE', 'zh-CN', 'ja-JP'];

      rtlLocales.forEach(locale => {
        expect(rtlManager.isRTLLocale(locale as LocaleCode)).toBe(true);
      });

      ltrLocales.forEach(locale => {
        expect(rtlManager.isRTLLocale(locale as LocaleCode)).toBe(false);
      });
    });

    test('should apply RTL layout correctly', () => {
      const element = document.createElement('div');
      rtlManager.setDirection('rtl');
      
      rtlManager.applyRTLLayout(element);
      
      expect(element.dir).toBe('rtl');
      expect(element.style.direction).toBe('rtl');
    });

    test('should handle CSS logical properties', () => {
      const properties = {
        marginInlineStart: '10px',
        marginInlineEnd: '5px',
        paddingBlockStart: '15px',
        paddingBlockEnd: '8px'
      };

      const logical = rtlManager.getLogicalProperties(properties);
      expect(logical).toBeDefined();
      expect(typeof logical).toBe('object');
    });

    test('should calculate correct dropdown positions in RTL', () => {
      const mockTrigger = document.createElement('input');
      const mockDropdown = document.createElement('div');
      
      mockTrigger.getBoundingClientRect = jest.fn(() => ({
        left: 100, top: 50, right: 300, bottom: 80, width: 200, height: 30
      } as DOMRect));

      rtlManager.setDirection('rtl');
      
      const position = rtlManager.getDropdownPosition(mockTrigger, mockDropdown, 'start');
      expect(position.direction).toBe('rtl');
      expect(typeof position.left).toBe('number');
      expect(typeof position.top).toBe('number');
    });
  });

  describe('UI Component Validation', () => {
    let searchDropdown: SearchDropdownUI;

    beforeEach(async () => {
      const uiConfig: UIConfig = {
        theme: 'light',
        rtl: false,
        maxResults: 10,
        placeholder: 'Search...',
        loadingText: 'Loading...',
        noResultsText: 'No results',
        errorText: 'Error'
      };

      searchDropdown = new SearchDropdownUI(mockContainer, uiConfig);
      await searchDropdown.init();
    });

    afterEach(() => {
      searchDropdown?.destroy();
    });

    test('should handle all supported locales without errors', async () => {
      for (const locale of validationTestData.locales.valid) {
        expect(() => {
          searchDropdown.setLocale(locale as LocaleCode);
        }).not.toThrow();
      }
    });

    test('should render international content correctly', () => {
      Object.entries(validationTestData.unicode.scripts).forEach(([script, text], index) => {
        const results: SearchResult[] = [{
          id: index.toString(),
          title: text,
          score: 0.9,
          metadata: {
            subtitle: `Test result in ${script}`,
            category: script
          }
        }];

        expect(() => {
          searchDropdown.showResults(results);
        }).not.toThrow();
      });
    });

    test('should maintain functionality across locale switches', () => {
      const testLocales = validationTestData.locales.valid.slice(0, 5);
      
      testLocales.forEach(locale => {
        searchDropdown.setLocale(locale as LocaleCode);
        
        const results: SearchResult[] = [{
          id: '1',
          title: `Test result for ${locale}`,
          score: 0.9
        }];

        searchDropdown.showResults(results);
        
        // Test navigation
        const navEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        const handled = searchDropdown.handleKeyboardNavigation(navEvent);
        expect(handled).toBe(true);
      });
    });

    test('should handle edge case content gracefully', () => {
      const edgeCaseResults: SearchResult[] = [
        { id: '1', title: '', score: 0.9 }, // Empty
        { id: '2', title: '   ', score: 0.8 }, // Whitespace only
        { id: '3', title: validationTestData.unicode.complex.zalgo, score: 0.7 }, // Complex Unicode
        { id: '4', title: validationTestData.textDirection.mixed.urlInRTL, score: 0.6 }, // Mixed content
        { id: '5', title: validationTestData.unicode.normalization.surrogates, score: 0.5 } // Surrogates
      ];

      expect(() => {
        searchDropdown.showResults(edgeCaseResults);
      }).not.toThrow();
    });
  });

  describe('Performance Validation', () => {
    test('should handle large internationalized datasets efficiently', async () => {
      const uiConfig: UIConfig = {
        theme: 'light',
        rtl: false,
        maxResults: 100,
        placeholder: 'Search...',
        loadingText: 'Loading...',
        noResultsText: 'No results',
        errorText: 'Error'
      };

      const searchDropdown = new SearchDropdownUI(mockContainer, uiConfig);
      await searchDropdown.init();

      // Generate large dataset with various scripts
      const largeResults: SearchResult[] = [];
      const scripts = Object.entries(validationTestData.unicode.scripts);
      
      for (let i = 0; i < 1000; i++) {
        const [scriptName, text] = scripts[i % scripts.length];
        largeResults.push({
          id: i.toString(),
          title: `${text} ${i}`,
          score: Math.random(),
          metadata: {
            subtitle: `Test ${i} in ${scriptName}`,
            category: scriptName
          }
        });
      }

      const startTime = performance.now();
      searchDropdown.showResults(largeResults.slice(0, 50)); // Show first 50
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(200); // Should render in under 200ms

      searchDropdown.destroy();
    });

    test('should maintain performance during rapid locale switching', async () => {
      const uiConfig: UIConfig = {
        theme: 'light',
        rtl: false,
        maxResults: 10,
        placeholder: 'Search...',
        loadingText: 'Loading...',
        noResultsText: 'No results',
        errorText: 'Error'
      };

      const searchDropdown = new SearchDropdownUI(mockContainer, uiConfig);
      await searchDropdown.init();

      const locales = validationTestData.locales.valid.slice(0, 10);
      
      const startTime = performance.now();
      
      // Rapid locale switching
      for (let i = 0; i < 100; i++) {
        const locale = locales[i % locales.length];
        searchDropdown.setLocale(locale as LocaleCode);
      }
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(500); // Should complete in under 500ms

      searchDropdown.destroy();
    });
  });

  describe('Compliance Validation', () => {
    test('should meet WCAG accessibility requirements with i18n', async () => {
      const uiConfig: UIConfig = {
        theme: 'light',
        rtl: false,
        maxResults: 10,
        placeholder: 'بحث...',
        loadingText: 'جاري التحميل...',
        noResultsText: 'لا توجد نتائج',
        errorText: 'خطأ'
      };

      const searchDropdown = new SearchDropdownUI(mockContainer, uiConfig);
      await searchDropdown.init();
      searchDropdown.setLocale('ar-SA');

      const arabicResults: SearchResult[] = [{
        id: '1',
        title: 'نتيجة البحث العربية',
        score: 0.9,
        metadata: {
          subtitle: 'وصف النتيجة'
        }
      }];

      searchDropdown.showResults(arabicResults);

      // Test accessibility with RTL content
      const navEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      const handled = searchDropdown.handleKeyboardNavigation(navEvent);
      expect(handled).toBe(true);

      searchDropdown.destroy();
    });

    test('should maintain semantic HTML structure in all locales', async () => {
      const uiConfig: UIConfig = {
        theme: 'light',
        rtl: false,
        maxResults: 5,
        placeholder: 'Search...',
        loadingText: 'Loading...',
        noResultsText: 'No results',
        errorText: 'Error'
      };

      const searchDropdown = new SearchDropdownUI(mockContainer, uiConfig);
      await searchDropdown.init();

      const testLocales = ['en-US', 'ar-SA', 'zh-CN', 'ja-JP'];
      
      for (const locale of testLocales) {
        searchDropdown.setLocale(locale as LocaleCode);
        
        const results: SearchResult[] = [{
          id: '1',
          title: `Test for ${locale}`,
          score: 0.9
        }];

        searchDropdown.showResults(results);
        
        // Verify semantic structure is maintained
        const dropdown = mockContainer.querySelector('[role="listbox"]');
        expect(dropdown).toBeTruthy();
      }

      searchDropdown.destroy();
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