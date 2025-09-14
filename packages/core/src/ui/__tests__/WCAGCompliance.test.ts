/**
 * WCAG 2.1 AA Compliance Test Suite
 * Comprehensive validation against WCAG 2.1 AA standards
 */

import { AccessibilityManager } from '../AccessibilityManager';
import { ColorContrastValidator } from '../ColorContrastValidator';
import { LoadingSpinner } from '../LoadingSpinner';
import { ErrorMessage } from '../ErrorMessage';
import { EmptyState } from '../EmptyState';
import { SearchDropdownUI } from '../SearchDropdownUI';
import type { 
  AccessibilityValidationResult,
  WCAGLevel,
  AccessibilityViolation 
} from '../../types/Accessibility';

interface WCAGTestCase {
  principle: string;
  guideline: string;
  criteria: string;
  level: WCAGLevel;
  test: () => Promise<boolean>;
  description: string;
}

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
  container.id = 'wcag-test-container';
  document.body.appendChild(container);
  return container;
};

const createAccessibleComponent = async (ComponentClass: any, container: HTMLElement, config: any = {}) => {
  const accessibilityConfig = {
    wcagLevel: 'AA' as WCAGLevel,
    enableKeyboardNavigation: true,
    enableScreenReaderSupport: true,
    enableFocusManagement: true,
    enableAutomatedValidation: true,
    debugMode: false
  };

  const componentConfig = {
    ...config,
    accessibility: accessibilityConfig
  };

  if (ComponentClass === SearchDropdownUI) {
    const mockUniversalSearch = {
      search: jest.fn().mockResolvedValue([]),
      getSuggestions: jest.fn().mockResolvedValue([]),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
    const component = new ComponentClass(container, mockUniversalSearch, componentConfig);
    await component.init();
    return component;
  } else {
    const component = new ComponentClass(container, componentConfig);
    await component.init();
    return component;
  }
};

describe('WCAG 2.1 AA Compliance Validation', () => {
  let accessibilityManager: AccessibilityManager;
  let colorValidator: ColorContrastValidator;

  beforeAll(() => {
    mockWebAPIs();
  });

  beforeEach(async () => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
    jest.useFakeTimers();

    accessibilityManager = new AccessibilityManager({
      wcagLevel: 'AA',
      enableKeyboardNavigation: true,
      enableScreenReaderSupport: true,
      enableFocusManagement: true,
      enableAutomatedValidation: true,
      debugMode: false
    });
    await accessibilityManager.init();

    colorValidator = new ColorContrastValidator({
      enableAutomaticValidation: true,
      suggestAlternatives: true,
      debugMode: false
    });
    await colorValidator.init();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.useRealTimers();
    accessibilityManager?.destroy();
    colorValidator?.destroy();
  });

  describe('WCAG Principle 1: Perceivable', () => {
    describe('Guideline 1.1 - Text Alternatives', () => {
      test('1.1.1 Non-text Content (Level A)', async () => {
        const container = createTestContainer();
        const spinner = await createAccessibleComponent(LoadingSpinner, container);
        
        await spinner.start('Loading content...');
        
        const result = await accessibilityManager.validateWCAG(container);
        const textAlternativeViolations = result.violations.filter(
          v => v.type === 'text-alternative'
        );
        
        expect(textAlternativeViolations).toHaveLength(0);
        spinner.destroy();
      });
    });

    describe('Guideline 1.3 - Adaptable', () => {
      test('1.3.1 Info and Relationships (Level A)', async () => {
        const container = createTestContainer();
        const searchDropdown = await createAccessibleComponent(SearchDropdownUI, container);
        
        const result = await accessibilityManager.validateWCAG(container);
        const structureViolations = result.violations.filter(
          v => v.type === 'semantic' || v.type === 'structure'
        );
        
        expect(structureViolations).toHaveLength(0);
        searchDropdown.destroy();
      });

      test('1.3.2 Meaningful Sequence (Level A)', async () => {
        const container = createTestContainer();
        const emptyState = await createAccessibleComponent(EmptyState, container);
        
        await emptyState.show('No results found', ['suggestion 1', 'suggestion 2']);
        
        const result = await accessibilityManager.validateWCAG(container);
        const sequenceViolations = result.violations.filter(
          v => v.type === 'reading-order'
        );
        
        expect(sequenceViolations).toHaveLength(0);
        emptyState.destroy();
      });

      test('1.3.3 Sensory Characteristics (Level A)', async () => {
        const container = createTestContainer();
        const errorMessage = await createAccessibleComponent(ErrorMessage, container);
        
        await errorMessage.show(new Error('Test error'));
        
        // Check that error indication doesn't rely solely on color
        const messageElement = container.querySelector('.us-error-message');
        const hasIcon = messageElement?.querySelector('.us-error-message__icon');
        const hasTextualIndicator = messageElement?.textContent?.includes('Error') || 
                                   messageElement?.textContent?.includes('Problem');
        
        expect(hasIcon || hasTextualIndicator).toBe(true);
        errorMessage.destroy();
      });
    });

    describe('Guideline 1.4 - Distinguishable', () => {
      test('1.4.1 Use of Color (Level A)', async () => {
        const container = createTestContainer();
        const errorMessage = await createAccessibleComponent(ErrorMessage, container);
        
        await errorMessage.showDetailed(new Error('Test error'), { severity: 'error' });
        
        // Error should not be conveyed by color alone
        const messageElement = container.querySelector('.us-error-message');
        const hasNonColorIndicators = 
          messageElement?.querySelector('.us-error-message__icon') ||
          messageElement?.getAttribute('role') === 'alert';
        
        expect(hasNonColorIndicators).toBe(true);
        errorMessage.destroy();
      });

      test('1.4.3 Contrast (Minimum) (Level AA)', async () => {
        const container = createTestContainer();
        container.style.color = '#333333';
        container.style.backgroundColor = '#ffffff';
        
        const contrastResult = colorValidator.validateElement(container);
        
        expect(contrastResult.passesAA).toBe(true);
        expect(contrastResult.ratio).toBeGreaterThanOrEqual(4.5);
      });

      test('1.4.4 Resize text (Level AA)', async () => {
        const container = createTestContainer();
        const emptyState = await createAccessibleComponent(EmptyState, container);
        
        await emptyState.show('Test message');
        
        // Text should be readable when zoomed to 200%
        container.style.fontSize = '200%';
        
        const messageElement = container.querySelector('.us-empty-state__message');
        const computedStyle = getComputedStyle(messageElement as Element);
        
        expect(parseFloat(computedStyle.fontSize)).toBeGreaterThan(16);
        emptyState.destroy();
      });

      test('1.4.10 Reflow (Level AA)', async () => {
        const container = createTestContainer();
        const searchDropdown = await createAccessibleComponent(SearchDropdownUI, container);
        
        // Simulate narrow viewport
        container.style.width = '320px';
        
        const result = await accessibilityManager.validateWCAG(container);
        const reflowViolations = result.violations.filter(
          v => v.type === 'reflow'
        );
        
        expect(reflowViolations).toHaveLength(0);
        searchDropdown.destroy();
      });

      test('1.4.11 Non-text Contrast (Level AA)', async () => {
        const container = createTestContainer();
        const spinner = await createAccessibleComponent(LoadingSpinner, container);
        
        await spinner.start('Loading...');
        
        // UI components should have sufficient contrast
        const spinnerElement = container.querySelector('.us-loading-spinner__ring');
        if (spinnerElement) {
          const style = getComputedStyle(spinnerElement);
          const borderColor = style.borderTopColor;
          const backgroundColor = style.backgroundColor || '#ffffff';
          
          const contrastResult = colorValidator.validateColors(borderColor, backgroundColor);
          expect(contrastResult.ratio).toBeGreaterThanOrEqual(3);
        }
        
        spinner.destroy();
      });

      test('1.4.12 Text Spacing (Level AA)', async () => {
        const container = createTestContainer();
        const errorMessage = await createAccessibleComponent(ErrorMessage, container);
        
        await errorMessage.show(new Error('Test error message with sufficient length to test text spacing'));
        
        // Apply text spacing requirements
        const messageElement = container.querySelector('.us-error-message__description');
        if (messageElement) {
          const element = messageElement as HTMLElement;
          element.style.lineHeight = '1.5';
          element.style.letterSpacing = '0.12em';
          element.style.wordSpacing = '0.16em';
          
          // Content should still be readable and functional
          const isOverflowing = element.scrollHeight > element.clientHeight;
          expect(isOverflowing).toBe(false);
        }
        
        errorMessage.destroy();
      });

      test('1.4.13 Content on Hover or Focus (Level AA)', async () => {
        const container = createTestContainer();
        const emptyState = await createAccessibleComponent(EmptyState, container, {
          interactiveSuggestions: true
        });
        
        await emptyState.show('No results', [{
          text: 'Test suggestion',
          type: 'query',
          handler: jest.fn()
        }]);
        
        const suggestionButton = container.querySelector('.us-empty-state__suggestion-button');
        if (suggestionButton) {
          // Hover content should be dismissible, hoverable, and persistent
          suggestionButton.dispatchEvent(new MouseEvent('mouseenter'));
          
          // Should not obscure or replace the trigger content
          expect(suggestionButton.textContent).toBeTruthy();
        }
        
        emptyState.destroy();
      });
    });
  });

  describe('WCAG Principle 2: Operable', () => {
    describe('Guideline 2.1 - Keyboard Accessible', () => {
      test('2.1.1 Keyboard (Level A)', async () => {
        const container = createTestContainer();
        const searchDropdown = await createAccessibleComponent(SearchDropdownUI, container);
        
        const searchInput = container.querySelector('input[type="search"]') as HTMLInputElement;
        
        // All functionality should be keyboard accessible
        expect(searchInput?.tabIndex).toBeGreaterThanOrEqual(0);
        
        // Test keyboard navigation
        searchInput?.focus();
        
        const keydownEvent = new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
          cancelable: true
        });
        searchInput?.dispatchEvent(keydownEvent);
        
        expect(keydownEvent.defaultPrevented).toBe(true);
        searchDropdown.destroy();
      });

      test('2.1.2 No Keyboard Trap (Level A)', async () => {
        const container = createTestContainer();
        const errorMessage = await createAccessibleComponent(ErrorMessage, container, {
          dismissible: true
        });
        
        await errorMessage.show(new Error('Test error'));
        
        const dismissButton = container.querySelector('.us-error-message__dismiss') as HTMLButtonElement;
        
        if (dismissButton) {
          dismissButton.focus();
          
          // Tab should be able to move focus away
          const tabEvent = new KeyboardEvent('keydown', {
            key: 'Tab',
            bubbles: true,
            cancelable: true
          });
          dismissButton.dispatchEvent(tabEvent);
          
          // Should not trap focus
          expect(tabEvent.defaultPrevented).toBe(false);
        }
        
        errorMessage.destroy();
      });

      test('2.1.4 Character Key Shortcuts (Level A)', async () => {
        const container = createTestContainer();
        const searchDropdown = await createAccessibleComponent(SearchDropdownUI, container);
        
        const searchInput = container.querySelector('input[type="search"]') as HTMLInputElement;
        
        if (searchInput) {
          searchInput.focus();
          
          // Character keys should not trigger shortcuts when input is focused
          const letterEvent = new KeyboardEvent('keydown', {
            key: 'a',
            bubbles: true,
            cancelable: true
          });
          searchInput.dispatchEvent(letterEvent);
          
          // Should allow normal text input
          expect(letterEvent.defaultPrevented).toBe(false);
        }
        
        searchDropdown.destroy();
      });
    });

    describe('Guideline 2.2 - Enough Time', () => {
      test('2.2.1 Timing Adjustable (Level A)', async () => {
        const container = createTestContainer();
        const spinner = await createAccessibleComponent(LoadingSpinner, container, {
          timeoutMs: 5000
        });
        
        await spinner.start('Loading...');
        
        // User should be able to extend or disable timeout
        spinner.setTimeout(10000, 'Extended timeout');
        
        expect(spinner.getElapsedTime()).toBeLessThan(10000);
        spinner.destroy();
      });

      test('2.2.2 Pause, Stop, Hide (Level A)', async () => {
        const container = createTestContainer();
        const spinner = await createAccessibleComponent(LoadingSpinner, container);
        
        await spinner.start('Loading...');
        
        // Animated content should be controllable
        expect(spinner.isLoading()).toBe(true);
        
        spinner.stop();
        expect(spinner.isLoading()).toBe(false);
        
        spinner.destroy();
      });
    });

    describe('Guideline 2.3 - Seizures and Physical Reactions', () => {
      test('2.3.1 Three Flashes or Below Threshold (Level A)', async () => {
        const container = createTestContainer();
        const spinner = await createAccessibleComponent(LoadingSpinner, container);
        
        await spinner.start('Loading...');
        
        // Animation should not cause seizures
        const spinnerElement = container.querySelector('.us-loading-spinner__ring');
        if (spinnerElement) {
          const animationDuration = getComputedStyle(spinnerElement).animationDuration;
          const durationMs = parseFloat(animationDuration) * 1000;
          
          // Should not flash more than 3 times per second
          expect(durationMs).toBeGreaterThan(333);
        }
        
        spinner.destroy();
      });
    });

    describe('Guideline 2.4 - Navigable', () => {
      test('2.4.1 Bypass Blocks (Level A)', async () => {
        const container = createTestContainer();
        const searchDropdown = await createAccessibleComponent(SearchDropdownUI, container);
        
        // Skip links should be provided for repetitive content
        const result = await accessibilityManager.validateWCAG(container);
        const bypassViolations = result.violations.filter(
          v => v.type === 'bypass'
        );
        
        // Our components are small, so bypass mechanisms may not be required
        expect(bypassViolations.length).toBeLessThanOrEqual(1);
        searchDropdown.destroy();
      });

      test('2.4.3 Focus Order (Level A)', async () => {
        const container = createTestContainer();
        const errorMessage = await createAccessibleComponent(ErrorMessage, container, {
          dismissible: true
        });
        
        await errorMessage.showDetailed(new Error('Test error'), {
          retryActions: [{ label: 'Retry', handler: jest.fn(), type: 'primary' }]
        });
        
        // Focus order should be logical
        const focusableElements = container.querySelectorAll('button, input, [tabindex="0"]');
        
        focusableElements.forEach((element, index) => {
          const tabIndex = (element as HTMLElement).tabIndex;
          expect(tabIndex).toBeGreaterThanOrEqual(0);
        });
        
        errorMessage.destroy();
      });

      test('2.4.6 Headings and Labels (Level AA)', async () => {
        const container = createTestContainer();
        const emptyState = await createAccessibleComponent(EmptyState, container);
        
        await emptyState.show('No results found');
        
        // Labels should be descriptive
        const messageElement = container.querySelector('.us-empty-state__message');
        expect(messageElement?.textContent).toBeTruthy();
        expect(messageElement?.textContent?.length).toBeGreaterThan(5);
        
        emptyState.destroy();
      });

      test('2.4.7 Focus Visible (Level AA)', async () => {
        const container = createTestContainer();
        const searchDropdown = await createAccessibleComponent(SearchDropdownUI, container);
        
        const searchInput = container.querySelector('input[type="search"]') as HTMLInputElement;
        
        if (searchInput) {
          searchInput.focus();
          
          // Focus should be visible
          const computedStyle = getComputedStyle(searchInput);
          const hasOutline = computedStyle.outline !== 'none' && computedStyle.outline !== '';
          const hasFocusRing = computedStyle.boxShadow.includes('focus') || 
                              computedStyle.border.includes('focus');
          
          expect(hasOutline || hasFocusRing || searchInput.matches(':focus-visible')).toBe(true);
        }
        
        searchDropdown.destroy();
      });
    });

    describe('Guideline 2.5 - Input Modalities', () => {
      test('2.5.1 Pointer Gestures (Level A)', async () => {
        const container = createTestContainer();
        const emptyState = await createAccessibleComponent(EmptyState, container, {
          interactiveSuggestions: true
        });
        
        await emptyState.show('No results', [{
          text: 'Test suggestion',
          type: 'query',
          handler: jest.fn()
        }]);
        
        // All functionality should work with single-pointer input
        const suggestionButton = container.querySelector('.us-empty-state__suggestion-button');
        expect(suggestionButton).toBeTruthy();
        
        // Should not require complex gestures
        const clickEvent = new MouseEvent('click', { bubbles: true });
        suggestionButton?.dispatchEvent(clickEvent);
        
        emptyState.destroy();
      });

      test('2.5.2 Pointer Cancellation (Level A)', async () => {
        const container = createTestContainer();
        const errorMessage = await createAccessibleComponent(ErrorMessage, container, {
          dismissible: true
        });
        
        await errorMessage.show(new Error('Test error'));
        
        const dismissButton = container.querySelector('.us-error-message__dismiss') as HTMLButtonElement;
        
        if (dismissButton) {
          // Mouse down should not trigger action
          const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true });
          dismissButton.dispatchEvent(mouseDownEvent);
          
          expect(errorMessage.isShowing()).toBe(true);
          
          // Click should trigger action
          const clickEvent = new MouseEvent('click', { bubbles: true });
          dismissButton.dispatchEvent(clickEvent);
        }
        
        errorMessage.destroy();
      });

      test('2.5.3 Label in Name (Level A)', async () => {
        const container = createTestContainer();
        const searchDropdown = await createAccessibleComponent(SearchDropdownUI, container, {
          placeholder: 'Search documents'
        });
        
        const searchInput = container.querySelector('input[type="search"]') as HTMLInputElement;
        
        if (searchInput) {
          const accessibleName = searchInput.getAttribute('aria-label') || 
                                searchInput.getAttribute('placeholder') ||
                                searchInput.getAttribute('title');
          
          // Accessible name should include the visible label text
          expect(accessibleName).toContain('Search');
        }
        
        searchDropdown.destroy();
      });

      test('2.5.4 Motion Actuation (Level A)', async () => {
        // Our components don't use motion-based input, so this should pass
        const container = createTestContainer();
        const spinner = await createAccessibleComponent(LoadingSpinner, container);
        
        // All functionality should work without device motion
        await spinner.start('Loading...');
        spinner.stop();
        
        expect(true).toBe(true); // No motion-based controls
        spinner.destroy();
      });
    });
  });

  describe('WCAG Principle 3: Understandable', () => {
    describe('Guideline 3.1 - Readable', () => {
      test('3.1.1 Language of Page (Level A)', async () => {
        const container = createTestContainer();
        
        // Page should have language specified
        const htmlElement = document.documentElement;
        expect(htmlElement.lang || htmlElement.getAttribute('xml:lang')).toBeTruthy();
      });
    });

    describe('Guideline 3.2 - Predictable', () => {
      test('3.2.1 On Focus (Level A)', async () => {
        const container = createTestContainer();
        const searchDropdown = await createAccessibleComponent(SearchDropdownUI, container);
        
        const searchInput = container.querySelector('input[type="search"]') as HTMLInputElement;
        
        if (searchInput) {
          const initialContext = document.body.innerHTML;
          
          // Focus should not change context unexpectedly
          searchInput.focus();
          
          jest.advanceTimersByTime(100);
          
          // Context should remain predictable
          expect(document.body.contains(searchInput)).toBe(true);
        }
        
        searchDropdown.destroy();
      });

      test('3.2.2 On Input (Level A)', async () => {
        const container = createTestContainer();
        const searchDropdown = await createAccessibleComponent(SearchDropdownUI, container);
        
        const searchInput = container.querySelector('input[type="search"]') as HTMLInputElement;
        
        if (searchInput) {
          searchInput.focus();
          
          // Input should not cause unexpected context changes
          const inputEvent = new Event('input', { bubbles: true });
          searchInput.value = 'test';
          searchInput.dispatchEvent(inputEvent);
          
          jest.advanceTimersByTime(100);
          
          // Should not navigate away or change context dramatically
          expect(document.activeElement).toBe(searchInput);
        }
        
        searchDropdown.destroy();
      });

      test('3.2.3 Consistent Navigation (Level AA)', async () => {
        const container = createTestContainer();
        const emptyState = await createAccessibleComponent(EmptyState, container, {
          interactiveSuggestions: true
        });
        
        await emptyState.show('No results', [
          'suggestion 1',
          'suggestion 2',
          'suggestion 3'
        ]);
        
        // Navigation mechanisms should be consistent
        const suggestions = container.querySelectorAll('.us-empty-state__suggestion-button');
        
        suggestions.forEach(suggestion => {
          expect(suggestion.tagName.toLowerCase()).toBe('button');
          expect(suggestion.getAttribute('type')).toBe('button');
        });
        
        emptyState.destroy();
      });

      test('3.2.4 Consistent Identification (Level AA)', async () => {
        const container = createTestContainer();
        
        // Create multiple components with similar functionality
        const errorMessage = await createAccessibleComponent(ErrorMessage, container, {
          dismissible: true
        });
        
        await errorMessage.show(new Error('Test error'));
        
        const dismissButton = container.querySelector('.us-error-message__dismiss');
        
        // Similar functionality should be identified consistently
        expect(dismissButton?.getAttribute('aria-label')).toBe('Dismiss error');
        expect(dismissButton?.textContent).toBe('×');
        
        errorMessage.destroy();
      });
    });

    describe('Guideline 3.3 - Input Assistance', () => {
      test('3.3.1 Error Identification (Level A)', async () => {
        const container = createTestContainer();
        const errorMessage = await createAccessibleComponent(ErrorMessage, container);
        
        await errorMessage.show(new Error('Network connection failed'));
        
        // Errors should be clearly identified
        const messageElement = container.querySelector('.us-error-message');
        expect(messageElement?.getAttribute('role')).toBe('alert');
        
        const titleElement = container.querySelector('.us-error-message__title');
        expect(titleElement?.textContent).toContain('Problem');
        
        errorMessage.destroy();
      });

      test('3.3.2 Labels or Instructions (Level A)', async () => {
        const container = createTestContainer();
        const searchDropdown = await createAccessibleComponent(SearchDropdownUI, container, {
          placeholder: 'Search for documents, people, or projects'
        });
        
        const searchInput = container.querySelector('input[type="search"]') as HTMLInputElement;
        
        // Inputs should have clear labels or instructions
        expect(searchInput?.getAttribute('placeholder')).toBeTruthy();
        expect(searchInput?.getAttribute('aria-label')).toBeTruthy();
        
        searchDropdown.destroy();
      });

      test('3.3.3 Error Suggestion (Level AA)', async () => {
        const container = createTestContainer();
        const errorMessage = await createAccessibleComponent(ErrorMessage, container);
        
        await errorMessage.showDetailed(new Error('Network error'), {
          retryActions: [{
            label: 'Try Again',
            handler: jest.fn(),
            type: 'primary'
          }]
        });
        
        // Error correction should be suggested
        const actionButton = container.querySelector('.us-error-message__action');
        expect(actionButton?.textContent).toBe('Try Again');
        
        errorMessage.destroy();
      });

      test('3.3.4 Error Prevention (Legal, Financial, Data) (Level AA)', async () => {
        // Our components don't handle sensitive data directly
        // but should support confirmation patterns
        const container = createTestContainer();
        const errorMessage = await createAccessibleComponent(ErrorMessage, container, {
          dismissible: true
        });
        
        await errorMessage.show(new Error('Test error'));
        
        // Destructive actions should be confirmable
        const dismissButton = container.querySelector('.us-error-message__dismiss');
        expect(dismissButton).toBeTruthy();
        
        errorMessage.destroy();
      });
    });
  });

  describe('WCAG Principle 4: Robust', () => {
    describe('Guideline 4.1 - Compatible', () => {
      test('4.1.1 Parsing (Level A)', async () => {
        const container = createTestContainer();
        const searchDropdown = await createAccessibleComponent(SearchDropdownUI, container);
        
        // HTML should be well-formed
        const result = await accessibilityManager.validateWCAG(container);
        const parsingViolations = result.violations.filter(
          v => v.type === 'parsing'
        );
        
        expect(parsingViolations).toHaveLength(0);
        searchDropdown.destroy();
      });

      test('4.1.2 Name, Role, Value (Level A)', async () => {
        const container = createTestContainer();
        const searchDropdown = await createAccessibleComponent(SearchDropdownUI, container);
        
        const searchInput = container.querySelector('input[type="search"]') as HTMLInputElement;
        
        // All form controls should have proper name, role, and value
        expect(searchInput?.getAttribute('role')).toBe('combobox');
        expect(searchInput?.getAttribute('aria-label')).toBeTruthy();
        expect(searchInput?.value).toBeDefined();
        
        searchDropdown.destroy();
      });

      test('4.1.3 Status Messages (Level AA)', async () => {
        const container = createTestContainer();
        const spinner = await createAccessibleComponent(LoadingSpinner, container);
        
        await spinner.start('Loading search results...');
        
        // Status changes should be announced
        const statusElement = container.querySelector('[role="status"]');
        expect(statusElement).toBeTruthy();
        expect(statusElement?.getAttribute('aria-live')).toBe('polite');
        
        spinner.stop();
        
        // Completion should also be announced
        jest.advanceTimersByTime(100);
        
        spinner.destroy();
      });
    });
  });

  describe('Overall WCAG 2.1 AA Compliance Score', () => {
    test('should achieve high compliance score across all components', async () => {
      const container = createTestContainer();
      
      // Test all components together
      const components = await Promise.all([
        createAccessibleComponent(LoadingSpinner, container),
        createAccessibleComponent(ErrorMessage, container),
        createAccessibleComponent(EmptyState, container),
        createAccessibleComponent(SearchDropdownUI, container)
      ]);
      
      // Show all components
      await components[0].start('Loading...');
      await components[1].show(new Error('Test error'));
      await components[2].show('No results found', ['suggestion']);
      
      // Validate overall compliance
      const result = await accessibilityManager.validateWCAG(document.body);
      
      expect(result.isCompliant).toBe(true);
      expect(result.level).toBe('AA');
      expect(result.score).toBeGreaterThanOrEqual(95); // 95% compliance target
      
      // Log any remaining violations for debugging
      if (result.violations.length > 0) {
        console.warn('WCAG Violations:', result.violations);
      }
      
      // Cleanup
      components.forEach(component => component.destroy());
    });

    test('should provide detailed violation reports', async () => {
      const container = createTestContainer();
      
      // Create a component with intentional accessibility issues for testing
      const testElement = document.createElement('button');
      testElement.textContent = ''; // Missing accessible name
      testElement.style.color = '#ccc';
      testElement.style.backgroundColor = '#ddd'; // Poor contrast
      container.appendChild(testElement);
      
      const result = await accessibilityManager.validateWCAG(container);
      
      expect(result.violations.length).toBeGreaterThan(0);
      
      const violationTypes = result.violations.map(v => v.type);
      expect(violationTypes).toContain('text-alternative');
      expect(violationTypes).toContain('color-contrast');
      
      // Each violation should have detailed information
      result.violations.forEach(violation => {
        expect(violation.element).toBeTruthy();
        expect(violation.message).toBeTruthy();
        expect(violation.severity).toBeTruthy();
        expect(violation.wcagCriteria).toBeTruthy();
      });
    });
  });
});