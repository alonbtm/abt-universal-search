/**
 * EmptyState Test Suite
 * Comprehensive unit and integration tests for empty state component
 */

import { EmptyState } from '../EmptyState';
import type { EmptyStateConfig, EmptyStateSuggestion } from '../EmptyState';

// Mock DOM environment
const createMockContainer = (): HTMLElement => {
  const container = document.createElement('div');
  container.id = 'empty-state-test-container';
  document.body.appendChild(container);
  return container;
};

const defaultConfig: Partial<EmptyStateConfig> = {
  showSuggestions: true,
  maxSuggestions: 5,
  showIcon: true,
  defaultIcon: '🔍',
  showSearchTips: true
};

describe('EmptyState', () => {
  let container: HTMLElement;
  let emptyState: EmptyState;

  beforeEach(() => {
    // Setup fresh DOM
    document.body.innerHTML = '';
    container = createMockContainer();
    
    emptyState = new EmptyState(container, defaultConfig);
  });

  afterEach(() => {
    emptyState?.destroy();
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with valid container', () => {
      expect(emptyState).toBeInstanceOf(EmptyState);
      expect(emptyState.isVisible()).toBe(false);
    });

    test('should throw error with invalid container', () => {
      expect(() => {
        new EmptyState(null as any, defaultConfig);
      }).toThrow('Container must be a valid HTMLElement');
    });

    test('should apply default configuration', () => {
      emptyState.init();
      
      const emptyStateElement = container.querySelector('.us-empty-state');
      expect(emptyStateElement).toBeTruthy();
    });
  });

  describe('DOM Structure', () => {
    beforeEach(() => {
      emptyState.init();
    });

    test('should create required DOM elements', () => {
      emptyState.showDefault();
      
      expect(container.querySelector('.us-empty-state')).toBeTruthy();
      expect(container.querySelector('.us-empty-state__icon')).toBeTruthy();
      expect(container.querySelector('.us-empty-state__message')).toBeTruthy();
    });

    test('should show icon when configured', () => {
      emptyState.showDefault();
      
      const iconElement = container.querySelector('.us-empty-state__icon');
      expect(iconElement).toBeTruthy();
      expect(iconElement?.textContent).toBe('🔍');
    });

    test('should hide icon when disabled', () => {
      const noIconEmptyState = new EmptyState(container, {
        ...defaultConfig,
        showIcon: false
      });
      
      noIconEmptyState.init();
      noIconEmptyState.showDefault();
      
      const iconElement = container.querySelector('.us-empty-state__icon');
      expect(iconElement).toBeFalsy();
      
      noIconEmptyState.destroy();
    });

    test('should show suggestions when configured', () => {
      emptyState.show('No results found', [
        { text: 'Try a different search term', action: () => {} },
        { text: 'Check your spelling', action: () => {} }
      ]);
      
      const suggestionsElement = container.querySelector('.us-empty-state__suggestions');
      const suggestionItems = container.querySelectorAll('.us-empty-state__suggestion-item');
      
      expect(suggestionsElement).toBeTruthy();
      expect(suggestionItems).toHaveLength(2);
    });

    test('should apply proper ARIA attributes', () => {
      emptyState.showDefault();
      
      const emptyStateElement = container.querySelector('.us-empty-state');
      expect(emptyStateElement?.getAttribute('role')).toBe('status');
      expect(emptyStateElement?.getAttribute('aria-live')).toBe('polite');
    });
  });

  describe('Default Empty State', () => {
    beforeEach(() => {
      emptyState.init();
    });

    test('should show default message', () => {
      emptyState.showDefault();
      
      expect(emptyState.isVisible()).toBe(true);
      
      const messageElement = container.querySelector('.us-empty-state__message');
      expect(messageElement?.textContent).toContain('No results found');
    });

    test('should show default suggestions', () => {
      emptyState.showDefault();
      
      const suggestionItems = container.querySelectorAll('.us-empty-state__suggestion-item');
      expect(suggestionItems.length).toBeGreaterThan(0);
    });

    test('should hide empty state', () => {
      emptyState.showDefault();
      expect(emptyState.isVisible()).toBe(true);
      
      emptyState.hide();
      expect(emptyState.isVisible()).toBe(false);
    });
  });

  describe('Custom Empty State', () => {
    beforeEach(() => {
      emptyState.init();
    });

    test('should show custom message', () => {
      emptyState.show('Custom empty message');
      
      const messageElement = container.querySelector('.us-empty-state__message');
      expect(messageElement?.textContent).toBe('Custom empty message');
    });

    test('should show custom suggestions', () => {
      const customSuggestions: EmptyStateSuggestion[] = [
        { text: 'Custom suggestion 1', action: jest.fn() },
        { text: 'Custom suggestion 2', action: jest.fn() }
      ];
      
      emptyState.show('Custom message', customSuggestions);
      
      const suggestionItems = container.querySelectorAll('.us-empty-state__suggestion-item');
      expect(suggestionItems).toHaveLength(2);
      expect(suggestionItems[0].textContent).toBe('Custom suggestion 1');
      expect(suggestionItems[1].textContent).toBe('Custom suggestion 2');
    });

    test('should limit suggestions based on maxSuggestions config', () => {
      const limitedEmptyState = new EmptyState(container, {
        ...defaultConfig,
        maxSuggestions: 2
      });
      
      const manySuggestions: EmptyStateSuggestion[] = [
        { text: 'Suggestion 1', action: jest.fn() },
        { text: 'Suggestion 2', action: jest.fn() },
        { text: 'Suggestion 3', action: jest.fn() },
        { text: 'Suggestion 4', action: jest.fn() }
      ];
      
      limitedEmptyState.init();
      limitedEmptyState.show('Limited suggestions', manySuggestions);
      
      const suggestionItems = container.querySelectorAll('.us-empty-state__suggestion-item');
      expect(suggestionItems).toHaveLength(2);
      
      limitedEmptyState.destroy();
    });
  });

  describe('Contextual Empty State', () => {
    beforeEach(() => {
      emptyState.init();
    });

    test('should generate contextual message for search query', () => {
      emptyState.showContextual('javascript tutorials', {
        dataSource: 'documentation'
      });
      
      const messageElement = container.querySelector('.us-empty-state__message');
      expect(messageElement?.textContent).toContain('javascript tutorials');
    });

    test('should generate contextual suggestions for programming query', () => {
      emptyState.showContextual('react hooks', {
        category: 'programming'
      });
      
      const suggestionItems = container.querySelectorAll('.us-empty-state__suggestion-item');
      expect(suggestionItems.length).toBeGreaterThan(0);
      
      // Should contain relevant programming suggestions
      const suggestionTexts = Array.from(suggestionItems).map(item => item.textContent);
      const hasProgrammingSuggestion = suggestionTexts.some(text => 
        text?.includes('code') || text?.includes('syntax') || text?.includes('example')
      );
      expect(hasProgrammingSuggestion).toBe(true);
    });

    test('should generate contextual suggestions for file query', () => {
      emptyState.showContextual('config.json', {
        dataSource: 'files'
      });
      
      const suggestionItems = container.querySelectorAll('.us-empty-state__suggestion-item');
      const suggestionTexts = Array.from(suggestionItems).map(item => item.textContent);
      
      const hasFileSuggestion = suggestionTexts.some(text => 
        text?.includes('file') || text?.includes('extension') || text?.includes('directory')
      );
      expect(hasFileSuggestion).toBe(true);
    });

    test('should use custom message when provided', () => {
      emptyState.showContextual('test query', {
        customMessage: 'Custom contextual message'
      });
      
      const messageElement = container.querySelector('.us-empty-state__message');
      expect(messageElement?.textContent).toBe('Custom contextual message');
    });

    test('should use custom suggestions when provided', () => {
      const customSuggestions: EmptyStateSuggestion[] = [
        { text: 'Custom contextual suggestion', action: jest.fn() }
      ];
      
      emptyState.showContextual('test query', {
        customSuggestions
      });
      
      const suggestionItems = container.querySelectorAll('.us-empty-state__suggestion-item');
      expect(suggestionItems).toHaveLength(1);
      expect(suggestionItems[0].textContent).toBe('Custom contextual suggestion');
    });
  });

  describe('Search Tips', () => {
    beforeEach(() => {
      emptyState.init();
    });

    test('should show search tips when enabled', () => {
      emptyState.showDefault();
      
      const tipsElement = container.querySelector('.us-empty-state__tips');
      expect(tipsElement).toBeTruthy();
    });

    test('should hide search tips when disabled', () => {
      const noTipsEmptyState = new EmptyState(container, {
        ...defaultConfig,
        showSearchTips: false
      });
      
      noTipsEmptyState.init();
      noTipsEmptyState.showDefault();
      
      const tipsElement = container.querySelector('.us-empty-state__tips');
      expect(tipsElement).toBeFalsy();
      
      noTipsEmptyState.destroy();
    });

    test('should show relevant search tips', () => {
      emptyState.showDefault();
      
      const tipsElement = container.querySelector('.us-empty-state__tips');
      const tipItems = container.querySelectorAll('.us-empty-state__tip-item');
      
      expect(tipItems.length).toBeGreaterThan(0);
      
      // Should contain common search tips
      const tipTexts = Array.from(tipItems).map(item => item.textContent);
      const hasCommonTip = tipTexts.some(text => 
        text?.includes('keyword') || text?.includes('specific') || text?.includes('spell')
      );
      expect(hasCommonTip).toBe(true);
    });
  });

  describe('Event System', () => {
    beforeEach(() => {
      emptyState.init();
    });

    test('should emit suggestion-select event on suggestion click', () => {
      let selectedSuggestion: string | null = null;
      
      emptyState.on('suggestion-select', (suggestion) => {
        selectedSuggestion = suggestion;
      });
      
      const suggestions: EmptyStateSuggestion[] = [
        { text: 'Try broader terms', action: jest.fn() }
      ];
      
      emptyState.show('Test message', suggestions);
      
      const suggestionItem = container.querySelector('.us-empty-state__suggestion-item') as HTMLElement;
      suggestionItem.click();
      
      expect(selectedSuggestion).toBe('Try broader terms');
    });

    test('should execute suggestion action on click', () => {
      const suggestionAction = jest.fn();
      
      const suggestions: EmptyStateSuggestion[] = [
        { text: 'Action suggestion', action: suggestionAction }
      ];
      
      emptyState.show('Action test', suggestions);
      
      const suggestionItem = container.querySelector('.us-empty-state__suggestion-item') as HTMLElement;
      suggestionItem.click();
      
      expect(suggestionAction).toHaveBeenCalled();
    });

    test('should emit show and hide events', () => {
      let showEventFired = false;
      let hideEventFired = false;
      
      emptyState.on('show', () => {
        showEventFired = true;
      });
      
      emptyState.on('hide', () => {
        hideEventFired = true;
      });
      
      emptyState.showDefault();
      expect(showEventFired).toBe(true);
      
      emptyState.hide();
      expect(hideEventFired).toBe(true);
    });

    test('should handle event listener cleanup', () => {
      const handler = jest.fn();
      emptyState.on('show', handler);
      emptyState.off('show', handler);
      
      emptyState.showDefault();
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      emptyState.init();
    });

    test('should have proper ARIA attributes', () => {
      emptyState.showDefault();
      
      const emptyStateElement = container.querySelector('.us-empty-state');
      
      expect(emptyStateElement?.getAttribute('role')).toBe('status');
      expect(emptyStateElement?.getAttribute('aria-live')).toBe('polite');
    });

    test('should have accessible suggestion buttons', () => {
      const suggestions: EmptyStateSuggestion[] = [
        { text: 'Accessible suggestion', action: jest.fn() }
      ];
      
      emptyState.show('Accessibility test', suggestions);
      
      const suggestionItem = container.querySelector('.us-empty-state__suggestion-item') as HTMLElement;
      
      expect(suggestionItem.getAttribute('role')).toBe('button');
      expect(suggestionItem.getAttribute('tabindex')).toBe('0');
    });

    test('should support keyboard navigation', () => {
      const suggestionAction = jest.fn();
      const suggestions: EmptyStateSuggestion[] = [
        { text: 'Keyboard suggestion', action: suggestionAction }
      ];
      
      emptyState.show('Keyboard test', suggestions);
      
      const suggestionItem = container.querySelector('.us-empty-state__suggestion-item') as HTMLElement;
      
      // Should be focusable
      suggestionItem.focus();
      expect(document.activeElement).toBe(suggestionItem);
      
      // Should respond to Enter key
      suggestionItem.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(suggestionAction).toHaveBeenCalled();
      
      // Should respond to Space key
      suggestionAction.mockClear();
      suggestionItem.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
      expect(suggestionAction).toHaveBeenCalled();
    });

    test('should provide screen reader descriptions', () => {
      emptyState.showDefault();
      
      const messageElement = container.querySelector('.us-empty-state__message');
      expect(messageElement?.getAttribute('aria-describedby')).toBeTruthy();
    });
  });

  describe('Styling and Theming', () => {
    beforeEach(() => {
      emptyState.init();
    });

    test('should apply base CSS classes', () => {
      emptyState.showDefault();
      
      const emptyStateElement = container.querySelector('.us-empty-state');
      expect(emptyStateElement?.classList.contains('us-empty-state')).toBe(true);
    });

    test('should use custom icon when provided', () => {
      const customIconEmptyState = new EmptyState(container, {
        ...defaultConfig,
        defaultIcon: '📁'
      });
      
      customIconEmptyState.init();
      customIconEmptyState.showDefault();
      
      const iconElement = container.querySelector('.us-empty-state__icon');
      expect(iconElement?.textContent).toBe('📁');
      
      customIconEmptyState.destroy();
    });

    test('should support different empty state variants', () => {
      // Test different contextual variants
      emptyState.showContextual('test', { dataSource: 'files' });
      let emptyStateElement = container.querySelector('.us-empty-state');
      expect(emptyStateElement?.classList.contains('us-empty-state--files')).toBe(true);
      
      emptyState.showContextual('test', { category: 'programming' });
      emptyStateElement = container.querySelector('.us-empty-state');
      expect(emptyStateElement?.classList.contains('us-empty-state--programming')).toBe(true);
    });
  });

  describe('Suggestion Generation', () => {
    beforeEach(() => {
      emptyState.init();
    });

    test('should generate query-specific suggestions', () => {
      emptyState.showContextual('very long specific query that should not match anything');
      
      const suggestionItems = container.querySelectorAll('.us-empty-state__suggestion-item');
      const suggestionTexts = Array.from(suggestionItems).map(item => item.textContent);
      
      // Should suggest simplification for long queries
      const hasSimplificationSuggestion = suggestionTexts.some(text => 
        text?.includes('simpler') || text?.includes('fewer') || text?.includes('keywords')
      );
      expect(hasSimplificationSuggestion).toBe(true);
    });

    test('should generate file extension suggestions for file queries', () => {
      emptyState.showContextual('document.pdf', { dataSource: 'files' });
      
      const suggestionItems = container.querySelectorAll('.us-empty-state__suggestion-item');
      const suggestionTexts = Array.from(suggestionItems).map(item => item.textContent);
      
      const hasFileExtensionSuggestion = suggestionTexts.some(text => 
        text?.includes('extension') || text?.includes('without')
      );
      expect(hasFileExtensionSuggestion).toBe(true);
    });

    test('should generate spelling suggestions for potential typos', () => {
      emptyState.showContextual('javascrpit'); // intentional typo
      
      const suggestionItems = container.querySelectorAll('.us-empty-state__suggestion-item');
      const suggestionTexts = Array.from(suggestionItems).map(item => item.textContent);
      
      const hasSpellingSuggestion = suggestionTexts.some(text => 
        text?.includes('spelling') || text?.includes('typo')
      );
      expect(hasSpellingSuggestion).toBe(true);
    });
  });

  describe('Resource Management', () => {
    test('should cleanup resources on destroy', () => {
      emptyState.init();
      emptyState.showDefault();
      
      const emptyStateElement = container.querySelector('.us-empty-state');
      expect(emptyStateElement).toBeTruthy();
      
      emptyState.destroy();
      
      const cleanedEmptyState = container.querySelector('.us-empty-state');
      expect(cleanedEmptyState).toBeFalsy();
    });

    test('should handle multiple destroy calls safely', () => {
      emptyState.init();
      emptyState.showDefault();
      
      expect(() => {
        emptyState.destroy();
        emptyState.destroy(); // Second call should not throw
      }).not.toThrow();
    });

    test('should cleanup event listeners on destroy', () => {
      const handler = jest.fn();
      emptyState.on('show', handler);
      
      emptyState.destroy();
      emptyState.showDefault(); // This should not trigger the handler
      
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty suggestions array', () => {
      emptyState.init();
      
      expect(() => {
        emptyState.show('Test message', []);
      }).not.toThrow();
      
      const suggestionItems = container.querySelectorAll('.us-empty-state__suggestion-item');
      expect(suggestionItems).toHaveLength(0);
    });

    test('should handle null suggestions', () => {
      emptyState.init();
      
      expect(() => {
        emptyState.show('Test message', null as any);
      }).not.toThrow();
    });

    test('should handle empty query in contextual display', () => {
      emptyState.init();
      
      expect(() => {
        emptyState.showContextual('');
      }).not.toThrow();
      
      expect(emptyState.isVisible()).toBe(true);
    });

    test('should handle show without init', () => {
      expect(() => {
        emptyState.showDefault();
      }).not.toThrow();
      
      expect(emptyState.isVisible()).toBe(true);
    });

    test('should handle hide when not visible', () => {
      emptyState.init();
      
      expect(() => {
        emptyState.hide();
      }).not.toThrow();
    });

    test('should handle multiple show calls', () => {
      emptyState.init();
      
      emptyState.show('First message');
      emptyState.show('Second message');
      
      const messageElement = container.querySelector('.us-empty-state__message');
      expect(messageElement?.textContent).toBe('Second message');
    });
  });

  describe('Performance', () => {
    test('should handle large suggestion sets efficiently', () => {
      const largeSuggestionSet: EmptyStateSuggestion[] = Array.from({ length: 100 }, (_, i) => ({
        text: `Suggestion ${i}`,
        action: jest.fn()
      }));

      const startTime = performance.now();
      emptyState.init();
      emptyState.show('Performance test', largeSuggestionSet);
      const endTime = performance.now();
      
      // Should render within reasonable time (less than 50ms)
      expect(endTime - startTime).toBeLessThan(50);
      
      // Should respect maxSuggestions limit
      const suggestionItems = container.querySelectorAll('.us-empty-state__suggestion-item');
      expect(suggestionItems.length).toBeLessThanOrEqual(5); // default maxSuggestions
    });
  });
});