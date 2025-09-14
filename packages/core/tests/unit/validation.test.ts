/**
 * Validation Utilities Unit Tests
 * Tests for input validation and configuration validation functions
 */

import {
  ValidationError,
  validateSelector,
  validateTargetElement,
  validateConfiguration,
  sanitizeQuery,
  isValidQuery
} from '../../src/utils/validation';
import { DEFAULT_CONFIG } from '../../src/types/Config';

// Mock DOM environment using real jsdom elements
const createMockElement = (isConnected = true) => {
  const element = document.createElement('div');
  if (isConnected) {
    // Add to DOM to make it connected
    document.body.appendChild(element);
  } else {
    // Override isConnected property for disconnected test
    Object.defineProperty(element, 'isConnected', {
      value: false,
      writable: false
    });
  }
  return element;
};

const originalQuerySelector = document.querySelector;

beforeAll(() => {
  document.querySelector = jest.fn();
});

afterAll(() => {
  document.querySelector = originalQuerySelector;
});

describe('Validation Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (document.querySelector as jest.Mock).mockReturnValue(createMockElement());
  });

  describe('ValidationError', () => {
    it('should create error with message', () => {
      const error = new ValidationError('Test error');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ValidationError');
      expect(error.field).toBeUndefined();
    });

    it('should create error with field information', () => {
      const error = new ValidationError('Test error', 'test.field');
      
      expect(error.message).toBe('Test error');
      expect(error.field).toBe('test.field');
    });
  });

  describe('validateSelector', () => {
    it('should validate correct CSS selectors', () => {
      const validSelectors = [
        '#test-id',
        '.test-class',
        'div',
        '[data-test]',
        'div.class#id',
        '.parent .child',
        '#container > .item:nth-child(2n+1)'
      ];

      validSelectors.forEach(selector => {
        expect(() => validateSelector(selector)).not.toThrow();
      });
    });

    it('should throw for empty or null selector', () => {
      expect(() => validateSelector('')).toThrow(ValidationError);
      expect(() => validateSelector(null as any)).toThrow(ValidationError);
      expect(() => validateSelector(undefined as any)).toThrow(ValidationError);
    });

    it('should throw for non-string selector', () => {
      expect(() => validateSelector(123 as any)).toThrow(ValidationError);
      expect(() => validateSelector({} as any)).toThrow(ValidationError);
      expect(() => validateSelector([] as any)).toThrow(ValidationError);
    });

    it('should throw for whitespace-only selector', () => {
      expect(() => validateSelector('   ')).toThrow(ValidationError);
      expect(() => validateSelector('\t\n')).toThrow(ValidationError);
    });

    it('should throw for invalid CSS selector syntax', () => {
      // Mock querySelector to throw for invalid selectors
      (document.querySelector as jest.Mock).mockImplementation((selector) => {
        if (selector === 'invalid>>selector') {
          throw new Error('Invalid selector');
        }
        return mockElement;
      });

      expect(() => validateSelector('invalid>>selector')).toThrow(ValidationError);
      expect(() => validateSelector('invalid>>selector')).toThrow('Invalid CSS selector');
    });
  });

  describe('validateTargetElement', () => {
    it('should validate connected HTML element', () => {
      const element = createMockElement();
      expect(() => validateTargetElement(element, '#test')).not.toThrow();
    });

    it('should throw for null element', () => {
      expect(() => validateTargetElement(null, '#test')).toThrow(ValidationError);
      expect(() => validateTargetElement(null, '#test')).toThrow('Element not found');
    });

    it('should throw for disconnected element', () => {
      const disconnectedElement = createMockElement(false);
      
      expect(() => validateTargetElement(disconnectedElement, '#test'))
        .toThrow(ValidationError);
      expect(() => validateTargetElement(disconnectedElement, '#test'))
        .toThrow('not connected to the DOM');
    });

    it('should throw for non-HTML element', () => {
      const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      document.body.appendChild(svgElement); // Make it connected
      
      expect(() => validateTargetElement(svgElement as any, '#test'))
        .toThrow(ValidationError);
      expect(() => validateTargetElement(svgElement as any, '#test'))
        .toThrow('must be an HTMLElement');
    });
  });

  describe('validateConfiguration', () => {
    it('should validate default configuration', () => {
      expect(() => validateConfiguration(DEFAULT_CONFIG)).not.toThrow();
      expect(() => validateConfiguration({})).not.toThrow();
    });

    it('should throw for non-object configuration', () => {
      expect(() => validateConfiguration(null as any)).toThrow(ValidationError);
      expect(() => validateConfiguration('string' as any)).toThrow(ValidationError);
      expect(() => validateConfiguration(123 as any)).toThrow(ValidationError);
    });

    describe('queryHandling validation', () => {
      it('should validate correct queryHandling config', () => {
        expect(() => validateConfiguration({
          queryHandling: {
            minLength: 2,
            debounceMs: 300,
            triggerOn: 'change',
            caseSensitive: false,
            matchMode: 'partial'
          }
        })).not.toThrow();
      });

      it('should throw for negative minLength', () => {
        expect(() => validateConfiguration({
          queryHandling: {
            ...DEFAULT_CONFIG.queryHandling,
            minLength: -1
          }
        })).toThrow(ValidationError);
      });

      it('should throw for negative debounceMs', () => {
        expect(() => validateConfiguration({
          queryHandling: {
            ...DEFAULT_CONFIG.queryHandling,
            debounceMs: -100
          }
        })).toThrow(ValidationError);
      });

      it('should throw for invalid triggerOn type', () => {
        expect(() => validateConfiguration({
          queryHandling: {
            ...DEFAULT_CONFIG.queryHandling,
            triggerOn: 'input' as any
          }
        })).toThrow(ValidationError);
      });

      it('should throw for invalid matchMode', () => {
        expect(() => validateConfiguration({
          queryHandling: {
            ...DEFAULT_CONFIG.queryHandling,
            matchMode: 'invalid' as any
          }
        })).toThrow(ValidationError);
      });
    });

    describe('ui validation', () => {
      it('should validate correct ui config', () => {
        expect(() => validateConfiguration({
          ui: {
            maxResults: 10,
            placeholder: 'Search here',
            loadingText: 'Loading...',
            noResultsText: 'No results',
            theme: 'dark',
            rtl: true
          }
        })).not.toThrow();
      });

      it('should throw for invalid maxResults range', () => {
        expect(() => validateConfiguration({
          ui: {
            ...DEFAULT_CONFIG.ui,
            maxResults: 0
          }
        })).toThrow(ValidationError);

        expect(() => validateConfiguration({
          ui: {
            ...DEFAULT_CONFIG.ui,
            maxResults: 1001
          }
        })).toThrow(ValidationError);
      });

      it('should throw for too long placeholder', () => {
        expect(() => validateConfiguration({
          ui: {
            ...DEFAULT_CONFIG.ui,
            placeholder: 'x'.repeat(201)
          }
        })).toThrow(ValidationError);
      });
    });

    describe('dataSource validation', () => {
      it('should validate correct dataSource configs', () => {
        const validConfigs = [
          { dataSource: { type: 'memory' } },
          { dataSource: { type: 'api', url: 'https://api.example.com' } },
          { dataSource: { type: 'sql' } },
          { dataSource: { type: 'dom' } }
        ];

        validConfigs.forEach(config => {
          expect(() => validateConfiguration(config)).not.toThrow();
        });
      });

      it('should throw for invalid dataSource type', () => {
        expect(() => validateConfiguration({
          dataSource: {
            type: 'invalid' as any
          }
        })).toThrow(ValidationError);
      });

      it('should throw for non-string API url', () => {
        expect(() => validateConfiguration({
          dataSource: {
            type: 'api',
            url: 123 as any
          }
        })).toThrow(ValidationError);
      });
    });

    it('should include field information in error messages', () => {
      try {
        validateConfiguration({
          queryHandling: {
            ...DEFAULT_CONFIG.queryHandling,
            minLength: -1
          }
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).field).toBe('queryHandling.minLength');
      }
    });
  });

  describe('sanitizeQuery', () => {
    it('should trim whitespace from valid strings', () => {
      expect(sanitizeQuery('  test query  ')).toBe('test query');
      expect(sanitizeQuery('\t\n hello \r\n')).toBe('hello');
      expect(sanitizeQuery('no-trim-needed')).toBe('no-trim-needed');
    });

    it('should return empty string for non-string input', () => {
      expect(sanitizeQuery(null as any)).toBe('');
      expect(sanitizeQuery(undefined as any)).toBe('');
      expect(sanitizeQuery(123 as any)).toBe('');
      expect(sanitizeQuery({} as any)).toBe('');
      expect(sanitizeQuery([] as any)).toBe('');
    });

    it('should handle empty and whitespace strings', () => {
      expect(sanitizeQuery('')).toBe('');
      expect(sanitizeQuery('   ')).toBe('');
      expect(sanitizeQuery('\t\n\r')).toBe('');
    });
  });

  describe('isValidQuery', () => {
    it('should validate queries meeting minimum length', () => {
      expect(isValidQuery('ab', 2)).toBe(true);
      expect(isValidQuery('abc', 2)).toBe(true);
      expect(isValidQuery('test query', 5)).toBe(true);
    });

    it('should reject queries below minimum length', () => {
      expect(isValidQuery('a', 2)).toBe(false);
      expect(isValidQuery('ab', 3)).toBe(false);
      expect(isValidQuery('', 1)).toBe(false);
    });

    it('should trim query before validation', () => {
      expect(isValidQuery('  ab  ', 2)).toBe(true);
      expect(isValidQuery('  a  ', 2)).toBe(false);
      expect(isValidQuery('   ', 1)).toBe(false);
    });

    it('should handle non-string queries', () => {
      expect(isValidQuery(null as any, 2)).toBe(false);
      expect(isValidQuery(undefined as any, 2)).toBe(false);
      expect(isValidQuery(123 as any, 2)).toBe(false);
    });

    it('should handle zero minimum length', () => {
      expect(isValidQuery('', 0)).toBe(true); // Empty string length 0 >= 0
      expect(isValidQuery('a', 0)).toBe(true); // Length 1 >= 0
      expect(isValidQuery('   ', 0)).toBe(true); // Trims to empty string, length 0 >= 0
    });
  });
});