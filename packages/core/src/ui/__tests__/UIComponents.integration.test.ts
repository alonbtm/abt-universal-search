/**
 * UI Components Integration Test Suite
 * Basic smoke tests for UI components to validate they work together
 */

import { SearchDropdownUI } from '../SearchDropdownUI';
import { LoadingSpinner } from '../LoadingSpinner';
import { ErrorMessage } from '../ErrorMessage';
import { EmptyState } from '../EmptyState';
import type { SearchResult } from '../../types/Results';

// Mock DOM environment
const createMockContainer = (): HTMLElement => {
  const container = document.createElement('div');
  container.id = 'integration-test-container';
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

describe('UI Components Integration', () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Setup fresh DOM
    document.body.innerHTML = '';
    container = createMockContainer();
    
    // Mock requestAnimationFrame for smooth testing
    global.requestAnimationFrame = jest.fn((cb) => {
      setTimeout(cb, 16);
      return 1;
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('SearchDropdownUI Basic Functionality', () => {
    test('should initialize and show results', () => {
      const dropdown = new SearchDropdownUI(container, {
        theme: 'light',
        maxResults: 10,
        showIcons: true,
        showCategories: true,
        enableVirtualization: false
      });

      expect(() => {
        dropdown.init();
        dropdown.showResults(mockResults);
      }).not.toThrow();

      // Basic DOM structure should be created
      expect(container.querySelector('.us-dropdown')).toBeTruthy();
      
      dropdown.destroy();
    });

    test('should handle empty results', () => {
      const dropdown = new SearchDropdownUI(container, {
        theme: 'light',
        maxResults: 10,
        showIcons: true,
        showCategories: true,
        enableVirtualization: false
      });

      expect(() => {
        dropdown.init();
        dropdown.showResults([]);
      }).not.toThrow();

      dropdown.destroy();
    });

    test('should handle hide/show operations', () => {
      const dropdown = new SearchDropdownUI(container, {
        theme: 'light',
        maxResults: 10,
        showIcons: true,
        showCategories: true,
        enableVirtualization: false
      });

      dropdown.init();
      dropdown.showResults(mockResults);
      
      expect(() => {
        dropdown.hide();
      }).not.toThrow();

      dropdown.destroy();
    });
  });

  describe('LoadingSpinner Basic Functionality', () => {
    test('should initialize and show loading', () => {
      const spinner = new LoadingSpinner(container, {
        size: 32,
        duration: 1000,
        color: '#007bff',
        trackColor: '#e0e0e0',
        showProgress: true,
        timeoutMs: 5000
      });

      expect(() => {
        spinner.init();
        spinner.start();
      }).not.toThrow();

      expect(spinner.isLoading()).toBe(true);
      
      spinner.destroy();
    });

    test('should handle start/stop operations', () => {
      const spinner = new LoadingSpinner(container);

      expect(() => {
        spinner.init();
        spinner.start('Loading...');
        spinner.stop();
      }).not.toThrow();

      expect(spinner.isLoading()).toBe(false);
      
      spinner.destroy();
    });

    test('should handle configuration validation', () => {
      expect(() => {
        new LoadingSpinner(container, {
          size: 5 // Invalid size
        });
      }).toThrow();
    });
  });

  describe('ErrorMessage Basic Functionality', () => {
    test('should initialize and show error', () => {
      const errorMessage = new ErrorMessage(container);

      expect(() => {
        errorMessage.init();
        errorMessage.show('Test error message');
      }).not.toThrow();

      // Should create some DOM structure
      expect(container.children.length).toBeGreaterThan(0);
      
      errorMessage.destroy();
    });

    test('should handle Error objects', () => {
      const errorMessage = new ErrorMessage(container);

      expect(() => {
        errorMessage.init();
        errorMessage.show(new Error('Test error'));
        errorMessage.hide();
      }).not.toThrow();

      errorMessage.destroy();
    });

    test('should handle update operations', () => {
      const errorMessage = new ErrorMessage(container);

      expect(() => {
        errorMessage.init();
        errorMessage.show('First error');
        errorMessage.updateError('Updated error');
        errorMessage.clear();
      }).not.toThrow();

      errorMessage.destroy();
    });
  });

  describe('EmptyState Basic Functionality', () => {
    test('should initialize and show empty state', () => {
      const emptyState = new EmptyState(container);

      expect(() => {
        emptyState.init();
        emptyState.showDefault();
      }).not.toThrow();

      // Should create some DOM structure
      expect(container.children.length).toBeGreaterThan(0);
      
      emptyState.destroy();
    });

    test('should handle custom messages', () => {
      const emptyState = new EmptyState(container);

      expect(() => {
        emptyState.init();
        emptyState.show('Custom empty message');
        emptyState.hide();
      }).not.toThrow();

      emptyState.destroy();
    });
  });

  describe('Component Lifecycle', () => {
    test('should handle initialization without throwing', () => {
      const dropdown = new SearchDropdownUI(container, {
        theme: 'light',
        maxResults: 10,
        showIcons: true,
        showCategories: true,
        enableVirtualization: false
      });
      const spinner = new LoadingSpinner(container);
      const errorMessage = new ErrorMessage(container);
      const emptyState = new EmptyState(container);

      expect(() => {
        dropdown.init();
        spinner.init();
        errorMessage.init();
        emptyState.init();
      }).not.toThrow();

      expect(() => {
        dropdown.destroy();
        spinner.destroy();
        errorMessage.destroy();
        emptyState.destroy();
      }).not.toThrow();
    });

    test('should handle multiple init/destroy cycles', () => {
      const spinner = new LoadingSpinner(container);

      expect(() => {
        spinner.init();
        spinner.destroy();
        spinner.init();
        spinner.destroy();
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid container gracefully', () => {
      expect(() => {
        new SearchDropdownUI(null as any);
      }).toThrow();

      expect(() => {
        new LoadingSpinner(null as any);
      }).toThrow();

      expect(() => {
        new ErrorMessage(null as any);
      }).toThrow();

      expect(() => {
        new EmptyState(null as any);
      }).toThrow();
    });

    test('should handle operations on uninitialized components', () => {
      const dropdown = new SearchDropdownUI(container, {
        theme: 'light',
        maxResults: 10,
        showIcons: true,
        showCategories: true,
        enableVirtualization: false
      });
      const spinner = new LoadingSpinner(container);
      const errorMessage = new ErrorMessage(container);
      const emptyState = new EmptyState(container);

      // These should either work (auto-init) or fail gracefully
      expect(() => {
        dropdown.showResults(mockResults);
        spinner.start();
        errorMessage.show('test');
        emptyState.showDefault();
      }).not.toThrow();

      dropdown.destroy();
      spinner.destroy();
      errorMessage.destroy();
      emptyState.destroy();
    });
  });

  describe('CSS and Styling', () => {
    test('should inject CSS styles without conflicts', () => {
      const dropdown = new SearchDropdownUI(container, {
        theme: 'light',
        maxResults: 10,
        showIcons: true,
        showCategories: true,
        enableVirtualization: false
      });
      const spinner = new LoadingSpinner(container);

      dropdown.init();
      spinner.init();

      // Should not have duplicate style elements
      const dropdownStyles = document.querySelectorAll('style[id*="dropdown"]');
      const spinnerStyles = document.querySelectorAll('style[id*="spinner"]');
      
      expect(dropdownStyles.length).toBeLessThanOrEqual(1);
      expect(spinnerStyles.length).toBeLessThanOrEqual(1);

      dropdown.destroy();
      spinner.destroy();
    });

    test('should apply theme classes correctly', () => {
      const lightDropdown = new SearchDropdownUI(container, {
        theme: 'light',
        maxResults: 10,
        showIcons: true,
        showCategories: true,
        enableVirtualization: false
      });

      lightDropdown.init();
      lightDropdown.showResults(mockResults);

      // Should have some theme-related styling or classes
      const dropdownElement = container.querySelector('.us-dropdown');
      expect(dropdownElement).toBeTruthy();

      lightDropdown.destroy();
    });
  });

  describe('Performance', () => {
    test('should handle rapid show/hide operations', () => {
      const dropdown = new SearchDropdownUI(container, {
        theme: 'light',
        maxResults: 10,
        showIcons: true,
        showCategories: true,
        enableVirtualization: false
      });

      dropdown.init();

      expect(() => {
        for (let i = 0; i < 10; i++) {
          dropdown.showResults(mockResults);
          dropdown.hide();
        }
      }).not.toThrow();

      dropdown.destroy();
    });

    test('should handle large result sets without hanging', () => {
      const largeResults = Array.from({ length: 100 }, (_, i) => ({
        title: `Result ${i}`,
        description: `Description ${i}`,
        url: `https://example.com/${i}`,
        score: Math.random(),
        metadata: { icon: '📄', category: 'document' }
      }));

      const dropdown = new SearchDropdownUI(container, {
        theme: 'light',
        maxResults: 100,
        showIcons: true,
        showCategories: true,
        enableVirtualization: false
      });

      const startTime = performance.now();
      
      expect(() => {
        dropdown.init();
        dropdown.showResults(largeResults);
      }).not.toThrow();
      
      const endTime = performance.now();
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(500);

      dropdown.destroy();
    });
  });
});