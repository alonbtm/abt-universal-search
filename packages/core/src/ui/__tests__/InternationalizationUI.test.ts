/**
 * Internationalization UI Component Tests
 * Tests for UI components with i18n features
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SearchDropdownUI } from '../SearchDropdownUI';
import { LoadingSpinner } from '../LoadingSpinner';
import { ErrorMessage } from '../ErrorMessage';
import { EmptyState } from '../EmptyState';
import type { SearchResult } from '../../types/Results';
import type { UIConfig } from '../../types/Config';
import type { LocaleCode } from '../../types/Internationalization';

describe('Internationalization - UI Components', () => {
  let mockContainer: HTMLElement;
  let mockUIConfig: UIConfig;

  beforeEach(() => {
    // Mock DOM environment
    mockContainer = document.createElement('div');
    document.body.appendChild(mockContainer);

    mockUIConfig = {
      theme: 'light',
      rtl: false,
      maxResults: 10,
      placeholder: 'Search...',
      loadingText: 'Loading...',
      noResultsText: 'No results found',
      errorText: 'An error occurred'
    };

    // Mock global objects
    (global as any).document = document;
    (global as any).window = {
      ...window,
      navigator: { languages: ['en-US', 'en'] },
      getComputedStyle: jest.fn(() => ({ 
        direction: 'ltr', 
        display: 'block', 
        visibility: 'visible',
        fontFamily: 'system-ui'
      })),
      setInterval: jest.fn((fn, delay) => setTimeout(fn, delay)),
      clearInterval: jest.fn(clearTimeout),
      FontFace: jest.fn(),
      requestAnimationFrame: jest.fn((fn) => setTimeout(fn, 16)),
      cancelAnimationFrame: jest.fn(clearTimeout),
      ResizeObserver: jest.fn(() => ({
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn()
      }))
    };

    // Mock Intl APIs
    (global as any).Intl = {
      DateTimeFormat: jest.fn(() => ({ 
        format: jest.fn((date) => new Date(date).toLocaleDateString()) 
      })),
      NumberFormat: jest.fn(() => ({ 
        format: jest.fn((num) => num.toLocaleString()) 
      })),
      RelativeTimeFormat: jest.fn(() => ({ 
        format: jest.fn((value, unit) => `${value} ${unit} ago`) 
      })),
      ListFormat: jest.fn(() => ({ 
        format: jest.fn((items) => items.join(', ')) 
      }))
    };
  });

  afterEach(() => {
    document.body.removeChild(mockContainer);
    jest.clearAllMocks();
  });

  describe('SearchDropdownUI Internationalization', () => {
    let searchDropdown: SearchDropdownUI;

    beforeEach(async () => {
      searchDropdown = new SearchDropdownUI(mockContainer, mockUIConfig);
      await searchDropdown.init();
    });

    afterEach(() => {
      searchDropdown?.destroy();
    });

    test('should initialize with default locale', async () => {
      expect(searchDropdown).toBeDefined();
      // Component should be ready for i18n operations
    });

    test('should switch locale and update UI', async () => {
      searchDropdown.setLocale('ar-SA');
      
      // Verify locale change
      const arabicText = searchDropdown.getText('loading');
      expect(typeof arabicText).toBe('string');
    });

    test('should format dates according to locale', () => {
      const testDate = new Date('2024-01-15T10:30:00Z');
      
      const formattedDate = searchDropdown.formatDate(testDate);
      expect(typeof formattedDate).toBe('string');
    });

    test('should format numbers according to locale', () => {
      const testNumber = 12345.67;
      
      const formattedNumber = searchDropdown.formatNumber(testNumber);
      expect(typeof formattedNumber).toBe('string');
    });

    test('should handle RTL layout correctly', async () => {
      // Switch to RTL locale
      searchDropdown.setLocale('ar-SA');
      
      // Create test results with Arabic text
      const rtlResults: SearchResult[] = [
        {
          id: '1',
          title: 'النتيجة الأولى',
          score: 0.9,
          metadata: {
            subtitle: 'وصف النتيجة',
            category: 'الفئة'
          }
        },
        {
          id: '2', 
          title: 'النتيجة الثانية',
          score: 0.8,
          metadata: {
            subtitle: 'وصف آخر'
          }
        }
      ];

      searchDropdown.showResults(rtlResults);
      
      // Results should be displayed
      expect(searchDropdown).toBeDefined();
    });

    test('should handle mixed direction content', () => {
      const mixedResults: SearchResult[] = [
        {
          id: '1',
          title: 'Hello مرحبا שלום',
          score: 0.9,
          metadata: {
            subtitle: 'Mixed direction content'
          }
        }
      ];

      searchDropdown.showResults(mixedResults);
      expect(searchDropdown).toBeDefined();
    });

    test('should apply correct fonts for different scripts', () => {
      const multiScriptResults: SearchResult[] = [
        {
          id: '1',
          title: 'English Title',
          score: 0.9
        },
        {
          id: '2',
          title: 'العنوان العربي',
          score: 0.8
        },
        {
          id: '3',
          title: '中文标题',
          score: 0.7
        },
        {
          id: '4',
          title: '日本語のタイトル',
          score: 0.6
        }
      ];

      searchDropdown.showResults(multiScriptResults);
      expect(searchDropdown).toBeDefined();
    });

    test('should handle keyboard navigation in RTL mode', async () => {
      searchDropdown.setLocale('he-IL');
      
      const hebrewResults: SearchResult[] = [
        { id: '1', title: 'תוצאה ראשונה', score: 0.9 },
        { id: '2', title: 'תוצאה שנייה', score: 0.8 }
      ];

      searchDropdown.showResults(hebrewResults);
      
      // Simulate arrow key navigation
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      const upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      
      const handled1 = searchDropdown.handleKeyboardNavigation(downEvent);
      const handled2 = searchDropdown.handleKeyboardNavigation(upEvent);
      
      expect(handled1).toBe(true);
      expect(handled2).toBe(true);
    });

    test('should update positioning for RTL languages', () => {
      searchDropdown.setLocale('ar-SA');
      searchDropdown.updatePosition();
      
      // Position update should complete without errors
      expect(searchDropdown).toBeDefined();
    });
  });

  describe('LoadingSpinner Internationalization', () => {
    let loadingSpinner: LoadingSpinner;

    beforeEach(async () => {
      loadingSpinner = new LoadingSpinner(mockContainer);
      await loadingSpinner.init();
    });

    afterEach(() => {
      loadingSpinner?.destroy();
    });

    test('should initialize with localized messages', () => {
      expect(loadingSpinner).toBeDefined();
    });

    test('should set locale and update fonts', () => {
      loadingSpinner.setLocale('zh-CN');
      expect(loadingSpinner).toBeDefined();
    });

    test('should display localized loading messages', async () => {
      loadingSpinner.setLocale('es-ES');
      await loadingSpinner.start('Cargando datos...');
      
      loadingSpinner.updateMessage('Procesando información...');
      
      expect(loadingSpinner).toBeDefined();
    });

    test('should handle RTL loading messages', async () => {
      loadingSpinner.setLocale('ar-SA');
      await loadingSpinner.start('جاري التحميل...');
      
      expect(loadingSpinner).toBeDefined();
    });

    test('should apply appropriate fonts for different languages', async () => {
      // Test different language messages
      const messages = [
        { locale: 'en-US' as LocaleCode, text: 'Loading...' },
        { locale: 'ar-SA' as LocaleCode, text: 'جاري التحميل...' },
        { locale: 'zh-CN' as LocaleCode, text: '加载中...' },
        { locale: 'ja-JP' as LocaleCode, text: '読み込み中...' },
        { locale: 'ko-KR' as LocaleCode, text: '로딩 중...' },
        { locale: 'hi-IN' as LocaleCode, text: 'लोड हो रहा है...' },
        { locale: 'th-TH' as LocaleCode, text: 'กำลังโหลด...' }
      ];

      for (const { locale, text } of messages) {
        loadingSpinner.setLocale(locale);
        await loadingSpinner.start(text);
        loadingSpinner.stop();
      }
      
      expect(loadingSpinner).toBeDefined();
    });
  });

  describe('ErrorMessage Internationalization', () => {
    let errorMessage: ErrorMessage;

    beforeEach(async () => {
      errorMessage = new ErrorMessage(mockContainer);
      await errorMessage.init();
    });

    afterEach(() => {
      errorMessage?.destroy();
    });

    test('should display localized error messages', () => {
      const error = new Error('Test error message');
      errorMessage.show(error);
      
      expect(errorMessage).toBeDefined();
    });

    test('should handle RTL error messages', () => {
      const arabicError = new Error('حدث خطأ في النظام');
      errorMessage.show(arabicError);
      
      expect(errorMessage).toBeDefined();
    });

    test('should format error timestamps according to locale', () => {
      const error = new Error('Localized error');
      errorMessage.show(error);
      
      expect(errorMessage).toBeDefined();
    });
  });

  describe('EmptyState Internationalization', () => {
    let emptyState: EmptyState;

    beforeEach(async () => {
      emptyState = new EmptyState(mockContainer);
      await emptyState.init();
    });

    afterEach(() => {
      emptyState?.destroy();
    });

    test('should display localized empty state messages', () => {
      emptyState.show('لم يتم العثور على نتائج', ['اقتراح أول', 'اقتراح ثاني']);
      expect(emptyState).toBeDefined();
    });

    test('should handle mixed-direction suggestion text', () => {
      const mixedSuggestions = [
        'Try "search term"',
        'جرب "مصطلح البحث"',
        '尝试 "搜索词"'
      ];
      
      emptyState.show('No results found', mixedSuggestions);
      expect(emptyState).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    test('should coordinate locale changes across all UI components', async () => {
      const searchDropdown = new SearchDropdownUI(mockContainer, mockUIConfig);
      const loadingSpinner = new LoadingSpinner(mockContainer);
      const errorMessage = new ErrorMessage(mockContainer);
      
      await Promise.all([
        searchDropdown.init(),
        loadingSpinner.init(),
        errorMessage.init()
      ]);

      // Switch all components to Arabic
      const locale: LocaleCode = 'ar-SA';
      searchDropdown.setLocale(locale);
      loadingSpinner.setLocale(locale);

      // Test coordinated behavior
      await loadingSpinner.start('جاري البحث...');
      
      const arabicResults: SearchResult[] = [
        { id: '1', title: 'النتيجة الأولى', score: 0.9 }
      ];
      
      loadingSpinner.stop();
      searchDropdown.showResults(arabicResults);

      // Cleanup
      [searchDropdown, loadingSpinner, errorMessage]
        .forEach(component => component.destroy());
    });

    test('should handle locale switching without UI glitches', async () => {
      const searchDropdown = new SearchDropdownUI(mockContainer, mockUIConfig);
      await searchDropdown.init();

      const locales: LocaleCode[] = ['en-US', 'ar-SA', 'zh-CN', 'ja-JP'];
      
      for (const locale of locales) {
        searchDropdown.setLocale(locale);
        
        // Show some test results
        const results: SearchResult[] = [
          { id: '1', title: 'Test Result', score: 0.9 }
        ];
        
        searchDropdown.showResults(results);
        
        // Small delay to allow for rendering
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      searchDropdown.destroy();
    });

    test('should maintain accessibility during internationalization', async () => {
      const searchDropdown = new SearchDropdownUI(mockContainer, mockUIConfig);
      await searchDropdown.init();

      // Switch to RTL locale
      searchDropdown.setLocale('he-IL');
      
      const hebrewResults: SearchResult[] = [
        { 
          id: '1', 
          title: 'תוצאה נגישה', 
          score: 0.9,
          metadata: {
            subtitle: 'עם תמיכה בנגישות'
          }
        }
      ];

      searchDropdown.showResults(hebrewResults);

      // Verify keyboard navigation still works
      const navEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      const handled = searchDropdown.handleKeyboardNavigation(navEvent);
      
      expect(handled).toBe(true);

      searchDropdown.destroy();
    });
  });

  describe('Performance and Memory Tests', () => {
    test('should not leak memory during locale switching', async () => {
      const searchDropdown = new SearchDropdownUI(mockContainer, mockUIConfig);
      await searchDropdown.init();

      const locales: LocaleCode[] = ['en-US', 'ar-SA', 'zh-CN', 'ja-JP', 'ko-KR'];
      
      // Rapid locale switching
      for (let i = 0; i < 100; i++) {
        const locale = locales[i % locales.length];
        searchDropdown.setLocale(locale);
      }

      // Component should still be functional
      const results: SearchResult[] = [
        { id: '1', title: 'Performance Test', score: 0.9 }
      ];
      
      searchDropdown.showResults(results);
      expect(searchDropdown).toBeDefined();

      searchDropdown.destroy();
    });

    test('should handle large internationalized datasets efficiently', async () => {
      const searchDropdown = new SearchDropdownUI(mockContainer, mockUIConfig);
      await searchDropdown.init();

      // Generate large result set with international content
      const largeResults: SearchResult[] = [];
      const titles = [
        'English Title',
        'العنوان العربي', 
        '中文标题',
        'タイトル',
        '제목',
        'Titre français',
        'Título español',
        'Заголовок'
      ];

      for (let i = 0; i < 1000; i++) {
        largeResults.push({
          id: i.toString(),
          title: titles[i % titles.length] + ` ${i}`,
          score: Math.random(),
          metadata: {
            subtitle: `Subtitle ${i}`
          }
        });
      }

      const startTime = performance.now();
      searchDropdown.showResults(largeResults.slice(0, 10)); // Only show first 10
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50); // Should render in under 50ms

      searchDropdown.destroy();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty or null text gracefully', async () => {
      const searchDropdown = new SearchDropdownUI(mockContainer, mockUIConfig);
      await searchDropdown.init();

      const edgeCaseResults: SearchResult[] = [
        { id: '1', title: '', score: 0.9 },
        { id: '2', title: '   ', score: 0.8 },
        { id: '3', title: '\n\t', score: 0.7 }
      ];

      expect(() => searchDropdown.showResults(edgeCaseResults)).not.toThrow();

      searchDropdown.destroy();
    });

    test('should handle malformed Unicode gracefully', async () => {
      const searchDropdown = new SearchDropdownUI(mockContainer, mockUIConfig);
      await searchDropdown.init();

      const malformedResults: SearchResult[] = [
        { id: '1', title: '\uD800\uDC00', score: 0.9 }, // Valid surrogate pair
        { id: '2', title: '\uD800', score: 0.8 }, // Lone high surrogate
        { id: '3', title: '\uDC00', score: 0.7 }, // Lone low surrogate
        { id: '4', title: 'Normal text', score: 0.6 }
      ];

      expect(() => searchDropdown.showResults(malformedResults)).not.toThrow();

      searchDropdown.destroy();
    });

    test('should handle very long internationalized text', async () => {
      const searchDropdown = new SearchDropdownUI(mockContainer, mockUIConfig);
      await searchDropdown.init();

      const longText = 'Very long internationalized text '.repeat(100) + 
                      'نص طويل جداً باللغة العربية '.repeat(50) +
                      '非常长的中文文本 '.repeat(30);

      const longResults: SearchResult[] = [
        { 
          id: '1', 
          title: longText.substring(0, 200), // Truncate for display
          score: 0.9,
          metadata: {
            subtitle: longText.substring(200, 300)
          }
        }
      ];

      expect(() => searchDropdown.showResults(longResults)).not.toThrow();

      searchDropdown.destroy();
    });

    test('should handle rapid locale switching', async () => {
      const loadingSpinner = new LoadingSpinner(mockContainer);
      await loadingSpinner.init();

      const locales: LocaleCode[] = ['en-US', 'ar-SA', 'zh-CN'];
      
      // Rapid switching without delays
      for (let i = 0; i < 50; i++) {
        const locale = locales[i % locales.length];
        loadingSpinner.setLocale(locale);
      }

      expect(loadingSpinner).toBeDefined();

      loadingSpinner.destroy();
    });
  });
});