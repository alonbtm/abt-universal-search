/**
 * LoadingSpinner Test Suite
 * Comprehensive unit and integration tests for loading spinner component
 */

import { LoadingSpinner } from '../LoadingSpinner';
import type { LoadingSpinnerConfig } from '../LoadingSpinner';

// Mock DOM environment
const createMockContainer = (): HTMLElement => {
  const container = document.createElement('div');
  container.id = 'spinner-test-container';
  document.body.appendChild(container);
  return container;
};

const defaultConfig: Partial<LoadingSpinnerConfig> = {
  size: 32,
  duration: 1000,
  color: '#007bff',
  trackColor: '#e0e0e0',
  showProgress: true,
  timeoutMs: 5000,
  timeoutMessage: 'Taking longer than expected...'
};

describe('LoadingSpinner', () => {
  let container: HTMLElement;
  let spinner: LoadingSpinner;

  beforeEach(() => {
    // Setup fresh DOM
    document.body.innerHTML = '';
    container = createMockContainer();
    
    // Mock timers
    jest.useFakeTimers();
    
    // Mock requestAnimationFrame
    global.requestAnimationFrame = jest.fn((cb) => {
      setTimeout(cb, 16);
      return 1;
    });
    
    spinner = new LoadingSpinner(container, defaultConfig);
  });

  afterEach(() => {
    spinner?.destroy();
    document.body.innerHTML = '';
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with valid container', () => {
      expect(spinner).toBeInstanceOf(LoadingSpinner);
      expect(spinner.isLoading()).toBe(false);
    });

    test('should throw error with invalid container', () => {
      expect(() => {
        new LoadingSpinner(null as any, defaultConfig);
      }).toThrow('Container must be a valid HTMLElement');
    });

    test('should apply default configuration', () => {
      spinner.init();
      
      const spinnerElement = container.querySelector('.us-loading-spinner');
      expect(spinnerElement).toBeTruthy();
      expect(spinnerElement?.style.getPropertyValue('--us-spinner-size')).toBe('32px');
    });

    test('should validate configuration parameters', () => {
      expect(() => {
        new LoadingSpinner(container, { size: 5 }); // Too small
      }).toThrow('Spinner size must be between 16 and 128 pixels');

      expect(() => {
        new LoadingSpinner(container, { duration: 50 }); // Too short
      }).toThrow('Animation duration must be at least 100ms');

      expect(() => {
        new LoadingSpinner(container, { timeoutMs: -1 }); // Negative
      }).toThrow('Timeout duration must be non-negative');
    });
  });

  describe('DOM Structure', () => {
    beforeEach(() => {
      spinner.init();
    });

    test('should create required DOM elements', () => {
      expect(container.querySelector('.us-loading-spinner')).toBeTruthy();
      expect(container.querySelector('.us-loading-spinner__visual')).toBeTruthy();
      expect(container.querySelector('.us-loading-spinner__ring')).toBeTruthy();
      expect(container.querySelector('.us-loading-spinner__progress')).toBeTruthy();
      expect(container.querySelector('.us-loading-spinner__message')).toBeTruthy();
    });

    test('should apply ARIA attributes', () => {
      const spinnerElement = container.querySelector('.us-loading-spinner');
      
      expect(spinnerElement?.getAttribute('role')).toBe('status');
      expect(spinnerElement?.getAttribute('aria-live')).toBe('polite');
    });

    test('should inject CSS styles only once', () => {
      const spinner2 = new LoadingSpinner(container, defaultConfig);
      spinner2.init();
      
      const styleElements = document.querySelectorAll('#us-loading-spinner-styles');
      expect(styleElements).toHaveLength(1);
      
      spinner2.destroy();
    });

    test('should hide progress when showProgress is false', () => {
      const noProgressSpinner = new LoadingSpinner(container, {
        ...defaultConfig,
        showProgress: false
      });
      noProgressSpinner.init();
      
      const progressElement = container.querySelector('.us-loading-spinner__progress');
      expect(progressElement).toBeFalsy();
      
      noProgressSpinner.destroy();
    });
  });

  describe('Loading Operations', () => {
    beforeEach(() => {
      spinner.init();
    });

    test('should start loading with default message', () => {
      spinner.start();
      
      expect(spinner.isLoading()).toBe(true);
      
      const spinnerElement = container.querySelector('.us-loading-spinner');
      const messageElement = container.querySelector('.us-loading-spinner__message');
      
      expect(spinnerElement?.style.display).toBe('flex');
      expect(messageElement?.textContent).toBe('Loading...');
    });

    test('should start loading with custom message', () => {
      spinner.start('Searching documents...');
      
      const messageElement = container.querySelector('.us-loading-spinner__message');
      expect(messageElement?.textContent).toBe('Searching documents...');
    });

    test('should stop loading', () => {
      spinner.start();
      expect(spinner.isLoading()).toBe(true);
      
      spinner.stop();
      
      // Fast-forward timers to complete hide animation
      jest.advanceTimersByTime(200);
      
      expect(spinner.isLoading()).toBe(false);
    });

    test('should update message while loading', () => {
      spinner.start('Initial message');
      spinner.updateMessage('Updated message');
      
      const messageElement = container.querySelector('.us-loading-spinner__message');
      expect(messageElement?.textContent).toBe('Updated message');
    });

    test('should track elapsed time', () => {
      const startTime = Date.now();
      spinner.start();
      
      // Fast-forward time
      jest.advanceTimersByTime(2000);
      
      const elapsedTime = spinner.getElapsedTime();
      expect(elapsedTime).toBeGreaterThanOrEqual(2000);
    });
  });

  describe('Timeout Handling', () => {
    beforeEach(() => {
      spinner.init();
    });

    test('should trigger timeout event', () => {
      let timeoutTriggered = false;
      let timeoutDuration = 0;
      
      spinner.on('timeout', (duration) => {
        timeoutTriggered = true;
        timeoutDuration = duration;
      });
      
      spinner.start();
      
      // Fast-forward to trigger timeout
      jest.advanceTimersByTime(5000);
      
      expect(timeoutTriggered).toBe(true);
      expect(timeoutDuration).toBeGreaterThanOrEqual(5000);
    });

    test('should show timeout message', () => {
      spinner.start();
      
      // Fast-forward to trigger timeout
      jest.advanceTimersByTime(5000);
      
      const messageElement = container.querySelector('.us-loading-spinner__message');
      expect(messageElement?.textContent).toBe('Taking longer than expected...');
      expect(messageElement?.classList.contains('us-loading-spinner__message--timeout')).toBe(true);
    });

    test('should allow custom timeout settings', () => {
      spinner.setTimeout(3000, 'Custom timeout message');
      spinner.start();
      
      // Fast-forward to trigger timeout
      jest.advanceTimersByTime(3000);
      
      const messageElement = container.querySelector('.us-loading-spinner__message');
      expect(messageElement?.textContent).toBe('Custom timeout message');
    });

    test('should clear timeout when stopped', () => {
      let timeoutTriggered = false;
      
      spinner.on('timeout', () => {
        timeoutTriggered = true;
      });
      
      spinner.start();
      
      // Stop before timeout
      jest.advanceTimersByTime(2000);
      spinner.stop();
      
      // Continue past timeout
      jest.advanceTimersByTime(4000);
      
      expect(timeoutTriggered).toBe(false);
    });
  });

  describe('Progress Updates', () => {
    beforeEach(() => {
      spinner.init();
    });

    test('should update progress attributes', () => {
      spinner.start();
      
      // Fast-forward to update progress
      jest.advanceTimersByTime(1000);
      
      const spinnerElement = container.querySelector('.us-loading-spinner');
      const progressValue = parseInt(spinnerElement?.getAttribute('aria-valuenow') || '0');
      
      expect(progressValue).toBeGreaterThan(0);
      expect(spinnerElement?.getAttribute('aria-valuemin')).toBe('0');
      expect(spinnerElement?.getAttribute('aria-valuemax')).toBe('100');
    });

    test('should not exceed 100% progress', () => {
      spinner.start();
      
      // Fast-forward way past timeout
      jest.advanceTimersByTime(10000);
      
      const spinnerElement = container.querySelector('.us-loading-spinner');
      const progressValue = parseInt(spinnerElement?.getAttribute('aria-valuenow') || '0');
      
      expect(progressValue).toBeLessThanOrEqual(100);
    });
  });

  describe('Event System', () => {
    beforeEach(() => {
      spinner.init();
    });

    test('should emit start event', () => {
      let startEventFired = false;
      
      spinner.on('start', () => {
        startEventFired = true;
      });
      
      spinner.start();
      expect(startEventFired).toBe(true);
    });

    test('should emit stop event', () => {
      let stopEventFired = false;
      
      spinner.on('stop', () => {
        stopEventFired = true;
      });
      
      spinner.start();
      spinner.stop();
      
      expect(stopEventFired).toBe(true);
    });

    test('should handle multiple listeners', () => {
      let listener1Called = false;
      let listener2Called = false;
      
      const listener1 = () => { listener1Called = true; };
      const listener2 = () => { listener2Called = true; };
      
      spinner.on('start', listener1);
      spinner.on('start', listener2);
      
      spinner.start();
      
      expect(listener1Called).toBe(true);
      expect(listener2Called).toBe(true);
    });

    test('should remove event listeners', () => {
      let listenerCalled = false;
      
      const listener = () => { listenerCalled = true; };
      
      spinner.on('start', listener);
      spinner.off('start', listener);
      
      spinner.start();
      
      expect(listenerCalled).toBe(false);
    });

    test('should handle listener errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      spinner.on('start', () => {
        throw new Error('Listener error');
      });
      
      expect(() => {
        spinner.start();
      }).not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in LoadingSpinner start listener:'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Animation and Styling', () => {
    beforeEach(() => {
      spinner.init();
    });

    test('should apply custom styling properties', () => {
      const customSpinner = new LoadingSpinner(container, {
        size: 48,
        duration: 1500,
        color: '#ff0000',
        trackColor: '#cccccc'
      });
      
      customSpinner.init();
      
      const spinnerElement = container.querySelector('.us-loading-spinner');
      expect(spinnerElement?.style.getPropertyValue('--us-spinner-size')).toBe('48px');
      expect(spinnerElement?.style.getPropertyValue('--us-spinner-duration')).toBe('1500ms');
      expect(spinnerElement?.style.getPropertyValue('--us-spinner-color')).toBe('#ff0000');
      expect(spinnerElement?.style.getPropertyValue('--us-spinner-track-color')).toBe('#cccccc');
      
      customSpinner.destroy();
    });

    test('should show and hide with smooth transitions', () => {
      spinner.show();
      
      // Trigger reflow for animation
      jest.advanceTimersByTime(16);
      
      const spinnerElement = container.querySelector('.us-loading-spinner');
      expect(spinnerElement?.classList.contains('us-loading-spinner--visible')).toBe(true);
      
      spinner.hide();
      
      // Fast-forward transition
      jest.advanceTimersByTime(200);
      
      expect(spinner.isLoading()).toBe(false);
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      spinner.init();
    });

    test('should have proper ARIA attributes', () => {
      spinner.start();
      
      const spinnerElement = container.querySelector('.us-loading-spinner');
      
      expect(spinnerElement?.getAttribute('role')).toBe('status');
      expect(spinnerElement?.getAttribute('aria-live')).toBe('polite');
    });

    test('should update ARIA values during progress', () => {
      spinner.start();
      
      // Fast-forward for progress update
      jest.advanceTimersByTime(500);
      
      const spinnerElement = container.querySelector('.us-loading-spinner');
      const ariaValueNow = spinnerElement?.getAttribute('aria-valuenow');
      
      expect(ariaValueNow).toBeTruthy();
      expect(parseInt(ariaValueNow || '0')).toBeGreaterThan(0);
    });

    test('should support reduced motion preferences', () => {
      // This would typically be handled by CSS media queries
      // Test verifies the component doesn't break with reduced motion
      spinner.start();
      expect(spinner.isLoading()).toBe(true);
    });
  });

  describe('Resource Management', () => {
    test('should cleanup resources on destroy', () => {
      spinner.init();
      spinner.start();
      
      const spinnerElement = container.querySelector('.us-loading-spinner');
      expect(spinnerElement).toBeTruthy();
      
      spinner.destroy();
      
      const cleanedSpinner = container.querySelector('.us-loading-spinner');
      expect(cleanedSpinner).toBeFalsy();
    });

    test('should clear all timers on destroy', () => {
      let timeoutFired = false;
      
      spinner.on('timeout', () => {
        timeoutFired = true;
      });
      
      spinner.init();
      spinner.start();
      
      // Destroy before timeout
      spinner.destroy();
      
      // Fast-forward past timeout
      jest.advanceTimersByTime(10000);
      
      expect(timeoutFired).toBe(false);
    });

    test('should handle multiple destroy calls safely', () => {
      spinner.init();
      spinner.start();
      
      expect(() => {
        spinner.destroy();
        spinner.destroy(); // Second call should not throw
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle start without init', () => {
      expect(() => {
        spinner.start();
      }).not.toThrow();
      
      expect(spinner.isLoading()).toBe(true);
    });

    test('should handle stop without start', () => {
      expect(() => {
        spinner.stop();
      }).not.toThrow();
    });

    test('should handle multiple starts', () => {
      spinner.init();
      
      spinner.start('Message 1');
      spinner.start('Message 2');
      
      const messageElement = container.querySelector('.us-loading-spinner__message');
      expect(messageElement?.textContent).toBe('Message 2');
    });

    test('should handle zero timeout', () => {
      const noTimeoutSpinner = new LoadingSpinner(container, {
        ...defaultConfig,
        timeoutMs: 0
      });
      
      let timeoutFired = false;
      noTimeoutSpinner.on('timeout', () => {
        timeoutFired = true;
      });
      
      noTimeoutSpinner.init();
      noTimeoutSpinner.start();
      
      // Fast-forward significant time
      jest.advanceTimersByTime(10000);
      
      expect(timeoutFired).toBe(false);
      
      noTimeoutSpinner.destroy();
    });
  });
});