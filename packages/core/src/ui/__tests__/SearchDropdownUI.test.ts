/**
 * SearchDropdownUI Test Suite
 * Comprehensive unit, integration, and accessibility tests
 */

import { SearchDropdownUI } from '../SearchDropdownUI';
import type { SearchResult } from '../../types/Results';
import type { UIConfig } from '../../types/Config';

// Mock DOM environment
const createMockContainer = (): HTMLElement => {
  const container = document.createElement('div');
  container.id = 'test-container';
  document.body.appendChild(container);
  return container;
};

const mockResults: SearchResult[] = [
  {
    title: 'Test Result 1',
    description: 'First test result',
    url: 'https://example.com/1',
    score: 0.9,
    metadata: { icon: '📄', category: 'document' }
  },
  {
    title: 'Test Result 2', 
    description: 'Second test result',
    url: 'https://example.com/2',
    score: 0.8,
    metadata: { icon: '🌐', category: 'web' }
  }
];

const defaultConfig: UIConfig = {
  theme: 'light',
  maxResults: 10,
  showIcons: true,
  showCategories: true,
  enableVirtualization: false
};

describe('SearchDropdownUI', () => {
  let container: HTMLElement;
  let dropdown: SearchDropdownUI;

  beforeEach(() => {
    // Setup fresh DOM
    document.body.innerHTML = '';
    container = createMockContainer();
    
    // Mock requestAnimationFrame
    global.requestAnimationFrame = jest.fn((cb) => {
      setTimeout(cb, 16);
      return 1;
    });
    
    dropdown = new SearchDropdownUI(container, defaultConfig);
  });

  afterEach(() => {
    dropdown?.destroy();
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with valid container', () => {
      expect(dropdown).toBeInstanceOf(SearchDropdownUI);
      expect(dropdown.isVisible()).toBe(false);
    });

    test('should throw error with invalid container', () => {
      expect(() => {
        new SearchDropdownUI(null as any, defaultConfig);
      }).toThrow('Container must be a valid HTMLElement');
    });

    test('should apply default configuration', () => {
      dropdown.init();
      
      const dropdownElement = container.querySelector('.us-dropdown');
      expect(dropdownElement).toBeTruthy();
      expect(dropdownElement?.getAttribute('data-theme')).toBe('light');
    });

    test('should create required DOM structure', () => {
      dropdown.init();
      
      expect(container.querySelector('.us-dropdown')).toBeTruthy();
      expect(container.querySelector('.us-dropdown__content')).toBeTruthy();
      expect(container.querySelector('.us-dropdown__results')).toBeTruthy();
    });
  });

  describe('Results Display', () => {
    beforeEach(() => {
      dropdown.init();
    });

    test('should show results correctly', () => {
      dropdown.showResults(mockResults);
      
      expect(dropdown.isVisible()).toBe(true);
      
      const resultItems = container.querySelectorAll('.us-dropdown__result');
      expect(resultItems).toHaveLength(2);
    });

    test('should render result content correctly', () => {
      dropdown.showResults(mockResults);
      
      const firstResult = container.querySelector('.us-dropdown__result');
      const title = firstResult?.querySelector('.us-dropdown__result-title');
      const subtitle = firstResult?.querySelector('.us-dropdown__result-subtitle');
      const icon = firstResult?.querySelector('.us-dropdown__result-icon');
      
      expect(title?.textContent).toBe('Test Result 1');
      expect(subtitle?.textContent).toBe('First test result');
      expect(icon?.textContent).toBe('📄');
    });

    test('should handle empty results', () => {
      dropdown.showResults([]);
      
      expect(dropdown.isVisible()).toBe(true);
      const emptyState = container.querySelector('.us-dropdown__state-container');
      expect(emptyState).toBeTruthy();
    });

    test('should limit results based on maxResults config', () => {
      const limitedDropdown = new SearchDropdownUI(container, {
        ...defaultConfig,
        maxResults: 1
      });
      limitedDropdown.init();
      limitedDropdown.showResults(mockResults);
      
      const resultItems = container.querySelectorAll('.us-dropdown__result');
      expect(resultItems).toHaveLength(1);
      
      limitedDropdown.destroy();
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      dropdown.init();
      dropdown.showResults(mockResults);
    });

    test('should handle ArrowDown navigation', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      const handled = dropdown.handleKeyboardNavigation(event);
      
      expect(handled).toBe(true);
      
      const selectedResult = container.querySelector('.us-dropdown__result--selected');
      expect(selectedResult).toBeTruthy();
    });

    test('should handle ArrowUp navigation', () => {
      // First navigate down to select first item
      dropdown.handleKeyboardNavigation(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      dropdown.handleKeyboardNavigation(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      
      // Then navigate up
      const handled = dropdown.handleKeyboardNavigation(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      expect(handled).toBe(true);
    });

    test('should handle Enter key selection', () => {
      let selectedResult: SearchResult | null = null;
      dropdown.on('result-select', (result) => {
        selectedResult = result;
      });

      // Navigate to first result and select
      dropdown.handleKeyboardNavigation(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      dropdown.handleKeyboardNavigation(new KeyboardEvent('keydown', { key: 'Enter' }));
      
      expect(selectedResult).toEqual(mockResults[0]);
    });

    test('should handle Escape key', () => {
      const handled = dropdown.handleKeyboardNavigation(new KeyboardEvent('keydown', { key: 'Escape' }));
      
      expect(handled).toBe(true);
      expect(dropdown.isVisible()).toBe(false);
    });

    test('should not handle unrelated keys', () => {
      const handled = dropdown.handleKeyboardNavigation(new KeyboardEvent('keydown', { key: 'Tab' }));
      expect(handled).toBe(false);
    });
  });

  describe('Loading States', () => {
    beforeEach(() => {
      dropdown.init();
    });

    test('should show loading state', () => {
      dropdown.showLoading('Searching...');
      
      expect(dropdown.isVisible()).toBe(true);
      const loadingSpinner = container.querySelector('.us-loading-spinner');
      expect(loadingSpinner).toBeTruthy();
    });

    test('should hide loading state', () => {
      dropdown.showLoading('Searching...');
      dropdown.hideLoading();
      
      const loadingSpinner = container.querySelector('.us-loading-spinner--visible');
      expect(loadingSpinner).toBeFalsy();
    });
  });

  describe('Error States', () => {
    beforeEach(() => {
      dropdown.init();
    });

    test('should show error message', () => {
      const error = new Error('Network error');
      dropdown.showError(error);
      
      expect(dropdown.isVisible()).toBe(true);
      const errorContainer = container.querySelector('.us-error-message');
      expect(errorContainer).toBeTruthy();
    });

    test('should emit retry action', () => {
      let retryTriggered = false;
      dropdown.on('retry-action', () => {
        retryTriggered = true;
      });

      dropdown.showError(new Error('Test error'));
      
      const retryButton = container.querySelector('.us-error-message__action');
      retryButton?.dispatchEvent(new MouseEvent('click'));
      
      expect(retryTriggered).toBe(true);
    });
  });

  describe('Positioning', () => {
    beforeEach(() => {
      dropdown.init();
      
      // Mock getBoundingClientRect for positioning
      Element.prototype.getBoundingClientRect = jest.fn(() => ({
        top: 100,
        left: 50,
        bottom: 120,
        right: 200,
        width: 150,
        height: 20,
        x: 50,
        y: 100,
        toJSON: () => {}
      }));
    });

    test('should position dropdown below input', () => {
      dropdown.showResults(mockResults);
      
      const dropdownElement = container.querySelector('.us-dropdown') as HTMLElement;
      expect(dropdownElement?.style.top).toBeTruthy();
      expect(dropdownElement?.style.left).toBeTruthy();
    });

    test('should adjust position for viewport constraints', () => {
      // Mock window size
      Object.defineProperty(window, 'innerHeight', { 
        writable: true, 
        configurable: true, 
        value: 500 
      });

      dropdown.showResults(mockResults);
      
      const dropdownElement = container.querySelector('.us-dropdown') as HTMLElement;
      expect(dropdownElement?.style.maxHeight).toBeTruthy();
    });
  });

  describe('Animations', () => {
    beforeEach(() => {
      dropdown.init();
    });

    test('should apply entrance animation', (done) => {
      dropdown.showResults(mockResults);
      
      setTimeout(() => {
        const dropdownElement = container.querySelector('.us-dropdown');
        expect(dropdownElement?.getAttribute('data-animation')).toBe('enter');
        done();
      }, 50);
    });

    test('should respect reduced motion preference', () => {
      // Mock prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      const reducedMotionDropdown = new SearchDropdownUI(container, {
        ...defaultConfig,
        animations: { ...defaultConfig.animations, enabled: false }
      });
      
      reducedMotionDropdown.init();
      reducedMotionDropdown.showResults(mockResults);
      
      // Should show immediately without animation
      expect(reducedMotionDropdown.isVisible()).toBe(true);
      
      reducedMotionDropdown.destroy();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      dropdown.init();
      dropdown.showResults(mockResults);
    });

    test('should have proper ARIA attributes', () => {
      const dropdownElement = container.querySelector('.us-dropdown');
      const resultsList = container.querySelector('.us-dropdown__results');
      
      expect(dropdownElement?.getAttribute('role')).toBe('listbox');
      expect(resultsList?.getAttribute('role')).toBe('list');
      expect(dropdownElement?.getAttribute('aria-expanded')).toBe('true');
    });

    test('should mark selected result with ARIA', () => {
      dropdown.handleKeyboardNavigation(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      
      const selectedResult = container.querySelector('.us-dropdown__result--selected');
      expect(selectedResult?.getAttribute('aria-selected')).toBe('true');
    });

    test('should provide screen reader labels', () => {
      const results = container.querySelectorAll('.us-dropdown__result');
      results.forEach(result => {
        expect(result.getAttribute('role')).toBe('option');
      });
    });

    test('should handle focus management', () => {
      const dropdownElement = container.querySelector('.us-dropdown') as HTMLElement;
      dropdownElement.focus();
      
      expect(document.activeElement).toBe(dropdownElement);
    });
  });

  describe('Event System', () => {
    beforeEach(() => {
      dropdown.init();
    });

    test('should emit dropdown-open event', () => {
      let openEventFired = false;
      dropdown.on('dropdown-open', () => {
        openEventFired = true;
      });

      dropdown.showResults(mockResults);
      expect(openEventFired).toBe(true);
    });

    test('should emit dropdown-close event', () => {
      let closeEventFired = false;
      dropdown.on('dropdown-close', () => {
        closeEventFired = true;
      });

      dropdown.showResults(mockResults);
      dropdown.hide();
      
      expect(closeEventFired).toBe(true);
    });

    test('should emit result-select event with correct data', () => {
      let selectedResult: SearchResult | null = null;
      let selectedIndex: number = -1;
      
      dropdown.on('result-select', (result, index) => {
        selectedResult = result;
        selectedIndex = index;
      });

      dropdown.showResults(mockResults);
      
      // Click on first result
      const firstResult = container.querySelector('.us-dropdown__result-content') as HTMLElement;
      firstResult.click();
      
      expect(selectedResult).toEqual(mockResults[0]);
      expect(selectedIndex).toBe(0);
    });

    test('should handle event listener cleanup', () => {
      const handler = jest.fn();
      dropdown.on('dropdown-open', handler);
      dropdown.off('dropdown-open', handler);
      
      dropdown.showResults(mockResults);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Theming', () => {
    test('should apply light theme', () => {
      const lightDropdown = new SearchDropdownUI(container, {
        ...defaultConfig,
        theme: 'light'
      });
      
      lightDropdown.init();
      
      const dropdownElement = container.querySelector('.us-dropdown');
      expect(dropdownElement?.getAttribute('data-theme')).toBe('light');
      
      lightDropdown.destroy();
    });

    test('should apply dark theme', () => {
      const darkDropdown = new SearchDropdownUI(container, {
        ...defaultConfig,
        theme: 'dark'
      });
      
      darkDropdown.init();
      
      const dropdownElement = container.querySelector('.us-dropdown');
      expect(dropdownElement?.getAttribute('data-theme')).toBe('dark');
      
      darkDropdown.destroy();
    });
  });

  describe('Performance', () => {
    test('should handle large result sets efficiently', () => {
      const largeResultSet = Array.from({ length: 1000 }, (_, i) => ({
        title: `Result ${i}`,
        description: `Description ${i}`,
        url: `https://example.com/${i}`,
        score: Math.random(),
        metadata: { icon: '📄', category: 'document' }
      }));

      const startTime = performance.now();
      dropdown.init();
      dropdown.showResults(largeResultSet);
      const endTime = performance.now();
      
      // Should render within reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });

    test('should properly cleanup resources on destroy', () => {
      dropdown.init();
      dropdown.showResults(mockResults);
      
      const dropdownElement = container.querySelector('.us-dropdown');
      expect(dropdownElement).toBeTruthy();
      
      dropdown.destroy();
      
      const cleanedDropdown = container.querySelector('.us-dropdown');
      expect(cleanedDropdown).toBeFalsy();
    });
  });

  describe('Error Handling', () => {
    test('should handle DOM manipulation errors gracefully', () => {
      // Mock DOM error
      const originalAppendChild = Element.prototype.appendChild;
      Element.prototype.appendChild = jest.fn(() => {
        throw new Error('DOM error');
      });

      expect(() => {
        dropdown.init();
      }).toThrow('Failed to initialize SearchDropdownUI');

      // Restore original method
      Element.prototype.appendChild = originalAppendChild;
    });

    test('should validate configuration parameters', () => {
      expect(() => {
        new SearchDropdownUI(container, {
          ...defaultConfig,
          maxResults: -1
        });
      }).toThrow();
    });
  });
});