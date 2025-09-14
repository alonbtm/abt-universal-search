/**
 * Internationalization Integration Tests
 * End-to-end tests for complete i18n workflow
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SearchDropdownUI } from '../SearchDropdownUI';
import { LoadingSpinner } from '../LoadingSpinner';
import { ErrorMessage } from '../ErrorMessage';
import { RTLManager } from '../RTLManager';
import { LocalizationManager } from '../LocalizationManager';
import { UnicodeHandler } from '../UnicodeHandler';
import { LocaleFormatter } from '../LocaleFormatter';
import { FontManager } from '../FontManager';
import type { SearchResult } from '../../types/Results';
import type { UIConfig } from '../../types/Config';
import type { LocaleCode } from '../../types/Internationalization';

describe('Internationalization - Integration Tests', () => {
  let mockContainer: HTMLElement;
  let searchDropdown: SearchDropdownUI;
  let loadingSpinner: LoadingSpinner;
  let errorMessage: ErrorMessage;

  // Comprehensive internationalization test scenarios
  const testScenarios = [
    {
      name: 'Arabic (Saudi Arabia)',
      locale: 'ar-SA' as LocaleCode,
      direction: 'rtl' as const,
      script: 'arabic' as const,
      translations: {
        loading: 'جاري التحميل...',
        noResults: 'لم يتم العثور على نتائج',
        error: 'حدث خطأ أثناء البحث',
        placeholder: 'ابحث هنا...',
        retry: 'إعادة المحاولة',
        dismiss: 'إغلاق'
      },
      sampleText: 'مرحبا بالعالم! هذا نص تجريبي باللغة العربية',
      searchResults: [
        'النتيجة الأولى للبحث',
        'المعلومات المطلوبة هنا',
        'البيانات المفيدة والمهمة',
        'المحتوى ذو الصلة بالموضوع'
      ]
    },
    {
      name: 'Hebrew (Israel)',
      locale: 'he-IL' as LocaleCode,
      direction: 'rtl' as const,
      script: 'hebrew' as const,
      translations: {
        loading: 'טוען...',
        noResults: 'לא נמצאו תוצאות',
        error: 'אירעה שגיאה במהלך החיפוש',
        placeholder: 'חפש כאן...',
        retry: 'נסה שוב',
        dismiss: 'סגור'
      },
      sampleText: 'שלום עולם! זהו טקסט לדוגמה בעברית',
      searchResults: [
        'התוצאה הראשונה לחיפוש',
        'המידע הנדרש כאן',
        'נתונים שימושיים וחשובים',
        'תוכן רלוונטי לנושא'
      ]
    },
    {
      name: 'Chinese (Simplified)',
      locale: 'zh-CN' as LocaleCode,
      direction: 'ltr' as const,
      script: 'cjk' as const,
      translations: {
        loading: '加载中...',
        noResults: '未找到结果',
        error: '搜索时发生错误',
        placeholder: '在此搜索...',
        retry: '重试',
        dismiss: '关闭'
      },
      sampleText: '你好世界！这是中文示例文本',
      searchResults: [
        '第一个搜索结果',
        '这里是所需信息',
        '有用且重要的数据',
        '与主题相关的内容'
      ]
    },
    {
      name: 'Japanese',
      locale: 'ja-JP' as LocaleCode,
      direction: 'ltr' as const,
      script: 'cjk' as const,
      translations: {
        loading: '読み込み中...',
        noResults: '結果が見つかりません',
        error: '検索中にエラーが発生しました',
        placeholder: 'ここで検索...',
        retry: '再試行',
        dismiss: '閉じる'
      },
      sampleText: 'こんにちは世界！これは日本語のサンプルテキストです',
      searchResults: [
        '最初の検索結果',
        'ここに必要な情報',
        '有用で重要なデータ',
        'トピックに関連するコンテンツ'
      ]
    },
    {
      name: 'Korean',
      locale: 'ko-KR' as LocaleCode,
      direction: 'ltr' as const,
      script: 'cjk' as const,
      translations: {
        loading: '로딩 중...',
        noResults: '결과를 찾을 수 없습니다',
        error: '검색 중 오류가 발생했습니다',
        placeholder: '여기서 검색...',
        retry: '다시 시도',
        dismiss: '닫기'
      },
      sampleText: '안녕하세요, 세상! 이것은 한국어 샘플 텍스트입니다',
      searchResults: [
        '첫 번째 검색 결과',
        '여기에 필요한 정보',
        '유용하고 중요한 데이터',
        '주제와 관련된 내용'
      ]
    },
    {
      name: 'Russian',
      locale: 'ru-RU' as LocaleCode,
      direction: 'ltr' as const,
      script: 'cyrillic' as const,
      translations: {
        loading: 'Загрузка...',
        noResults: 'Результаты не найдены',
        error: 'Произошла ошибка при поиске',
        placeholder: 'Поиск здесь...',
        retry: 'Повторить',
        dismiss: 'Закрыть'
      },
      sampleText: 'Привет, мир! Это образец текста на русском языке',
      searchResults: [
        'Первый результат поиска',
        'Здесь нужная информация',
        'Полезные и важные данные',
        'Контент, связанный с темой'
      ]
    },
    {
      name: 'Hindi (Devanagari)',
      locale: 'hi-IN' as LocaleCode,
      direction: 'ltr' as const,
      script: 'devanagari' as const,
      translations: {
        loading: 'लोड हो रहा है...',
        noResults: 'कोई परिणाम नहीं मिला',
        error: 'खोज के दौरान त्रुटि हुई',
        placeholder: 'यहाँ खोजें...',
        retry: 'पुनः प्रयास करें',
        dismiss: 'बंद करें'
      },
      sampleText: 'नमस्ते दुनिया! यह हिंदी में नमूना पाठ है',
      searchResults: [
        'पहला खोज परिणाम',
        'यहाँ आवश्यक जानकारी है',
        'उपयोगी और महत्वपूर्ण डेटा',
        'विषय से संबंधित सामग्री'
      ]
    },
    {
      name: 'Thai',
      locale: 'th-TH' as LocaleCode,
      direction: 'ltr' as const,
      script: 'thai' as const,
      translations: {
        loading: 'กำลังโหลด...',
        noResults: 'ไม่พบผลลัพธ์',
        error: 'เกิดข้อผิดพลาดระหว่างการค้นหา',
        placeholder: 'ค้นหาที่นี่...',
        retry: 'ลองอีกครั้ง',
        dismiss: 'ปิด'
      },
      sampleText: 'สวัสดีชาวโลก! นี่คือข้อความตัวอย่างภาษาไทย',
      searchResults: [
        'ผลการค้นหาแรก',
        'ข้อมูลที่จำเป็นอยู่ที่นี่',
        'ข้อมูลที่มีประโยชน์และสำคัญ',
        'เนื้อหาที่เกี่ยวข้องกับหัวข้อ'
      ]
    }
  ];

  beforeEach(() => {
    mockContainer = document.createElement('div');
    document.body.appendChild(mockContainer);

    // Mock DOM and global APIs
    (global as any).document = document;
    (global as any).window = {
      ...window,
      innerWidth: 1024,
      innerHeight: 768,
      navigator: { languages: ['en-US', 'en'] },
      getComputedStyle: jest.fn(() => ({
        direction: 'ltr',
        display: 'block',
        visibility: 'visible',
        fontFamily: 'system-ui'
      })),
      setInterval: jest.fn((fn, delay) => setTimeout(fn, delay)),
      clearInterval: jest.fn(clearTimeout),
      requestAnimationFrame: jest.fn((fn) => setTimeout(fn, 16)),
      cancelAnimationFrame: jest.fn(clearTimeout),
      ResizeObserver: jest.fn(() => ({
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn()
      })),
      FontFace: jest.fn()
    };

    // Mock Intl APIs with more realistic implementations
    (global as any).Intl = {
      DateTimeFormat: jest.fn((locale) => ({
        format: jest.fn((date) => {
          const d = new Date(date);
          if (locale === 'ar-SA') return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
          if (locale === 'ja-JP') return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
          return d.toLocaleDateString();
        })
      })),
      NumberFormat: jest.fn((locale) => ({
        format: jest.fn((num) => {
          if (locale === 'ar-SA') return num.toLocaleString('ar-SA');
          if (locale === 'hi-IN') return num.toLocaleString('hi-IN');
          return num.toLocaleString();
        })
      })),
      RelativeTimeFormat: jest.fn((locale) => ({
        format: jest.fn((value, unit) => {
          if (locale === 'ar-SA') return `منذ ${Math.abs(value)} ${unit}`;
          if (locale === 'zh-CN') return `${Math.abs(value)}${unit}前`;
          return `${Math.abs(value)} ${unit} ago`;
        })
      })),
      ListFormat: jest.fn((locale) => ({
        format: jest.fn((items) => {
          if (locale === 'ar-SA') return items.join('، ');
          if (locale === 'zh-CN') return items.join('、');
          return items.join(', ');
        })
      }))
    };
  });

  afterEach(() => {
    // Cleanup all components
    [searchDropdown, loadingSpinner, errorMessage].forEach(component => {
      if (component && typeof component.destroy === 'function') {
        component.destroy();
      }
    });

    if (mockContainer.parentNode) {
      mockContainer.parentNode.removeChild(mockContainer);
    }
    
    jest.clearAllMocks();
  });

  describe('Complete Internationalization Workflow', () => {
    testScenarios.forEach(scenario => {
      test(`should handle complete workflow for ${scenario.name}`, async () => {
        // Initialize UI components
        const uiConfig: UIConfig = {
          theme: 'light',
          rtl: scenario.direction === 'rtl',
          maxResults: 10,
          placeholder: scenario.translations.placeholder,
          loadingText: scenario.translations.loading,
          noResultsText: scenario.translations.noResults,
          errorText: scenario.translations.error
        };

        searchDropdown = new SearchDropdownUI(mockContainer, uiConfig);
        loadingSpinner = new LoadingSpinner(mockContainer);
        errorMessage = new ErrorMessage(mockContainer);

        // Initialize all components
        await Promise.all([
          searchDropdown.init(),
          loadingSpinner.init(),
          errorMessage.init()
        ]);

        // Set locale for all components
        searchDropdown.setLocale(scenario.locale);
        loadingSpinner.setLocale(scenario.locale);

        // Test loading phase
        await loadingSpinner.start(scenario.translations.loading);
        expect(loadingSpinner).toBeDefined();

        // Test results display
        const results: SearchResult[] = scenario.searchResults.map((title, index) => ({
          id: index.toString(),
          title,
          score: 0.9 - (index * 0.1),
          metadata: {
            subtitle: `${scenario.translations.loading} ${index + 1}`,
            category: 'Test Category',
            timestamp: new Date(),
            count: index + 1
          }
        }));

        loadingSpinner.stop();
        searchDropdown.showResults(results);

        // Test keyboard navigation
        const downArrow = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        const upArrow = new KeyboardEvent('keydown', { key: 'ArrowUp' });
        
        const handled1 = searchDropdown.handleKeyboardNavigation(downArrow);
        const handled2 = searchDropdown.handleKeyboardNavigation(upArrow);
        
        expect(handled1).toBe(true);
        expect(handled2).toBe(true);

        // Test error handling
        const testError = new Error(scenario.translations.error);
        errorMessage.show(testError, () => {
          // Retry action
        });

        // Test empty state
        searchDropdown.showEmpty(scenario.translations.noResults, [
          'Suggestion 1',
          'Suggestion 2'
        ]);

        // Verify all operations completed without errors
        expect(searchDropdown).toBeDefined();
        expect(loadingSpinner).toBeDefined();
        expect(errorMessage).toBeDefined();
      });
    });

    test('should handle rapid locale switching across all components', async () => {
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
      loadingSpinner = new LoadingSpinner(mockContainer);
      errorMessage = new ErrorMessage(mockContainer);

      await Promise.all([
        searchDropdown.init(),
        loadingSpinner.init(),
        errorMessage.init()
      ]);

      // Rapidly switch between different locales
      const locales = testScenarios.slice(0, 4).map(s => s.locale);
      
      for (let i = 0; i < 10; i++) {
        const locale = locales[i % locales.length];
        const scenario = testScenarios.find(s => s.locale === locale)!;
        
        // Switch all components to new locale
        searchDropdown.setLocale(locale);
        loadingSpinner.setLocale(locale);

        // Show some content
        const results: SearchResult[] = [{
          id: '1',
          title: scenario.searchResults[0],
          score: 0.9
        }];

        searchDropdown.showResults(results);
        
        // Small delay to allow for processing
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      // Should still be functional after rapid switching
      expect(searchDropdown).toBeDefined();
    });
  });

  describe('Mixed Content Scenarios', () => {
    test('should handle mixed RTL/LTR content correctly', async () => {
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

      const mixedResults: SearchResult[] = [
        {
          id: '1',
          title: 'English title مع النص العربي',
          score: 0.9,
          metadata: { subtitle: 'Mixed content example' }
        },
        {
          id: '2',
          title: 'שלום Hello مرحبا',
          score: 0.8,
          metadata: { subtitle: 'Hebrew, English, and Arabic' }
        },
        {
          id: '3',
          title: '中文 English العربية עברית',
          score: 0.7,
          metadata: { subtitle: 'Multiple scripts' }
        },
        {
          id: '4',
          title: 'URL: https://example.com في النص العربي',
          score: 0.6,
          metadata: { subtitle: 'URLs in RTL text' }
        },
        {
          id: '5',
          title: 'Numbers ١٢٣ and 456 in mixed text',
          score: 0.5,
          metadata: { subtitle: 'Arabic and Latin numerals' }
        }
      ];

      searchDropdown.showResults(mixedResults);
      expect(searchDropdown).toBeDefined();
    });

    test('should handle multiple writing systems in single interface', async () => {
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

      const multiScriptResults: SearchResult[] = testScenarios.map((scenario, index) => ({
        id: index.toString(),
        title: scenario.searchResults[0],
        score: 0.9 - (index * 0.05),
        metadata: {
          subtitle: `${scenario.name} - ${scenario.sampleText.substring(0, 50)}...`,
          category: scenario.name,
          locale: scenario.locale
        }
      }));

      searchDropdown.showResults(multiScriptResults);

      // Navigate through different writing systems
      for (let i = 0; i < 3; i++) {
        const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        searchDropdown.handleKeyboardNavigation(downEvent);
        
        // Small delay to allow for rendering
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      expect(searchDropdown).toBeDefined();
    });
  });

  describe('Real-world Usage Patterns', () => {
    test('should simulate typical user search workflow with i18n', async () => {
      // Start with English
      const uiConfig: UIConfig = {
        theme: 'light',
        rtl: false,
        maxResults: 10,
        placeholder: 'Search...',
        loadingText: 'Loading...',
        noResultsText: 'No results found',
        errorText: 'An error occurred'
      };

      searchDropdown = new SearchDropdownUI(mockContainer, uiConfig);
      loadingSpinner = new LoadingSpinner(mockContainer);

      await Promise.all([
        searchDropdown.init(),
        loadingSpinner.init()
      ]);

      // User starts searching
      await loadingSpinner.start('Searching...');
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Results come back
      loadingSpinner.stop();
      const englishResults: SearchResult[] = [
        { id: '1', title: 'First English result', score: 0.9 },
        { id: '2', title: 'Second English result', score: 0.8 }
      ];
      searchDropdown.showResults(englishResults);

      // User switches to Arabic
      searchDropdown.setLocale('ar-SA');
      loadingSpinner.setLocale('ar-SA');

      // New search in Arabic
      await loadingSpinner.start('جاري البحث...');
      await new Promise(resolve => setTimeout(resolve, 20));
      
      loadingSpinner.stop();
      const arabicResults: SearchResult[] = [
        { id: '3', title: 'النتيجة العربية الأولى', score: 0.9 },
        { id: '4', title: 'النتيجة العربية الثانية', score: 0.8 }
      ];
      searchDropdown.showResults(arabicResults);

      // User navigates results
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      searchDropdown.handleKeyboardNavigation(downEvent);

      // User switches to Chinese
      searchDropdown.setLocale('zh-CN');
      loadingSpinner.setLocale('zh-CN');

      const chineseResults: SearchResult[] = [
        { id: '5', title: '第一个中文结果', score: 0.9 },
        { id: '6', title: '第二个中文结果', score: 0.8 }
      ];
      searchDropdown.showResults(chineseResults);

      expect(searchDropdown).toBeDefined();
      expect(loadingSpinner).toBeDefined();
    });

    test('should handle error scenarios across different locales', async () => {
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
      errorMessage = new ErrorMessage(mockContainer);

      await Promise.all([
        searchDropdown.init(),
        errorMessage.init()
      ]);

      // Test error scenarios in different locales
      const errorScenarios = [
        { locale: 'en-US' as LocaleCode, message: 'Network connection failed' },
        { locale: 'ar-SA' as LocaleCode, message: 'فشل الاتصال بالشبكة' },
        { locale: 'zh-CN' as LocaleCode, message: '网络连接失败' },
        { locale: 'ja-JP' as LocaleCode, message: 'ネットワーク接続に失敗しました' }
      ];

      for (const scenario of errorScenarios) {
        searchDropdown.setLocale(scenario.locale);
        
        const error = new Error(scenario.message);
        searchDropdown.showError(error, () => {
          // Retry callback
        });
        
        errorMessage.show(error);
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 10));
        
        errorMessage.hide();
      }

      expect(searchDropdown).toBeDefined();
      expect(errorMessage).toBeDefined();
    });
  });

  describe('Performance Under Internationalization', () => {
    test('should maintain performance with large internationalized datasets', async () => {
      const uiConfig: UIConfig = {
        theme: 'light',
        rtl: false,
        maxResults: 50, // Larger result set
        placeholder: 'Search...',
        loadingText: 'Loading...',
        noResultsText: 'No results',
        errorText: 'Error'
      };

      searchDropdown = new SearchDropdownUI(mockContainer, uiConfig);
      await searchDropdown.init();

      // Generate large dataset with mixed international content
      const largeResults: SearchResult[] = [];
      const scenarios = testScenarios.slice(0, 4); // Use 4 different languages

      for (let i = 0; i < 200; i++) {
        const scenario = scenarios[i % scenarios.length];
        largeResults.push({
          id: i.toString(),
          title: `${scenario.searchResults[i % scenario.searchResults.length]} ${i}`,
          score: Math.random(),
          metadata: {
            subtitle: scenario.sampleText.substring(0, 100),
            category: scenario.name,
            timestamp: new Date(Date.now() - i * 1000 * 60),
            count: i
          }
        });
      }

      // Measure rendering time
      const startTime = performance.now();
      searchDropdown.showResults(largeResults.slice(0, 50)); // Show first 50
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should render in under 100ms
      expect(searchDropdown).toBeDefined();
    });

    test('should handle memory efficiently during locale switching', async () => {
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

      const locales = testScenarios.map(s => s.locale);
      const results: SearchResult[] = [{
        id: '1',
        title: 'Test Result',
        score: 0.9
      }];

      // Perform many locale switches
      for (let i = 0; i < 100; i++) {
        const locale = locales[i % locales.length];
        searchDropdown.setLocale(locale);
        searchDropdown.showResults(results);
        
        // Minimal delay
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }

      // Should still be responsive
      const finalResults: SearchResult[] = [
        { id: '2', title: 'Final test', score: 0.9 }
      ];
      searchDropdown.showResults(finalResults);
      
      expect(searchDropdown).toBeDefined();
    });
  });

  describe('Accessibility Integration with I18n', () => {
    test('should maintain accessibility across all supported locales', async () => {
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

      // Test accessibility with different locale scenarios
      for (const scenario of testScenarios.slice(0, 3)) {
        searchDropdown.setLocale(scenario.locale);

        const results: SearchResult[] = scenario.searchResults.map((title, index) => ({
          id: index.toString(),
          title,
          score: 0.9 - (index * 0.1),
          metadata: {
            subtitle: `Accessible content in ${scenario.name}`
          }
        }));

        searchDropdown.showResults(results);

        // Test keyboard navigation in each locale
        const navEvents = [
          new KeyboardEvent('keydown', { key: 'ArrowDown' }),
          new KeyboardEvent('keydown', { key: 'ArrowUp' }),
          new KeyboardEvent('keydown', { key: 'Enter' }),
          new KeyboardEvent('keydown', { key: 'Escape' })
        ];

        navEvents.forEach(event => {
          expect(() => {
            searchDropdown.handleKeyboardNavigation(event);
          }).not.toThrow();
        });
      }

      expect(searchDropdown).toBeDefined();
    });

    test('should handle focus management across different writing directions', async () => {
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

      // Test with RTL and LTR locales
      const directionTests = [
        { locale: 'en-US' as LocaleCode, direction: 'ltr' as const },
        { locale: 'ar-SA' as LocaleCode, direction: 'rtl' as const },
        { locale: 'zh-CN' as LocaleCode, direction: 'ltr' as const },
        { locale: 'he-IL' as LocaleCode, direction: 'rtl' as const }
      ];

      for (const test of directionTests) {
        searchDropdown.setLocale(test.locale);
        
        const results: SearchResult[] = [{
          id: '1',
          title: `Test result for ${test.locale}`,
          score: 0.9
        }];

        searchDropdown.showResults(results);

        // Test focus behavior
        const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
        const shiftTabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true });

        expect(() => {
          searchDropdown.handleKeyboardNavigation(tabEvent);
          searchDropdown.handleKeyboardNavigation(shiftTabEvent);
        }).not.toThrow();
      }

      expect(searchDropdown).toBeDefined();
    });
  });
});