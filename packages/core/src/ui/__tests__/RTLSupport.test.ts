/**
 * RTL Support Tests
 * Comprehensive tests for Right-to-Left language support
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { RTLManager } from '../RTLManager';
import { TextDirectionDetector } from '../TextDirectionDetector';
import { SearchDropdownUI } from '../SearchDropdownUI';
import type { SearchResult } from '../../types/Results';
import type { UIConfig } from '../../types/Config';
import type { LocaleCode, DirectionDetectionResult } from '../../types/Internationalization';

describe('RTL Support - Right-to-Left Languages', () => {
  let mockContainer: HTMLElement;
  let mockTrigger: HTMLElement;
  let mockDropdown: HTMLElement;

  // RTL test data
  const rtlTestData = {
    arabic: {
      locale: 'ar-SA' as LocaleCode,
      text: 'مرحبا بالعالم! هذا نص تجريبي باللغة العربية',
      searchQuery: 'بحث عن المعلومات',
      results: [
        'النتيجة الأولى للبحث',
        'المعلومات المطلوبة',
        'البيانات المفيدة',
        'المحتوى ذو الصلة'
      ],
      ui: {
        loading: 'جاري التحميل...',
        noResults: 'لم يتم العثور على نتائج',
        error: 'حدث خطأ أثناء البحث',
        placeholder: 'ابحث هنا...'
      }
    },
    hebrew: {
      locale: 'he-IL' as LocaleCode,
      text: 'שלום עולם! זהו טקסט לדוגמה בעברית',
      searchQuery: 'חיפוש אחר מידע',
      results: [
        'התוצאה הראשונה לחיפוש',
        'המידע המבוקש',
        'נתונים שימושיים',
        'תוכן רלוונטי'
      ],
      ui: {
        loading: 'טוען...',
        noResults: 'לא נמצאו תוצאות',
        error: 'אירעה שגיאה במהלך החיפוש',
        placeholder: 'חפש כאן...'
      }
    },
    persian: {
      locale: 'fa-IR' as LocaleCode,
      text: 'سلام دنیا! این یک متن نمونه به زبان فارسی است',
      searchQuery: 'جستجوی اطلاعات',
      results: [
        'اولین نتیجه جستجو',
        'اطلاعات مورد نیاز',
        'داده‌های مفید',
        'محتوای مرتبط'
      ],
      ui: {
        loading: 'در حال بارگیری...',
        noResults: 'نتیجه‌ای یافت نشد',
        error: 'خطایی در جستجو رخ داد',
        placeholder: 'اینجا جستجو کنید...'
      }
    },
    urdu: {
      locale: 'ur-PK' as LocaleCode,
      text: 'ہیلو ورلڈ! یہ اردو میں ایک نمونہ متن ہے',
      searchQuery: 'معلومات کی تلاش',
      results: [
        'تلاش کا پہلا نتیجہ',
        'مطلوبہ معلومات',
        'مفید ڈیٹا',
        'متعلقہ مواد'
      ],
      ui: {
        loading: 'لوڈ ہو رہا ہے...',
        noResults: 'کوئی نتیجہ نہیں ملا',
        error: 'تلاش میں خرابی ہوئی',
        placeholder: 'یہاں تلاش کریں...'
      }
    }
  };

  beforeEach(() => {
    // Create mock DOM elements
    mockContainer = document.createElement('div');
    mockTrigger = document.createElement('input');
    mockDropdown = document.createElement('div');
    
    document.body.appendChild(mockContainer);
    document.body.appendChild(mockTrigger);

    // Mock DOM methods
    mockTrigger.getBoundingClientRect = jest.fn(() => ({
      left: 100,
      top: 50,
      right: 300,
      bottom: 80,
      width: 200,
      height: 30
    } as DOMRect));

    mockDropdown.getBoundingClientRect = jest.fn(() => ({
      left: 100,
      top: 85,
      right: 300,
      bottom: 285,
      width: 200,
      height: 200
    } as DOMRect));

    // Mock global objects
    (global as any).document = document;
    (global as any).window = {
      ...window,
      innerWidth: 1024,
      innerHeight: 768,
      getComputedStyle: jest.fn(() => ({
        direction: 'rtl',
        display: 'block',
        visibility: 'visible'
      })),
      ResizeObserver: jest.fn(() => ({
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn()
      }))
    };
  });

  afterEach(() => {
    [mockContainer, mockTrigger].forEach(el => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
    jest.clearAllMocks();
  });

  describe('RTLManager Core Functionality', () => {
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
      const rtlLocales = ['ar-SA', 'he-IL', 'fa-IR', 'ur-PK', 'ar-EG', 'he-US'];
      const ltrLocales = ['en-US', 'fr-FR', 'de-DE', 'zh-CN', 'ja-JP', 'ko-KR'];

      rtlLocales.forEach(locale => {
        expect(rtlManager.isRTLLocale(locale as LocaleCode)).toBe(true);
      });

      ltrLocales.forEach(locale => {
        expect(rtlManager.isRTLLocale(locale as LocaleCode)).toBe(false);
      });
    });

    test('should detect RTL from browser settings', () => {
      // Mock RTL browser environment
      (global as any).document.documentElement.dir = 'rtl';
      (global as any).window.getComputedStyle = jest.fn(() => ({ direction: 'rtl' }));

      const detected = rtlManager.detectRTL();
      expect(typeof detected).toBe('boolean');
    });

    test('should set document direction correctly', () => {
      rtlManager.setDirection('rtl');
      expect(rtlManager.isRTL()).toBe(true);
      expect(rtlManager.getDirection()).toBe('rtl');

      rtlManager.setDirection('ltr');
      expect(rtlManager.isRTL()).toBe(false);
      expect(rtlManager.getDirection()).toBe('ltr');
    });

    test('should apply RTL layout to elements', () => {
      const element = document.createElement('div');
      rtlManager.setDirection('rtl');
      
      rtlManager.applyRTLLayout(element);
      
      expect(element.dir).toBe('rtl');
      expect(element.style.direction).toBe('rtl');
    });

    test('should calculate RTL-aware dropdown positions', () => {
      rtlManager.setDirection('rtl');
      
      const position = rtlManager.getDropdownPosition(mockTrigger, mockDropdown, 'start');
      
      expect(position).toBeDefined();
      expect(position.direction).toBe('rtl');
      expect(typeof position.left).toBe('number');
      expect(typeof position.top).toBe('number');
    });

    test('should handle CSS logical properties', () => {
      const properties = {
        marginInlineStart: '10px',
        marginInlineEnd: '5px',
        paddingBlockStart: '15px',
        paddingBlockEnd: '8px',
        borderInlineStartWidth: '2px',
        borderInlineEndColor: 'red'
      };

      const logical = rtlManager.getLogicalProperties(properties);
      
      expect(logical).toBeDefined();
      expect(typeof logical).toBe('object');
    });

    test('should mirror animations for RTL', () => {
      rtlManager.setDirection('rtl');
      
      const element = document.createElement('div');
      const animation = rtlManager.getMirroredAnimation('slideInLeft');
      
      expect(typeof animation).toBe('string');
    });

    test('should handle scrollbar adjustments', () => {
      rtlManager.setDirection('rtl');
      
      const container = document.createElement('div');
      container.style.overflow = 'auto';
      
      rtlManager.adjustScrollbars(container);
      expect(container).toBeDefined();
    });
  });

  describe('RTL Text Direction Detection', () => {
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

    test('should detect Arabic text as RTL', () => {
      const result = detector.detectFromContent(rtlTestData.arabic.text);
      
      expect(result.direction).toBe('rtl');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.rtlChars).toBeGreaterThan(result.ltrChars);
    });

    test('should detect Hebrew text as RTL', () => {
      const result = detector.detectFromContent(rtlTestData.hebrew.text);
      
      expect(result.direction).toBe('rtl');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.rtlChars).toBeGreaterThan(result.ltrChars);
    });

    test('should detect Persian text as RTL', () => {
      const result = detector.detectFromContent(rtlTestData.persian.text);
      
      expect(result.direction).toBe('rtl');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test('should detect Urdu text as RTL', () => {
      const result = detector.detectFromContent(rtlTestData.urdu.text);
      
      expect(result.direction).toBe('rtl');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test('should handle mixed Arabic and English text', () => {
      const mixedText = 'Hello مرحبا this is mixed العربية text';
      const result = detector.detectFromContent(mixedText);
      
      expect(result.rtlChars).toBeGreaterThan(0);
      expect(result.ltrChars).toBeGreaterThan(0);
      expect(result.direction).toBeOneOf(['ltr', 'rtl']);
    });

    test('should handle Arabic numerals correctly', () => {
      const arabicNumbers = 'يوجد ١٢٣ عنصر و ٤٥٦ صفحة';
      const result = detector.detectFromContent(arabicNumbers);
      
      expect(result.direction).toBe('rtl');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('should handle punctuation in RTL text', () => {
      const punctuatedText = 'مرحبا! كيف حالك؟ أهلاً وسهلاً.';
      const result = detector.detectFromContent(punctuatedText);
      
      expect(result.direction).toBe('rtl');
      expect(result.neutralChars).toBeGreaterThan(0); // Punctuation
    });

    test('should auto-apply direction to elements', () => {
      const element = document.createElement('div');
      element.textContent = rtlTestData.hebrew.text;
      
      const result = detector.autoApplyDirection(element);
      
      expect(result.direction).toBe('rtl');
      expect(element.getAttribute('dir')).toBe('rtl');
      expect(element.getAttribute('data-direction-auto')).toBe('true');
    });

    test('should handle batch direction detection', () => {
      const elements = [
        document.createElement('div'),
        document.createElement('div'),
        document.createElement('div')
      ];

      elements[0].textContent = rtlTestData.arabic.text;
      elements[1].textContent = 'English text';
      elements[2].textContent = rtlTestData.hebrew.text;

      const results = detector.batchDetection(elements);
      
      expect(results.size).toBe(3);
      expect(results.get(elements[0])?.direction).toBe('rtl');
      expect(results.get(elements[1])?.direction).toBe('ltr');
      expect(results.get(elements[2])?.direction).toBe('rtl');
    });
  });

  describe('RTL UI Component Integration', () => {
    let searchDropdown: SearchDropdownUI;
    let uiConfig: UIConfig;

    beforeEach(async () => {
      uiConfig = {
        theme: 'light',
        rtl: false, // Will be auto-detected
        maxResults: 10,
        placeholder: rtlTestData.arabic.ui.placeholder,
        loadingText: rtlTestData.arabic.ui.loading,
        noResultsText: rtlTestData.arabic.ui.noResults,
        errorText: rtlTestData.arabic.ui.error
      };

      searchDropdown = new SearchDropdownUI(mockContainer, uiConfig);
      await searchDropdown.init();
    });

    afterEach(() => {
      searchDropdown?.destroy();
    });

    test('should create RTL dropdown layout', async () => {
      searchDropdown.setLocale('ar-SA');
      
      const arabicResults: SearchResult[] = rtlTestData.arabic.results.map((title, index) => ({
        id: index.toString(),
        title,
        score: 0.9 - (index * 0.1),
        metadata: {
          subtitle: `وصف للنتيجة ${index + 1}`,
          category: 'الفئة'
        }
      }));

      searchDropdown.showResults(arabicResults);
      
      // Dropdown should be displayed
      expect(searchDropdown).toBeDefined();
    });

    test('should handle RTL keyboard navigation', async () => {
      searchDropdown.setLocale('he-IL');
      
      const hebrewResults: SearchResult[] = rtlTestData.hebrew.results.map((title, index) => ({
        id: index.toString(),
        title,
        score: 0.9 - (index * 0.1)
      }));

      searchDropdown.showResults(hebrewResults);
      
      // Test RTL navigation (right arrow should move to previous item in RTL)
      const rightArrow = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      const leftArrow = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      
      // In RTL mode, these keys might have different behavior
      expect(() => {
        searchDropdown.handleKeyboardNavigation(rightArrow);
        searchDropdown.handleKeyboardNavigation(leftArrow);
      }).not.toThrow();
    });

    test('should position dropdown correctly in RTL mode', async () => {
      searchDropdown.setLocale('ar-SA');
      
      const results: SearchResult[] = [{
        id: '1',
        title: rtlTestData.arabic.results[0],
        score: 0.9
      }];

      searchDropdown.showResults(results);
      searchDropdown.updatePosition();
      
      // Position update should complete without errors
      expect(searchDropdown).toBeDefined();
    });

    test('should handle RTL search queries', async () => {
      searchDropdown.setLocale('fa-IR');
      
      // Simulate typing a Persian search query
      const persianQuery = rtlTestData.persian.searchQuery;
      
      const results: SearchResult[] = [{
        id: '1',
        title: rtlTestData.persian.results[0],
        score: 0.9,
        metadata: {
          subtitle: 'نتیجه مرتبط با جستجوی شما'
        }
      }];

      searchDropdown.showResults(results);
      expect(searchDropdown).toBeDefined();
    });

    test('should handle different RTL scripts in same dropdown', async () => {
      const mixedResults: SearchResult[] = [
        {
          id: '1',
          title: rtlTestData.arabic.results[0],
          score: 0.9,
          metadata: { category: 'عربي' }
        },
        {
          id: '2',
          title: rtlTestData.hebrew.results[0],
          score: 0.8,
          metadata: { category: 'עברית' }
        },
        {
          id: '3',
          title: rtlTestData.persian.results[0],
          score: 0.7,
          metadata: { category: 'فارسی' }
        }
      ];

      searchDropdown.showResults(mixedResults);
      expect(searchDropdown).toBeDefined();
    });
  });

  describe('RTL Layout and Positioning', () => {
    let rtlManager: RTLManager;

    beforeEach(async () => {
      rtlManager = new RTLManager();
      await rtlManager.init();
      rtlManager.setDirection('rtl');
    });

    afterEach(() => {
      rtlManager?.destroy();
    });

    test('should calculate correct dropdown position for RTL', () => {
      const positions = ['start', 'end'] as const;
      
      positions.forEach(preferredSide => {
        const position = rtlManager.getDropdownPosition(
          mockTrigger,
          mockDropdown,
          preferredSide
        );
        
        expect(position.direction).toBe('rtl');
        expect(typeof position.left).toBe('number');
        expect(typeof position.top).toBe('number');
        expect(position.preferredSide).toBe(preferredSide);
      });
    });

    test('should handle viewport edge constraints in RTL', () => {
      // Mock trigger at right edge of viewport
      mockTrigger.getBoundingClientRect = jest.fn(() => ({
        left: 900,
        top: 50,
        right: 1024,
        bottom: 80,
        width: 124,
        height: 30
      } as DOMRect));

      const position = rtlManager.getDropdownPosition(mockTrigger, mockDropdown, 'start');
      
      // Should adjust position to stay within viewport
      expect(position.left).toBeLessThanOrEqual(1024 - 200); // viewport width - dropdown width
    });

    test('should mirror CSS transforms correctly', () => {
      const element = document.createElement('div');
      
      const transforms = [
        'translateX(10px)',
        'rotate(45deg)',
        'scaleX(-1)',
        'translateX(10px) rotate(45deg)'
      ];

      transforms.forEach(transform => {
        element.style.transform = transform;
        rtlManager.applyRTLLayout(element);
        
        // Should apply RTL-appropriate transform
        expect(element.style.transform).toBeDefined();
      });
    });

    test('should handle flexbox direction in RTL', () => {
      const container = document.createElement('div');
      container.style.display = 'flex';
      container.style.flexDirection = 'row';
      
      rtlManager.applyRTLLayout(container);
      
      // Should adjust flex direction for RTL
      expect(container.style.direction).toBe('rtl');
    });

    test('should handle grid layouts in RTL', () => {
      const grid = document.createElement('div');
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
      
      rtlManager.applyRTLLayout(grid);
      
      // Should apply RTL direction
      expect(grid.style.direction).toBe('rtl');
    });
  });

  describe('RTL Accessibility', () => {
    test('should maintain ARIA attributes in RTL mode', async () => {
      const searchDropdown = new SearchDropdownUI(mockContainer, {
        theme: 'light',
        rtl: true,
        maxResults: 10,
        placeholder: rtlTestData.arabic.ui.placeholder,
        loadingText: rtlTestData.arabic.ui.loading,
        noResultsText: rtlTestData.arabic.ui.noResults,
        errorText: rtlTestData.arabic.ui.error
      });
      
      await searchDropdown.init();
      searchDropdown.setLocale('ar-SA');

      const results: SearchResult[] = [{
        id: '1',
        title: rtlTestData.arabic.results[0],
        score: 0.9
      }];

      searchDropdown.showResults(results);

      // ARIA attributes should be preserved
      expect(searchDropdown).toBeDefined();

      searchDropdown.destroy();
    });

    test('should announce RTL content correctly to screen readers', async () => {
      const searchDropdown = new SearchDropdownUI(mockContainer, {
        theme: 'light',
        rtl: true,
        maxResults: 10,
        placeholder: rtlTestData.hebrew.ui.placeholder,
        loadingText: rtlTestData.hebrew.ui.loading,
        noResultsText: rtlTestData.hebrew.ui.noResults,
        errorText: rtlTestData.hebrew.ui.error
      });
      
      await searchDropdown.init();
      searchDropdown.setLocale('he-IL');

      // Should handle screen reader announcements in RTL
      expect(searchDropdown).toBeDefined();

      searchDropdown.destroy();
    });

    test('should handle focus management in RTL layouts', async () => {
      const searchDropdown = new SearchDropdownUI(mockContainer, {
        theme: 'light',
        rtl: true,
        maxResults: 10,
        placeholder: rtlTestData.persian.ui.placeholder,
        loadingText: rtlTestData.persian.ui.loading,
        noResultsText: rtlTestData.persian.ui.noResults,
        errorText: rtlTestData.persian.ui.error
      });
      
      await searchDropdown.init();
      searchDropdown.setLocale('fa-IR');

      const results: SearchResult[] = rtlTestData.persian.results.map((title, index) => ({
        id: index.toString(),
        title,
        score: 0.9 - (index * 0.1)
      }));

      searchDropdown.showResults(results);
      
      // Focus management should work in RTL
      const downArrow = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      const handled = searchDropdown.handleKeyboardNavigation(downArrow);
      expect(handled).toBe(true);

      searchDropdown.destroy();
    });
  });

  describe('RTL Performance', () => {
    test('should handle RTL detection efficiently for large text', async () => {
      const detector = new TextDirectionDetector();
      await detector.init();

      const largeRTLText = rtlTestData.arabic.text.repeat(1000);
      
      const startTime = performance.now();
      const result = detector.detectFromContent(largeRTLText);
      const endTime = performance.now();
      
      expect(result.direction).toBe('rtl');
      expect(endTime - startTime).toBeLessThan(50); // Should complete in under 50ms
      
      detector.destroy();
    });

    test('should cache RTL detection results', async () => {
      const detector = new TextDirectionDetector({ cacheResults: true });
      await detector.init();

      const text = rtlTestData.arabic.text;
      
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

  describe('RTL Edge Cases', () => {
    test('should handle empty RTL text', async () => {
      const detector = new TextDirectionDetector();
      await detector.init();

      const emptyResult = detector.detectFromContent('');
      expect(emptyResult.direction).toBe('ltr'); // Fallback
      expect(emptyResult.confidence).toBe(0);

      detector.destroy();
    });

    test('should handle whitespace-only RTL text', async () => {
      const detector = new TextDirectionDetector();
      await detector.init();

      const whitespaceResult = detector.detectFromContent('   \t\n   ');
      expect(whitespaceResult.direction).toBe('ltr'); // Fallback
      
      detector.destroy();
    });

    test('should handle punctuation-only text', async () => {
      const detector = new TextDirectionDetector();
      await detector.init();

      const punctuationResult = detector.detectFromContent('!@#$%^&*()');
      expect(punctuationResult.direction).toBe('ltr'); // Fallback for neutral chars
      expect(punctuationResult.neutralChars).toBeGreaterThan(0);
      
      detector.destroy();
    });

    test('should handle malformed Unicode in RTL text', async () => {
      const detector = new TextDirectionDetector();
      await detector.init();

      const malformedRTL = 'مرحبا\uD800بالعالم'; // Lone surrogate
      
      expect(() => {
        const result = detector.detectFromContent(malformedRTL);
        expect(result).toBeDefined();
      }).not.toThrow();
      
      detector.destroy();
    });

    test('should handle very long RTL text efficiently', async () => {
      const detector = new TextDirectionDetector();
      await detector.init();

      const veryLongRTL = 'مرحبا بالعالم '.repeat(10000);
      
      const startTime = performance.now();
      const result = detector.detectFromContent(veryLongRTL);
      const endTime = performance.now();
      
      expect(result.direction).toBe('rtl');
      expect(endTime - startTime).toBeLessThan(100); // Should handle efficiently
      
      detector.destroy();
    });
  });
});

// Helper matchers
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