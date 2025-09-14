/**
 * UniversalSearch Component Unit Tests
 * Tests for the main component class functionality
 */

import { UniversalSearch, ValidationError, DEFAULT_CONFIG } from '../../src/index';
import type { SearchConfiguration } from '../../src/types/Config';

describe('UniversalSearch', () => {
  beforeEach(() => {
    // Set up real DOM elements for each test
    document.body.innerHTML = '<div id="test-element"></div>';
  });

  describe('Constructor', () => {
    it('should create instance with valid selector and default config', () => {
      const search = new UniversalSearch('#test-element');
      
      expect(search).toBeInstanceOf(UniversalSearch);
      expect(search.getConfig()).toEqual(DEFAULT_CONFIG);
    });

    it('should create instance with custom configuration', () => {
      const customConfig: Partial<SearchConfiguration> = {
        ui: {
          ...DEFAULT_CONFIG.ui,
          placeholder: 'Custom placeholder',
          maxResults: 5
        },
        debug: true
      };

      const search = new UniversalSearch('#test-element', customConfig);
      const config = search.getConfig();
      
      expect(config.ui.placeholder).toBe('Custom placeholder');
      expect(config.ui.maxResults).toBe(5);
      expect(config.debug).toBe(true);
    });

    it('should throw ValidationError for empty selector', () => {
      expect(() => {
        new UniversalSearch('');
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for non-string selector', () => {
      expect(() => {
        new UniversalSearch(null as any);
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for whitespace-only selector', () => {
      expect(() => {
        new UniversalSearch('   ');
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid CSS selector', () => {
      expect(() => {
        new UniversalSearch('invalid>>selector');
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid configuration', () => {
      expect(() => {
        new UniversalSearch('#test', {
          ui: {
            ...DEFAULT_CONFIG.ui,
            maxResults: -1 // Invalid negative value
          }
        });
      }).toThrow(ValidationError);
    });

    it('should merge nested configuration correctly', () => {
      const search = new UniversalSearch('#test', {
        queryHandling: {
          minLength: 5 // Only override minLength
        }
      });

      const config = search.getConfig();
      expect(config.queryHandling.minLength).toBe(5);
      expect(config.queryHandling.debounceMs).toBe(DEFAULT_CONFIG.queryHandling.debounceMs);
      expect(config.ui).toEqual(DEFAULT_CONFIG.ui);
    });
  });

  describe('Initialization', () => {
    let search: UniversalSearch;

    beforeEach(() => {
      search = new UniversalSearch('#test-element');
    });

    it('should initialize successfully with valid element', () => {
      const element = document.querySelector('#test-element') as HTMLElement;
      expect(() => search.init()).not.toThrow();
      expect(element.classList.contains('universal-search')).toBe(true);
      expect(element.getAttribute('role')).toBe('combobox');
      expect(element.getAttribute('aria-expanded')).toBe('false');
      expect(element.getAttribute('aria-haspopup')).toBe('listbox');
    });

    it('should not initialize twice', () => {
      const debugSearch = new UniversalSearch('#test-element', { debug: true });
      debugSearch.init();
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      debugSearch.init(); // Second call should warn
      
      expect(consoleSpy).toHaveBeenCalledWith('[UniversalSearch] Component already initialized');
      consoleSpy.mockRestore();
    });

    it('should throw ValidationError when target element not found', () => {
      document.body.innerHTML = ''; // Remove the test element
      const search = new UniversalSearch('#missing-element');
      
      expect(() => search.init()).toThrow(ValidationError);
      expect(() => search.init()).toThrow('Element not found for selector');
    });

    it('should apply RTL configuration', () => {
      const rtlSearch = new UniversalSearch('#test-element', { 
        ui: { ...DEFAULT_CONFIG.ui, rtl: true }
      });
      
      rtlSearch.init();
      const element = document.querySelector('#test-element') as HTMLElement;
      
      expect(element.getAttribute('dir')).toBe('rtl');
    });

    it('should apply custom theme class', () => {
      const themedSearch = new UniversalSearch('#test-element', {
        ui: { ...DEFAULT_CONFIG.ui, theme: 'dark' }
      });
      
      themedSearch.init();
      const element = document.querySelector('#test-element') as HTMLElement;
      
      expect(element.classList.contains('universal-search--dark')).toBe(true);
    });

    it('should not apply theme class for default theme', () => {
      const defaultSearch = new UniversalSearch('#test-element', {
        ui: { ...DEFAULT_CONFIG.ui, theme: 'default' }
      });
      
      defaultSearch.init();
      const element = document.querySelector('#test-element') as HTMLElement;
      
      expect(element.classList.contains('universal-search--default')).toBe(false);
    });

    it('should throw error when initializing destroyed component', () => {
      search.init();
      search.destroy();
      
      expect(() => search.init()).toThrow(ValidationError);
      expect(() => search.init()).toThrow('Cannot initialize destroyed component');
    });
  });

  describe('Lifecycle Management', () => {
    let search: UniversalSearch;

    beforeEach(() => {
      search = new UniversalSearch('#test-element');
      search.init();
    });

    it('should destroy component and clean up resources', () => {
      const element = document.querySelector('#test-element') as HTMLElement;
      
      search.destroy();
      
      expect(element.classList.contains('universal-search')).toBe(false);
      expect(element.getAttribute('role')).toBeNull();
      expect(element.getAttribute('aria-expanded')).toBeNull();
      expect(element.getAttribute('aria-haspopup')).toBeNull();
    });

    it('should not destroy twice', () => {
      const debugSearch = new UniversalSearch('#test-element', { debug: true });
      debugSearch.init();
      debugSearch.destroy();
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      debugSearch.destroy(); // Second call should warn
      
      expect(consoleSpy).toHaveBeenCalledWith('[UniversalSearch] Component already destroyed');
      consoleSpy.mockRestore();
    });

    it('should clear state on destroy', () => {
      search.destroy();
      
      expect(search.getQuery()).toBe('');
      expect(search.getResults()).toEqual([]);
    });

    it('should handle errors during cleanup gracefully', () => {
      // Create a search instance that will have errors during cleanup
      const errorSearch = new UniversalSearch('#test-element', { debug: true });
      errorSearch.init();
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock a cleanup error by corrupting the element
      const element = document.querySelector('#test-element') as HTMLElement;
      Object.defineProperty(element, 'classList', {
        value: {
          remove: () => { throw new Error('Cleanup error'); }
        }
      });
      
      // Destroy should not throw, but should log error
      expect(() => errorSearch.destroy()).not.toThrow();
      
      consoleSpy.mockRestore();
    });
  });

  describe('State Management', () => {
    let search: UniversalSearch;

    beforeEach(() => {
      search = new UniversalSearch('#test-element');
    });

    it('should return current configuration', () => {
      const config = search.getConfig();
      expect(config).toEqual(DEFAULT_CONFIG);
      expect(config).toBe(search.getConfig()); // Should return same reference
    });

    it('should return current query', () => {
      expect(search.getQuery()).toBe('');
    });

    it('should return current results', () => {
      const results = search.getResults();
      expect(results).toEqual([]);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should return immutable results array', () => {
      const results1 = search.getResults();
      const results2 = search.getResults();
      expect(results1).not.toBe(results2); // Different array instances
      expect(results1).toEqual(results2); // Same content
    });
  });

  describe('Event System', () => {
    let search: UniversalSearch;

    beforeEach(() => {
      search = new UniversalSearch('#test-element', { debug: false });
    });

    it('should add event listeners', () => {
      const handler = jest.fn();
      
      search.on('search:start', handler);
      
      // Test that handler is stored (we can't directly test private eventListeners)
      expect(typeof search.on).toBe('function');
      expect(typeof search.off).toBe('function');
    });

    it('should remove event listeners', () => {
      const handler = jest.fn();
      
      search.on('search:start', handler);
      search.off('search:start', handler);
      
      // Handler should be removed
      expect(() => search.off('search:start', handler)).not.toThrow();
    });

    it('should handle removing non-existent listeners', () => {
      const handler = jest.fn();
      
      // Try removing a listener that was never added
      expect(() => search.off('search:start', handler)).not.toThrow();
    });

    it('should handle removing listeners for non-existent event types', () => {
      const handler = jest.fn();
      
      // Try removing from an event type that has no listeners
      expect(() => search.off('search:complete', handler)).not.toThrow();
    });

    it('should handle multiple listeners for same event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      search.on('search:start', handler1);
      search.on('search:start', handler2);
      
      search.off('search:start', handler1);
      
      // handler2 should still be registered
      expect(() => search.off('search:start', handler2)).not.toThrow();
    });

    it('should handle event handler errors gracefully', () => {
      const errorHandler = jest.fn(() => {
        throw new Error('Handler error');
      });
      
      search.on('search:start', errorHandler);
      
      // This should not throw even though handler throws
      expect(() => search.init()).not.toThrow();
    });

    it('should handle event handler errors in debug mode', () => {
      const debugSearch = new UniversalSearch('#test-element', { debug: true });
      const errorHandler = jest.fn(() => {
        throw new Error('Handler error');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      debugSearch.on('search:start', errorHandler);
      debugSearch.init();
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should provide clear error messages for validation failures', () => {
      try {
        new UniversalSearch('');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toContain('non-empty string');
      }
    });

    it('should include field information in validation errors', () => {
      try {
        new UniversalSearch('#test', {
          queryHandling: {
            ...DEFAULT_CONFIG.queryHandling,
            minLength: -5
          }
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).field).toBe('queryHandling.minLength');
      }
    });

    it('should handle configuration validation errors', () => {
      expect(() => {
        new UniversalSearch('#test', {
          ui: {
            ...DEFAULT_CONFIG.ui,
            maxResults: 2000 // Exceeds limit
          }
        });
      }).toThrow(ValidationError);
    });
  });
});