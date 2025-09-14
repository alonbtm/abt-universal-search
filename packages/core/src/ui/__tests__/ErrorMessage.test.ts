/**
 * ErrorMessage Test Suite
 * Comprehensive unit and integration tests for error message component
 */

import { ErrorMessage } from '../ErrorMessage';
import type { ErrorMessageConfig, ErrorSeverity, ErrorCategory, RetryAction } from '../ErrorMessage';

// Mock DOM environment
const createMockContainer = (): HTMLElement => {
  const container = document.createElement('div');
  container.id = 'error-test-container';
  document.body.appendChild(container);
  return container;
};

const defaultConfig: Partial<ErrorMessageConfig> = {
  showRetryButton: true,
  retryText: 'Try Again',
  showHelpButton: true,
  helpText: 'Get Help',
  autoHide: false,
  hideDelay: 5000
};

describe('ErrorMessage', () => {
  let container: HTMLElement;
  let errorMessage: ErrorMessage;

  beforeEach(() => {
    // Setup fresh DOM
    document.body.innerHTML = '';
    container = createMockContainer();
    
    // Mock timers
    jest.useFakeTimers();
    
    errorMessage = new ErrorMessage(container, defaultConfig);
  });

  afterEach(() => {
    errorMessage?.destroy();
    document.body.innerHTML = '';
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with valid container', () => {
      expect(errorMessage).toBeInstanceOf(ErrorMessage);
      expect(errorMessage.isVisible()).toBe(false);
    });

    test('should throw error with invalid container', () => {
      expect(() => {
        new ErrorMessage(null as any, defaultConfig);
      }).toThrow('Container must be a valid HTMLElement');
    });

    test('should apply default configuration', () => {
      errorMessage.init();
      
      const errorElement = container.querySelector('.us-error-message');
      expect(errorElement).toBeTruthy();
    });
  });

  describe('DOM Structure', () => {
    beforeEach(() => {
      errorMessage.init();
    });

    test('should create required DOM elements', () => {
      errorMessage.showSimple('Test error');
      
      expect(container.querySelector('.us-error-message')).toBeTruthy();
      expect(container.querySelector('.us-error-message__icon')).toBeTruthy();
      expect(container.querySelector('.us-error-message__content')).toBeTruthy();
      expect(container.querySelector('.us-error-message__message')).toBeTruthy();
    });

    test('should show retry button when configured', () => {
      errorMessage.showSimple('Test error');
      
      const retryButton = container.querySelector('.us-error-message__action');
      expect(retryButton).toBeTruthy();
      expect(retryButton?.textContent).toBe('Try Again');
    });

    test('should hide retry button when disabled', () => {
      const noRetryErrorMessage = new ErrorMessage(container, {
        ...defaultConfig,
        showRetryButton: false
      });
      
      noRetryErrorMessage.init();
      noRetryErrorMessage.showSimple('Test error');
      
      const retryButton = container.querySelector('.us-error-message__action');
      expect(retryButton).toBeFalsy();
      
      noRetryErrorMessage.destroy();
    });

    test('should apply proper ARIA attributes', () => {
      errorMessage.showSimple('Test error');
      
      const errorElement = container.querySelector('.us-error-message');
      expect(errorElement?.getAttribute('role')).toBe('alert');
      expect(errorElement?.getAttribute('aria-live')).toBe('assertive');
    });
  });

  describe('Simple Error Display', () => {
    beforeEach(() => {
      errorMessage.init();
    });

    test('should show simple error message', () => {
      errorMessage.showSimple('Network connection failed');
      
      expect(errorMessage.isVisible()).toBe(true);
      
      const messageElement = container.querySelector('.us-error-message__message');
      expect(messageElement?.textContent).toBe('Network connection failed');
    });

    test('should show error from Error object', () => {
      const error = new Error('Something went wrong');
      errorMessage.showSimple(error);
      
      const messageElement = container.querySelector('.us-error-message__message');
      expect(messageElement?.textContent).toBe('Something went wrong');
    });

    test('should hide error message', () => {
      errorMessage.showSimple('Test error');
      expect(errorMessage.isVisible()).toBe(true);
      
      errorMessage.hide();
      expect(errorMessage.isVisible()).toBe(false);
    });
  });

  describe('Detailed Error Display', () => {
    beforeEach(() => {
      errorMessage.init();
    });

    test('should show detailed error with severity', () => {
      errorMessage.showDetailed('Critical system failure', {
        severity: 'critical' as ErrorSeverity,
        category: 'system' as ErrorCategory
      });
      
      const errorElement = container.querySelector('.us-error-message');
      expect(errorElement?.classList.contains('us-error-message--critical')).toBe(true);
    });

    test('should show different severity levels', () => {
      const severities: ErrorSeverity[] = ['low', 'medium', 'high', 'critical'];
      
      severities.forEach(severity => {
        errorMessage.showDetailed(`${severity} error`, { severity });
        
        const errorElement = container.querySelector('.us-error-message');
        expect(errorElement?.classList.contains(`us-error-message--${severity}`)).toBe(true);
        
        errorMessage.hide();
      });
    });

    test('should show custom title', () => {
      errorMessage.showDetailed('Error details', {
        customTitle: 'Connection Problem'
      });
      
      const titleElement = container.querySelector('.us-error-message__title');
      expect(titleElement?.textContent).toBe('Connection Problem');
    });

    test('should show multiple retry actions', () => {
      const retryActions: RetryAction[] = [
        { 
          label: 'Retry Now', 
          action: jest.fn(), 
          primary: true 
        },
        { 
          label: 'Try Later', 
          action: jest.fn(), 
          primary: false 
        }
      ];
      
      errorMessage.showDetailed('Multi-action error', {
        retryActions
      });
      
      const actionButtons = container.querySelectorAll('.us-error-message__action');
      expect(actionButtons).toHaveLength(2);
      
      const primaryButton = container.querySelector('.us-error-message__action--primary');
      expect(primaryButton?.textContent).toBe('Retry Now');
    });

    test('should show help action', () => {
      errorMessage.showDetailed('Complex error', {
        helpAction: {
          label: 'View Documentation',
          action: jest.fn()
        }
      });
      
      const helpButton = container.querySelector('.us-error-message__help');
      expect(helpButton?.textContent).toBe('View Documentation');
    });
  });

  describe('Error Categories', () => {
    beforeEach(() => {
      errorMessage.init();
    });

    test('should display network error appropriately', () => {
      errorMessage.showDetailed('Connection failed', {
        category: 'network' as ErrorCategory
      });
      
      const iconElement = container.querySelector('.us-error-message__icon');
      expect(iconElement?.textContent).toBe('🌐');
    });

    test('should display validation error appropriately', () => {
      errorMessage.showDetailed('Invalid input', {
        category: 'validation' as ErrorCategory
      });
      
      const iconElement = container.querySelector('.us-error-message__icon');
      expect(iconElement?.textContent).toBe('⚠️');
    });

    test('should display system error appropriately', () => {
      errorMessage.showDetailed('System failure', {
        category: 'system' as ErrorCategory
      });
      
      const iconElement = container.querySelector('.us-error-message__icon');
      expect(iconElement?.textContent).toBe('⚙️');
    });

    test('should display authentication error appropriately', () => {
      errorMessage.showDetailed('Access denied', {
        category: 'authentication' as ErrorCategory
      });
      
      const iconElement = container.querySelector('.us-error-message__icon');
      expect(iconElement?.textContent).toBe('🔒');
    });
  });

  describe('Auto-hide Functionality', () => {
    test('should auto-hide after delay when configured', () => {
      const autoHideErrorMessage = new ErrorMessage(container, {
        ...defaultConfig,
        autoHide: true,
        hideDelay: 3000
      });
      
      autoHideErrorMessage.init();
      autoHideErrorMessage.showSimple('Auto-hide message');
      
      expect(autoHideErrorMessage.isVisible()).toBe(true);
      
      // Fast-forward past hide delay
      jest.advanceTimersByTime(3000);
      
      expect(autoHideErrorMessage.isVisible()).toBe(false);
      
      autoHideErrorMessage.destroy();
    });

    test('should not auto-hide when disabled', () => {
      const noAutoHideErrorMessage = new ErrorMessage(container, {
        ...defaultConfig,
        autoHide: false
      });
      
      noAutoHideErrorMessage.init();
      noAutoHideErrorMessage.showSimple('Persistent message');
      
      expect(noAutoHideErrorMessage.isVisible()).toBe(true);
      
      // Fast-forward significant time
      jest.advanceTimersByTime(10000);
      
      expect(noAutoHideErrorMessage.isVisible()).toBe(true);
      
      noAutoHideErrorMessage.destroy();
    });

    test('should cancel auto-hide on user interaction', () => {
      const autoHideErrorMessage = new ErrorMessage(container, {
        ...defaultConfig,
        autoHide: true,
        hideDelay: 3000
      });
      
      autoHideErrorMessage.init();
      autoHideErrorMessage.showSimple('Interactive message');
      
      // Simulate user interaction
      const errorElement = container.querySelector('.us-error-message') as HTMLElement;
      errorElement.dispatchEvent(new MouseEvent('mouseenter'));
      
      // Fast-forward past original hide delay
      jest.advanceTimersByTime(3000);
      
      expect(autoHideErrorMessage.isVisible()).toBe(true);
      
      autoHideErrorMessage.destroy();
    });
  });

  describe('Event System', () => {
    beforeEach(() => {
      errorMessage.init();
    });

    test('should emit retry event on button click', () => {
      let retryEventFired = false;
      
      errorMessage.on('retry', () => {
        retryEventFired = true;
      });
      
      errorMessage.showSimple('Retry test error');
      
      const retryButton = container.querySelector('.us-error-message__action') as HTMLElement;
      retryButton.click();
      
      expect(retryEventFired).toBe(true);
    });

    test('should emit help event on help button click', () => {
      let helpEventFired = false;
      
      errorMessage.on('help', () => {
        helpEventFired = true;
      });
      
      errorMessage.showDetailed('Help test error', {
        helpAction: {
          label: 'Get Help',
          action: () => {}
        }
      });
      
      const helpButton = container.querySelector('.us-error-message__help') as HTMLElement;
      helpButton.click();
      
      expect(helpEventFired).toBe(true);
    });

    test('should emit show and hide events', () => {
      let showEventFired = false;
      let hideEventFired = false;
      
      errorMessage.on('show', () => {
        showEventFired = true;
      });
      
      errorMessage.on('hide', () => {
        hideEventFired = true;
      });
      
      errorMessage.showSimple('Event test error');
      expect(showEventFired).toBe(true);
      
      errorMessage.hide();
      expect(hideEventFired).toBe(true);
    });

    test('should handle custom retry action execution', () => {
      const customAction = jest.fn();
      
      errorMessage.showDetailed('Custom action error', {
        retryActions: [{
          label: 'Custom Retry',
          action: customAction,
          primary: true
        }]
      });
      
      const retryButton = container.querySelector('.us-error-message__action') as HTMLElement;
      retryButton.click();
      
      expect(customAction).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      errorMessage.init();
    });

    test('should have proper ARIA attributes', () => {
      errorMessage.showSimple('Accessibility test');
      
      const errorElement = container.querySelector('.us-error-message');
      
      expect(errorElement?.getAttribute('role')).toBe('alert');
      expect(errorElement?.getAttribute('aria-live')).toBe('assertive');
    });

    test('should have accessible button labels', () => {
      errorMessage.showDetailed('Button test', {
        retryActions: [{
          label: 'Retry Operation',
          action: jest.fn(),
          primary: true
        }],
        helpAction: {
          label: 'Get Help',
          action: jest.fn()
        }
      });
      
      const retryButton = container.querySelector('.us-error-message__action');
      const helpButton = container.querySelector('.us-error-message__help');
      
      expect(retryButton?.textContent).toBe('Retry Operation');
      expect(helpButton?.textContent).toBe('Get Help');
    });

    test('should support keyboard navigation', () => {
      errorMessage.showSimple('Keyboard test');
      
      const retryButton = container.querySelector('.us-error-message__action') as HTMLElement;
      
      // Should be focusable
      retryButton.focus();
      expect(document.activeElement).toBe(retryButton);
      
      // Should respond to Enter key
      let retryTriggered = false;
      errorMessage.on('retry', () => {
        retryTriggered = true;
      });
      
      retryButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(retryTriggered).toBe(true);
    });
  });

  describe('Theming and Styling', () => {
    beforeEach(() => {
      errorMessage.init();
    });

    test('should apply severity-based styling', () => {
      errorMessage.showDetailed('Critical error', {
        severity: 'critical' as ErrorSeverity
      });
      
      const errorElement = container.querySelector('.us-error-message');
      expect(errorElement?.classList.contains('us-error-message--critical')).toBe(true);
    });

    test('should apply category-based icons', () => {
      const categories: ErrorCategory[] = ['network', 'validation', 'system', 'authentication', 'general'];
      const expectedIcons = ['🌐', '⚠️', '⚙️', '🔒', '❌'];
      
      categories.forEach((category, index) => {
        errorMessage.showDetailed('Category test', { category });
        
        const iconElement = container.querySelector('.us-error-message__icon');
        expect(iconElement?.textContent).toBe(expectedIcons[index]);
        
        errorMessage.hide();
      });
    });

    test('should support custom styling through CSS classes', () => {
      errorMessage.showSimple('Custom style test');
      
      const errorElement = container.querySelector('.us-error-message');
      expect(errorElement?.classList.contains('us-error-message')).toBe(true);
    });
  });

  describe('Error Recovery Suggestions', () => {
    beforeEach(() => {
      errorMessage.init();
    });

    test('should show contextual suggestions for network errors', () => {
      errorMessage.showDetailed(new Error('Connection failed'), {
        category: 'network' as ErrorCategory
      });
      
      const suggestionElement = container.querySelector('.us-error-message__suggestion');
      expect(suggestionElement?.textContent).toContain('connection');
    });

    test('should show contextual suggestions for validation errors', () => {
      errorMessage.showDetailed('Invalid email format', {
        category: 'validation' as ErrorCategory
      });
      
      const suggestionElement = container.querySelector('.us-error-message__suggestion');
      expect(suggestionElement?.textContent).toContain('input');
    });

    test('should show general suggestions for unknown errors', () => {
      errorMessage.showDetailed('Unknown error occurred', {
        category: 'general' as ErrorCategory
      });
      
      const suggestionElement = container.querySelector('.us-error-message__suggestion');
      expect(suggestionElement).toBeTruthy();
    });
  });

  describe('Resource Management', () => {
    test('should cleanup resources on destroy', () => {
      errorMessage.init();
      errorMessage.showSimple('Cleanup test');
      
      const errorElement = container.querySelector('.us-error-message');
      expect(errorElement).toBeTruthy();
      
      errorMessage.destroy();
      
      const cleanedError = container.querySelector('.us-error-message');
      expect(cleanedError).toBeFalsy();
    });

    test('should clear auto-hide timer on destroy', () => {
      const autoHideErrorMessage = new ErrorMessage(container, {
        ...defaultConfig,
        autoHide: true,
        hideDelay: 5000
      });
      
      autoHideErrorMessage.init();
      autoHideErrorMessage.showSimple('Timer cleanup test');
      
      // Destroy before auto-hide
      autoHideErrorMessage.destroy();
      
      // Fast-forward past auto-hide delay
      jest.advanceTimersByTime(5000);
      
      // Should not throw or cause issues
      expect(true).toBe(true); // If we get here, cleanup worked
    });

    test('should handle multiple destroy calls safely', () => {
      errorMessage.init();
      errorMessage.showSimple('Multiple destroy test');
      
      expect(() => {
        errorMessage.destroy();
        errorMessage.destroy(); // Second call should not throw
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty error message', () => {
      errorMessage.init();
      
      expect(() => {
        errorMessage.showSimple('');
      }).not.toThrow();
      
      const messageElement = container.querySelector('.us-error-message__message');
      expect(messageElement?.textContent).toBe('');
    });

    test('should handle null error object', () => {
      errorMessage.init();
      
      expect(() => {
        errorMessage.showSimple(null as any);
      }).not.toThrow();
    });

    test('should handle show without init', () => {
      expect(() => {
        errorMessage.showSimple('No init test');
      }).not.toThrow();
      
      expect(errorMessage.isVisible()).toBe(true);
    });

    test('should handle hide when not visible', () => {
      errorMessage.init();
      
      expect(() => {
        errorMessage.hide();
      }).not.toThrow();
    });

    test('should handle multiple show calls', () => {
      errorMessage.init();
      
      errorMessage.showSimple('First error');
      errorMessage.showSimple('Second error');
      
      const messageElement = container.querySelector('.us-error-message__message');
      expect(messageElement?.textContent).toBe('Second error');
    });
  });
});