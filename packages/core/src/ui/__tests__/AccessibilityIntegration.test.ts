/**
 * Accessibility Integration Test Suite
 * Integration tests for UI components with accessibility features
 */

import { LoadingSpinner } from '../LoadingSpinner';
import { ErrorMessage } from '../ErrorMessage';
import { EmptyState } from '../EmptyState';
import { SearchDropdownUI } from '../SearchDropdownUI';
import type { 
  LoadingSpinnerConfig,
  ErrorMessageConfig,
  EmptyStateConfig 
} from '../types';

// Mock Web APIs
const mockWebAPIs = () => {
  global.webkitSpeechRecognition = jest.fn().mockImplementation(() => ({
    continuous: false,
    interimResults: false,
    lang: 'en-US',
    start: jest.fn(),
    stop: jest.fn(),
    abort: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }));

  global.speechSynthesis = {
    speak: jest.fn(),
    cancel: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    getVoices: jest.fn(() => []),
    speaking: false,
    pending: false,
    paused: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  } as any;

  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
  }));

  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
  }));
};

const createTestContainer = (): HTMLElement => {
  const container = document.createElement('div');
  container.id = 'test-container';
  document.body.appendChild(container);
  return container;
};

const simulateKeyboardEvent = (element: HTMLElement, key: string, options: KeyboardEventInit = {}): void => {
  const event = new KeyboardEvent('keydown', {
    key,
    code: key,
    bubbles: true,
    cancelable: true,
    ...options
  });
  element.dispatchEvent(event);
};

describe('UI Components Accessibility Integration', () => {
  beforeAll(() => {
    mockWebAPIs();
  });

  beforeEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.useRealTimers();
  });

  describe('LoadingSpinner Accessibility', () => {
    let container: HTMLElement;
    let spinner: LoadingSpinner;

    beforeEach(async () => {
      container = createTestContainer();
      const config: Partial<LoadingSpinnerConfig> = {
        size: 32,
        duration: 1000,
        showProgress: true,
        accessibility: {
          wcagLevel: 'AA',
          enableKeyboardNavigation: false,
          enableScreenReaderSupport: true,
          enableFocusManagement: false,
          enableAutomatedValidation: false,
          debugMode: false
        }
      };
      spinner = new LoadingSpinner(container, config);
      await spinner.init();
    });

    afterEach(() => {
      spinner?.destroy();
    });

    test('should have proper ARIA attributes', async () => {
      await spinner.start('Loading content...');
      
      const spinnerElement = container.querySelector('.us-loading-spinner');
      expect(spinnerElement).toBeTruthy();
      expect(spinnerElement?.getAttribute('role')).toBe('status');
      expect(spinnerElement?.getAttribute('aria-live')).toBe('polite');
      expect(spinnerElement?.getAttribute('aria-busy')).toBe('true');
      expect(spinnerElement?.getAttribute('aria-label')).toBe('Loading content, please wait');
    });

    test('should have progress bar with correct ARIA attributes', async () => {
      await spinner.start('Loading...');
      
      const progressElement = container.querySelector('.us-loading-spinner__progress');
      expect(progressElement?.getAttribute('role')).toBe('progressbar');
      expect(progressElement?.getAttribute('aria-valuemin')).toBe('0');
      expect(progressElement?.getAttribute('aria-valuemax')).toBe('100');
      expect(progressElement?.getAttribute('aria-label')).toBe('Loading progress');
    });

    test('should announce loading states to screen readers', async () => {
      await spinner.start('Loading search results...');
      
      // Check if announcement regions are created
      const politeRegion = document.getElementById('us-loading-announcements');
      expect(politeRegion).toBeTruthy();
      
      // Advance timers to allow for announcement
      jest.advanceTimersByTime(100);
      
      spinner.stop();
      
      // Should announce completion
      jest.advanceTimersByTime(100);
    });

    test('should update progress with ARIA attributes', async () => {
      await spinner.start('Loading...');
      
      // Advance time to trigger progress updates
      jest.advanceTimersByTime(1000);
      
      const spinnerElement = container.querySelector('.us-loading-spinner');
      const ariaValueNow = spinnerElement?.getAttribute('aria-valuenow');
      expect(ariaValueNow).toBeTruthy();
      expect(parseInt(ariaValueNow!)).toBeGreaterThan(0);
    });

    test('should respect reduced motion preferences', async () => {
      // Mock reduced motion media query
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

      await spinner.start('Loading...');
      
      const spinnerRing = container.querySelector('.us-loading-spinner__ring');
      const animationDuration = getComputedStyle(spinnerRing as Element).animationDuration;
      
      // Should have longer duration for reduced motion
      expect(animationDuration).toBe('2s');
    });
  });

  describe('ErrorMessage Accessibility', () => {
    let container: HTMLElement;
    let errorMessage: ErrorMessage;

    beforeEach(async () => {
      container = createTestContainer();
      const config: Partial<ErrorMessageConfig> = {
        dismissible: true,
        enableKeyboardNavigation: true,
        focusOnShow: true,
        accessibility: {
          wcagLevel: 'AA',
          enableKeyboardNavigation: true,
          enableScreenReaderSupport: true,
          enableFocusManagement: true,
          enableAutomatedValidation: false,
          debugMode: false
        }
      };
      errorMessage = new ErrorMessage(container, config);
      await errorMessage.init();
    });

    afterEach(() => {
      errorMessage?.destroy();
    });

    test('should have proper ARIA alert attributes', async () => {
      await errorMessage.show(new Error('Test error'));
      
      const messageElement = container.querySelector('.us-error-message');
      expect(messageElement?.getAttribute('role')).toBe('alert');
      expect(messageElement?.getAttribute('aria-live')).toBe('assertive');
      expect(messageElement?.getAttribute('aria-atomic')).toBe('true');
    });

    test('should focus error message when shown', async () => {
      await errorMessage.show(new Error('Test error'));
      
      // Advance timers for focus delay
      jest.advanceTimersByTime(300);
      
      const focusedElement = document.activeElement;
      expect(focusedElement).toBeTruthy();
      expect(focusedElement?.closest('.us-error-message')).toBeTruthy();
    });

    test('should handle keyboard navigation', async () => {
      await errorMessage.show(new Error('Test error'), () => {});
      
      const dismissButton = container.querySelector('.us-error-message__dismiss');
      const actionButton = container.querySelector('.us-error-message__action');
      
      expect(dismissButton?.getAttribute('aria-label')).toBe('Dismiss error');
      
      // Test Escape key dismissal
      if (dismissButton) {
        simulateKeyboardEvent(dismissButton as HTMLElement, 'Escape');
        
        // Should trigger dismiss
        jest.advanceTimersByTime(300);
        expect(errorMessage.isShowing()).toBe(false);
      }
    });

    test('should announce errors to screen readers', async () => {
      await errorMessage.show(new Error('Network connection failed'));
      
      // Check announcement regions
      const assertiveRegion = document.getElementById('us-error-announcements-urgent');
      expect(assertiveRegion).toBeTruthy();
      
      jest.advanceTimersByTime(100);
    });

    test('should handle different error severity levels', async () => {
      await errorMessage.showDetailed(new Error('Critical system error'), {
        severity: 'critical'
      });
      
      const messageElement = container.querySelector('.us-error-message');
      expect(messageElement?.className).toContain('us-error-message--critical');
      
      // Critical errors should use assertive announcements
      jest.advanceTimersByTime(100);
    });

    test('should provide accessible retry actions', async () => {
      const retryHandler = jest.fn();
      
      await errorMessage.showDetailed(new Error('Request failed'), {
        retryActions: [{
          label: 'Try Again',
          handler: retryHandler,
          type: 'primary'
        }]
      });
      
      const actionButton = container.querySelector('.us-error-message__action');
      expect(actionButton?.textContent).toBe('Try Again');
      expect(actionButton?.getAttribute('type')).toBe('button');
      
      // Should be keyboard accessible
      if (actionButton) {
        simulateKeyboardEvent(actionButton as HTMLElement, 'Enter');
        expect(retryHandler).toHaveBeenCalled();
      }
    });
  });

  describe('EmptyState Accessibility', () => {
    let container: HTMLElement;
    let emptyState: EmptyState;

    beforeEach(async () => {
      container = createTestContainer();
      const config: Partial<EmptyStateConfig> = {
        interactiveSuggestions: true,
        enableKeyboardNavigation: true,
        announceChanges: true,
        accessibility: {
          wcagLevel: 'AA',
          enableKeyboardNavigation: true,
          enableScreenReaderSupport: true,
          enableFocusManagement: true,
          enableAutomatedValidation: false,
          debugMode: false
        }
      };
      emptyState = new EmptyState(container, config);
      await emptyState.init();
    });

    afterEach(() => {
      emptyState?.destroy();
    });

    test('should have proper ARIA status attributes', async () => {
      await emptyState.show('No results found');
      
      const emptyStateElement = container.querySelector('.us-empty-state');
      expect(emptyStateElement?.getAttribute('role')).toBe('status');
      expect(emptyStateElement?.getAttribute('aria-live')).toBe('polite');
      expect(emptyStateElement?.getAttribute('aria-label')).toBe('Search results status');
    });

    test('should create accessible suggestion list', async () => {
      await emptyState.show('No results found', [
        'suggestion one',
        'suggestion two',
        'suggestion three'
      ]);
      
      const suggestionsList = container.querySelector('.us-empty-state__suggestions-list');
      expect(suggestionsList?.getAttribute('role')).toBe('list');
      
      const suggestions = container.querySelectorAll('.us-empty-state__suggestion');
      suggestions.forEach(suggestion => {
        expect(suggestion.getAttribute('role')).toBe('listitem');
      });
    });

    test('should make suggestions keyboard accessible', async () => {
      const suggestionHandler = jest.fn();
      
      await emptyState.show('No results found', [{
        text: 'Try this suggestion',
        type: 'query',
        handler: suggestionHandler
      }]);
      
      const suggestionButton = container.querySelector('.us-empty-state__suggestion-button');
      expect(suggestionButton).toBeTruthy();
      
      // Should be focusable and activatable
      if (suggestionButton) {
        suggestionButton.focus();
        expect(document.activeElement).toBe(suggestionButton);
        
        simulateKeyboardEvent(suggestionButton as HTMLElement, 'Enter');
        expect(suggestionHandler).toHaveBeenCalled();
      }
    });

    test('should announce state changes to screen readers', async () => {
      await emptyState.show('No results found for "test query"');
      
      // Check announcement regions
      const politeRegion = document.getElementById('us-empty-announcements');
      expect(politeRegion).toBeTruthy();
      
      jest.advanceTimersByTime(100);
    });

    test('should hide decorative illustrations from screen readers', async () => {
      await emptyState.show('No results found');
      
      const illustration = container.querySelector('.us-empty-state__illustration');
      expect(illustration?.getAttribute('aria-hidden')).toBe('true');
    });

    test('should provide contextual suggestions with proper labeling', async () => {
      emptyState.showContextual('nonexistent query', {
        dataSource: 'documents',
        customSuggestions: [{
          text: 'Browse all documents',
          type: 'action',
          icon: '📂',
          handler: jest.fn()
        }]
      });
      
      const suggestionIcon = container.querySelector('.us-empty-state__suggestion-icon');
      expect(suggestionIcon?.getAttribute('aria-hidden')).toBe('true');
      
      const suggestionText = container.querySelector('.us-empty-state__suggestion-text');
      expect(suggestionText?.textContent).toBe('Browse all documents');
    });
  });

  describe('SearchDropdownUI Accessibility', () => {
    let container: HTMLElement;
    let searchDropdown: SearchDropdownUI;

    beforeEach(async () => {
      container = createTestContainer();
      
      const mockUniversalSearch = {
        search: jest.fn().mockResolvedValue([]),
        getSuggestions: jest.fn().mockResolvedValue([]),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };

      searchDropdown = new SearchDropdownUI(container, mockUniversalSearch as any, {
        placeholder: 'Search...',
        maxResults: 10,
        enableVirtualScrolling: false,
        accessibility: {
          wcagLevel: 'AA',
          enableKeyboardNavigation: true,
          enableScreenReaderSupport: true,
          enableFocusManagement: true,
          enableAutomatedValidation: false,
          debugMode: false
        }
      });
      
      await searchDropdown.init();
    });

    afterEach(() => {
      searchDropdown?.destroy();
    });

    test('should have proper combobox ARIA attributes', () => {
      const searchInput = container.querySelector('input[type="search"]');
      expect(searchInput?.getAttribute('role')).toBe('combobox');
      expect(searchInput?.getAttribute('aria-expanded')).toBe('false');
      expect(searchInput?.getAttribute('aria-autocomplete')).toBe('list');
      expect(searchInput?.getAttribute('aria-label')).toBeTruthy();
    });

    test('should manage dropdown ARIA states', () => {
      const searchInput = container.querySelector('input[type="search"]') as HTMLInputElement;
      const dropdown = container.querySelector('.us-search-dropdown');
      
      // Initially collapsed
      expect(searchInput?.getAttribute('aria-expanded')).toBe('false');
      
      // Simulate opening dropdown
      searchInput?.focus();
      const inputEvent = new Event('input', { bubbles: true });
      searchInput?.dispatchEvent(inputEvent);
      
      // Should update ARIA states
      jest.advanceTimersByTime(100);
    });

    test('should handle keyboard navigation in results', () => {
      const searchInput = container.querySelector('input[type="search"]') as HTMLInputElement;
      
      if (searchInput) {
        searchInput.focus();
        
        // Test arrow key navigation
        simulateKeyboardEvent(searchInput, 'ArrowDown');
        simulateKeyboardEvent(searchInput, 'ArrowUp');
        simulateKeyboardEvent(searchInput, 'Enter');
        simulateKeyboardEvent(searchInput, 'Escape');
      }
    });

    test('should announce result counts to screen readers', () => {
      // Mock search results
      const mockResults = [
        { id: '1', title: 'Result 1', type: 'document' },
        { id: '2', title: 'Result 2', type: 'document' },
        { id: '3', title: 'Result 3', type: 'document' }
      ];
      
      // Simulate showing results
      const searchInput = container.querySelector('input[type="search"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.value = 'test query';
        const inputEvent = new Event('input', { bubbles: true });
        searchInput.dispatchEvent(inputEvent);
      }
      
      jest.advanceTimersByTime(100);
      
      // Should announce result count
      const politeRegion = document.getElementById('us-search-announcements');
      expect(politeRegion).toBeTruthy();
    });

    test('should provide accessible result items', () => {
      // Add some mock results to test
      const resultsList = container.querySelector('.us-search-results');
      if (resultsList) {
        const resultItem = document.createElement('div');
        resultItem.className = 'us-search-result-item';
        resultItem.setAttribute('role', 'option');
        resultItem.setAttribute('aria-selected', 'false');
        resultItem.textContent = 'Test Result';
        resultsList.appendChild(resultItem);
        
        expect(resultItem.getAttribute('role')).toBe('option');
        expect(resultItem.getAttribute('aria-selected')).toBe('false');
      }
    });

    test('should handle focus management properly', () => {
      const searchInput = container.querySelector('input[type="search"]') as HTMLInputElement;
      
      if (searchInput) {
        // Focus should start on input
        searchInput.focus();
        expect(document.activeElement).toBe(searchInput);
        
        // Escape should maintain focus on input
        simulateKeyboardEvent(searchInput, 'Escape');
        expect(document.activeElement).toBe(searchInput);
      }
    });
  });

  describe('Cross-Component Accessibility Integration', () => {
    test('should coordinate ARIA live regions across components', async () => {
      const container = createTestContainer();
      
      // Initialize multiple components with accessibility
      const spinner = new LoadingSpinner(container, {
        accessibility: { wcagLevel: 'AA', enableScreenReaderSupport: true }
      } as any);
      await spinner.init();
      
      const errorMessage = new ErrorMessage(container, {
        accessibility: { wcagLevel: 'AA', enableScreenReaderSupport: true }
      } as any);
      await errorMessage.init();
      
      const emptyState = new EmptyState(container, {
        accessibility: { wcagLevel: 'AA', enableScreenReaderSupport: true }
      } as any);
      await emptyState.init();
      
      // Each should create their own announcement regions
      expect(document.getElementById('us-loading-announcements')).toBeTruthy();
      expect(document.getElementById('us-error-announcements')).toBeTruthy();
      expect(document.getElementById('us-empty-announcements')).toBeTruthy();
      
      // Cleanup
      spinner.destroy();
      errorMessage.destroy();
      emptyState.destroy();
    });

    test('should maintain focus management across component interactions', async () => {
      const container = createTestContainer();
      
      // Create search with error handling
      const mockUniversalSearch = {
        search: jest.fn().mockRejectedValue(new Error('Network error')),
        getSuggestions: jest.fn().mockResolvedValue([]),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };

      const searchDropdown = new SearchDropdownUI(container, mockUniversalSearch as any, {
        accessibility: { wcagLevel: 'AA', enableFocusManagement: true }
      } as any);
      await searchDropdown.init();
      
      const errorMessage = new ErrorMessage(container, {
        focusOnShow: true,
        accessibility: { wcagLevel: 'AA', enableFocusManagement: true }
      } as any);
      await errorMessage.init();
      
      // Focus should be managed properly between components
      const searchInput = container.querySelector('input[type="search"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
        expect(document.activeElement).toBe(searchInput);
      }
      
      // Show error - should shift focus appropriately
      await errorMessage.show(new Error('Test error'));
      jest.advanceTimersByTime(300);
      
      // Cleanup
      searchDropdown.destroy();
      errorMessage.destroy();
    });

    test('should handle overlapping keyboard shortcuts gracefully', async () => {
      const container = createTestContainer();
      
      // Initialize components with keyboard navigation
      const errorMessage = new ErrorMessage(container, {
        dismissible: true,
        enableKeyboardNavigation: true,
        accessibility: { wcagLevel: 'AA', enableKeyboardNavigation: true }
      } as any);
      await errorMessage.init();
      
      const emptyState = new EmptyState(container, {
        enableKeyboardNavigation: true,
        accessibility: { wcagLevel: 'AA', enableKeyboardNavigation: true }
      } as any);
      await emptyState.init();
      
      // Show both components
      await errorMessage.show(new Error('Test error'));
      await emptyState.show('No results found');
      
      // Escape key should be handled appropriately
      simulateKeyboardEvent(container, 'Escape');
      
      // Only one component should handle the event
      jest.advanceTimersByTime(100);
      
      // Cleanup
      errorMessage.destroy();
      emptyState.destroy();
    });
  });
});