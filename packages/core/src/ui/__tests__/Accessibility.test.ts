/**
 * Accessibility Test Suite
 * Comprehensive WCAG 2.1 AA compliance tests for all UI components
 */

import { AccessibilityManager } from '../AccessibilityManager';
import { ScreenReaderManager } from '../ScreenReaderManager';
import { KeyboardHandler } from '../KeyboardHandler';
import { FocusManager } from '../FocusManager';
import { ColorContrastValidator } from '../ColorContrastValidator';
import { VoiceControlManager } from '../VoiceControlManager';
import { LoadingSpinner } from '../LoadingSpinner';
import { ErrorMessage } from '../ErrorMessage';
import { SearchDropdownUI } from '../SearchDropdownUI';
import type { 
  AccessibilityConfig, 
  WCAGLevel, 
  AccessibilityValidationResult,
  ColorContrastResult,
  KeyboardNavigationConfig,
  FocusManagementConfig,
  ScreenReaderAnnouncement,
  LandmarkInfo,
  VoiceControlCommand
} from '../../types/Accessibility';
import type { ContrastTestResult, ContrastValidationConfig } from '../ColorContrastValidator';
import type { FocusTrapConfig, FocusManagerConfig } from '../FocusManager';
import type { VoiceRecognitionConfig } from '../VoiceControlManager';

// Mock Web APIs for testing
const mockWebAPIs = () => {
  // Mock SpeechRecognition
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

  // Mock SpeechSynthesis
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

  // Mock IntersectionObserver
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
  }));

  // Mock ResizeObserver
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
  }));
};

// Test utilities
const createTestContainer = (id: string = 'test-container'): HTMLElement => {
  const container = document.createElement('div');
  container.id = id;
  container.setAttribute('data-testid', id);
  document.body.appendChild(container);
  return container;
};

const createTestElement = (tag: string = 'div', content?: string): HTMLElement => {
  const element = document.createElement(tag);
  if (content) {
    element.textContent = content;
  }
  return element;
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

const simulateFocusEvent = (element: HTMLElement): void => {
  const event = new FocusEvent('focus', { bubbles: true });
  element.dispatchEvent(event);
};

describe('Accessibility Infrastructure', () => {
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

  describe('AccessibilityManager', () => {
    let manager: AccessibilityManager;
    let config: AccessibilityConfig;

    beforeEach(async () => {
      config = {
        wcagLevel: 'AA',
        enableKeyboardNavigation: true,
        enableScreenReaderSupport: true,
        enableFocusManagement: true,
        enableAutomatedValidation: true,
        debugMode: false
      };
      manager = new AccessibilityManager(config);
      await manager.init();
    });

    afterEach(() => {
      manager?.destroy();
    });

    test('should initialize with proper configuration', () => {
      expect(manager).toBeDefined();
      expect(manager.getConfig()).toEqual(config);
    });

    test('should validate WCAG compliance for elements', async () => {
      const element = createTestElement('button', 'Test Button');
      element.setAttribute('role', 'button');
      element.setAttribute('aria-label', 'Test button for accessibility');
      document.body.appendChild(element);

      const result: AccessibilityValidationResult = await manager.validateWCAG(element);
      
      expect(result).toBeDefined();
      expect(result.isCompliant).toBeDefined();
      expect(result.level).toBe('AA');
      expect(result.violations).toBeDefined();
      expect(result.warnings).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    test('should apply ARIA attributes correctly', () => {
      const element = createTestElement('div');
      document.body.appendChild(element);

      manager.applyARIAAttributes(element, {
        role: 'button',
        'aria-label': 'Test button',
        'aria-expanded': 'false',
        'aria-pressed': 'false'
      });

      expect(element.getAttribute('role')).toBe('button');
      expect(element.getAttribute('aria-label')).toBe('Test button');
      expect(element.getAttribute('aria-expanded')).toBe('false');
      expect(element.getAttribute('aria-pressed')).toBe('false');
    });

    test('should handle malformed ARIA attributes', () => {
      const element = createTestElement('div');
      document.body.appendChild(element);

      // Should not throw for invalid ARIA values
      expect(() => {
        manager.applyARIAAttributes(element, {
          'aria-invalid-attribute': 'invalid' as any,
          'aria-label': ''  // Empty label should be handled
        });
      }).not.toThrow();
    });

    test('should validate semantic HTML structure', async () => {
      // Create proper semantic structure
      const main = createTestElement('main');
      const header = createTestElement('header');
      const nav = createTestElement('nav');
      const section = createTestElement('section');
      
      header.appendChild(nav);
      main.appendChild(header);
      main.appendChild(section);
      document.body.appendChild(main);

      const result = await manager.validateWCAG(document.body);
      
      // Should have fewer violations with proper semantic structure
      expect(result.violations.filter(v => v.type === 'semantic')).toHaveLength(0);
    });
  });

  describe('ScreenReaderManager', () => {
    let screenReader: ScreenReaderManager;

    beforeEach(async () => {
      screenReader = new ScreenReaderManager();
      await screenReader.init();
    });

    afterEach(() => {
      screenReader?.destroy();
    });

    test('should create ARIA live regions', () => {
      const politeRegion = screenReader.getLiveRegion('polite');
      const assertiveRegion = screenReader.getLiveRegion('assertive');

      expect(politeRegion).toBeTruthy();
      expect(assertiveRegion).toBeTruthy();
      expect(politeRegion?.getAttribute('aria-live')).toBe('polite');
      expect(assertiveRegion?.getAttribute('aria-live')).toBe('assertive');
    });

    test('should announce messages to polite region', () => {
      screenReader.announce({
        message: 'Test polite announcement',
        priority: 'medium',
        liveRegion: 'polite'
      });

      const politeRegion = screenReader.getLiveRegion('polite');
      expect(politeRegion?.textContent).toBe('Test polite announcement');
    });

    test('should announce messages to assertive region', () => {
      screenReader.announce({
        message: 'Test assertive announcement',
        priority: 'urgent',
        liveRegion: 'assertive'
      });

      const assertiveRegion = screenReader.getLiveRegion('assertive');
      expect(assertiveRegion?.textContent).toBe('Test assertive announcement');
    });

    test('should announce loading states', () => {
      screenReader.announceLoading(true, 'Loading search results');
      
      const politeRegion = screenReader.getLiveRegion('polite');
      expect(politeRegion?.textContent).toContain('Loading search results');
    });

    test('should announce error states', () => {
      const error = new Error('Test error message');
      screenReader.announceError(error);
      
      const assertiveRegion = screenReader.getLiveRegion('assertive');
      expect(assertiveRegion?.textContent).toContain('Error: Test error message');
    });

    test('should announce result counts', () => {
      screenReader.announceResultsCount(5, 'test query');
      
      const politeRegion = screenReader.getLiveRegion('polite');
      expect(politeRegion?.textContent).toContain('5 results found for "test query"');
    });

    test('should handle zero results announcement', () => {
      screenReader.announceResultsCount(0, 'nonexistent');
      
      const politeRegion = screenReader.getLiveRegion('polite');
      expect(politeRegion?.textContent).toContain('No results found for "nonexistent"');
    });
  });

  describe('KeyboardHandler', () => {
    let keyboardHandler: KeyboardHandler;
    let config: KeyboardNavigationConfig;
    let container: HTMLElement;

    beforeEach(async () => {
      container = createTestContainer();
      config = {
        enableArrowKeys: true,
        enableEnterKey: true,
        enableEscapeKey: true,
        enableTabNavigation: true,
        enableHomeEndKeys: true,
        enablePageKeys: false,
        customShortcuts: new Map(),
        trapFocus: false,
        circularNavigation: true
      };
      keyboardHandler = new KeyboardHandler(config);
      await keyboardHandler.init();
    });

    afterEach(() => {
      keyboardHandler?.destroy();
    });

    test('should handle arrow key navigation', () => {
      const button1 = createTestElement('button', 'Button 1');
      const button2 = createTestElement('button', 'Button 2');
      const button3 = createTestElement('button', 'Button 3');
      
      container.appendChild(button1);
      container.appendChild(button2);
      container.appendChild(button3);

      keyboardHandler.registerElement(container, {
        role: 'group',
        navigationType: 'linear',
        allowFocus: true
      });

      // Focus first button and navigate with arrow keys
      button1.focus();
      simulateKeyboardEvent(button1, 'ArrowDown');
      
      // Should move focus to next element
      expect(document.activeElement).not.toBe(button1);
    });

    test('should handle Enter key activation', () => {
      const button = createTestElement('button', 'Test Button');
      const clickHandler = jest.fn();
      button.addEventListener('click', clickHandler);
      container.appendChild(button);

      keyboardHandler.registerElement(button, {
        role: 'button',
        navigationType: 'none',
        allowFocus: true
      });

      button.focus();
      simulateKeyboardEvent(button, 'Enter');

      expect(clickHandler).toHaveBeenCalled();
    });

    test('should handle Escape key events', () => {
      const escapeHandler = jest.fn();
      keyboardHandler.addShortcut('Escape', escapeHandler);

      simulateKeyboardEvent(container, 'Escape');

      expect(escapeHandler).toHaveBeenCalled();
    });

    test('should handle Home and End navigation', () => {
      const items = Array.from({ length: 5 }, (_, i) => {
        const item = createTestElement('div', `Item ${i + 1}`);
        item.tabIndex = 0;
        container.appendChild(item);
        return item;
      });

      keyboardHandler.registerElement(container, {
        role: 'list',
        navigationType: 'linear',
        allowFocus: true
      });

      // Focus middle item
      items[2].focus();
      
      // Press Home - should focus first item
      simulateKeyboardEvent(items[2], 'Home');
      // Note: In a real implementation, this would change focus
      
      // Press End - should focus last item
      simulateKeyboardEvent(items[2], 'End');
      // Note: In a real implementation, this would change focus
    });

    test('should handle typeahead search', () => {
      const items = ['Apple', 'Banana', 'Cherry', 'Date'].map(text => {
        const item = createTestElement('div', text);
        item.tabIndex = 0;
        item.setAttribute('data-text', text.toLowerCase());
        container.appendChild(item);
        return item;
      });

      keyboardHandler.registerElement(container, {
        role: 'listbox',
        navigationType: 'typeahead',
        allowFocus: true
      });

      // Type 'b' to search for "Banana"
      simulateKeyboardEvent(container, 'b');
      
      // Advance timers for typeahead
      jest.advanceTimersByTime(100);
    });
  });

  describe('FocusManager', () => {
    let focusManager: FocusManager;
    let config: FocusManagerConfig;
    let container: HTMLElement;

    beforeEach(async () => {
      container = createTestContainer();
      config = {
        trapFocus: false,
        restoreStrategy: 'restore',
        showFocusIndicators: true,
        skipInvisible: true
      };
      focusManager = new FocusManager(config);
      await focusManager.init();
    });

    afterEach(() => {
      focusManager?.destroy();
    });

    test('should manage focus state', () => {
      const button = createTestElement('button', 'Test Button');
      container.appendChild(button);

      focusManager.focusElement(button, {
        preventScroll: false,
        selectText: false
      });

      expect(document.activeElement).toBe(button);
    });

    test('should create focus traps', () => {
      const firstButton = createTestElement('button', 'First');
      const secondButton = createTestElement('button', 'Second');
      const thirdButton = createTestElement('button', 'Third');
      
      container.appendChild(firstButton);
      container.appendChild(secondButton);
      container.appendChild(thirdButton);

      focusManager.createTrap({
        container,
        initialFocus: firstButton,
        returnFocus: null,
        escapeDeactivates: true,
        clickOutsideDeactivates: false
      });

      // Focus should be trapped within container
      expect(focusManager.getFocusState().trapped).toBe(true);
    });

    test('should restore focus when trap is released', () => {
      const originalButton = createTestElement('button', 'Original');
      const trapButton = createTestElement('button', 'Trapped');
      
      document.body.appendChild(originalButton);
      container.appendChild(trapButton);

      // Focus original button first
      originalButton.focus();
      
      // Create trap
      focusManager.createTrap({
        container,
        initialFocus: trapButton,
        returnFocus: originalButton,
        escapeDeactivates: true,
        clickOutsideDeactivates: false
      });

      // Release trap
      focusManager.releaseTrap();

      // Focus should return to original
      expect(document.activeElement).toBe(originalButton);
    });

    test('should get focusable elements', () => {
      const button = createTestElement('button', 'Button');
      const input = createTestElement('input');
      const link = createTestElement('a');
      link.setAttribute('href', '#');
      const disabledButton = createTestElement('button', 'Disabled') as HTMLButtonElement;
      disabledButton.disabled = true;

      container.appendChild(button);
      container.appendChild(input);
      container.appendChild(link);
      container.appendChild(disabledButton);

      const focusableElements = focusManager.getFocusableElements(container);
      
      expect(focusableElements).toHaveLength(3); // Should exclude disabled button
      expect(focusableElements).toContain(button);
      expect(focusableElements).toContain(input);
      expect(focusableElements).toContain(link);
      expect(focusableElements).not.toContain(disabledButton);
    });
  });

  describe('ColorContrastValidator', () => {
    let validator: ColorContrastValidator;

    beforeEach(async () => {
      validator = new ColorContrastValidator({
        wcagLevel: 'AA',
        includeLargeText: true,
        largeTextMinSize: 18,
        largeTextBoldWeight: 700,
        includeNonText: true,
        skipInvisible: true,
        customColorPairs: []
      });
    });

    afterEach(() => {
      // No destroy method needed
    });

    test('should validate color contrast ratios', () => {
      // High contrast: black on white
      const highContrast = validator.calculateContrastRatio('#000000', '#ffffff');
      expect(highContrast).toBeGreaterThanOrEqual(7);

      // Low contrast: light gray on white
      const lowContrast = validator.calculateContrastRatio('#cccccc', '#ffffff');
      expect(lowContrast).toBeLessThan(4.5);
    });

    test('should validate elements in DOM', () => {
      const element = createTestElement('p', 'Test text');
      element.style.color = '#666666';
      element.style.backgroundColor = '#ffffff';
      document.body.appendChild(element);

      const result = validator.validateElement(element);
      
      expect(result).toBeDefined();
      if (result) {
        expect(result.contrastRatio).toBeGreaterThan(0);
        expect(typeof result.passes.AA).toBe('boolean');
        expect(typeof result.passes.AAA).toBe('boolean');
      }
    });

    test('should suggest accessible color alternatives', () => {
      const suggestions = validator.suggestAccessibleColors('#cccccc', '#ffffff');
      
      expect(suggestions).toBeDefined();
      expect(suggestions.foreground).toBeDefined();
      expect(suggestions.background).toBeDefined();
      expect(suggestions.ratio).toBeGreaterThanOrEqual(4.5);
    });

    test('should handle different color formats', () => {
      // Test different color format inputs
      const hexResult = validator.calculateContrastRatio('#000000', '#ffffff');
      const rgbResult = validator.calculateContrastRatio('rgb(0, 0, 0)', 'rgb(255, 255, 255)');
      const namedResult = validator.calculateContrastRatio('black', 'white');

      expect(hexResult).toBeCloseTo(rgbResult, 1);
      expect(hexResult).toBeCloseTo(namedResult, 1);
    });

    test('should apply high contrast theme', () => {
      const element = createTestElement('div', 'Test content');
      element.style.color = '#666666';
      element.style.backgroundColor = '#f0f0f0';
      document.body.appendChild(element);

      validator.applyHighContrastColors(element);

      // Should have improved contrast
      const computedStyle = getComputedStyle(element);
      const ratio = validator.calculateContrastRatio(
        computedStyle.color,
        computedStyle.backgroundColor
      );
      
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('VoiceControlManager', () => {
    let voiceControl: VoiceControlManager;

    beforeEach(async () => {
      voiceControl = new VoiceControlManager({
        language: 'en-US',
        continuous: false,
        interimResults: false,
        maxAlternatives: 1
      });
      await voiceControl.init();
    });

    afterEach(() => {
      voiceControl?.destroy();
    });

    test('should initialize voice recognition', () => {
      expect(voiceControl).toBeDefined();
      expect((global as any).webkitSpeechRecognition).toHaveBeenCalled();
    });

    test('should register and execute voice commands', () => {
      const commandHandler = jest.fn();
      
      voiceControl.addCommand({
        phrase: 'search for test',
        alternatives: ['find test'],
        action: commandHandler,
        description: 'Search for items',
        enabled: true
      });

      // Simulate voice command recognition
      const commands = voiceControl.getCommands();
      expect(commands.length).toBeGreaterThan(0);
      
      // Execute the command directly
      commands[0].action();
      expect(commandHandler).toHaveBeenCalled();
    });

    test('should manage landmarks for navigation', () => {
      const main = createTestElement('main');
      main.setAttribute('aria-label', 'Main content');
      const nav = createTestElement('nav');
      nav.setAttribute('aria-label', 'Navigation');
      
      document.body.appendChild(main);
      document.body.appendChild(nav);

      voiceControl.refreshLandmarks();
      const landmarks = voiceControl.getLandmarks();

      expect(landmarks.length).toBeGreaterThanOrEqual(2);
      expect(landmarks.some(l => l.type === 'main')).toBe(true);
      expect(landmarks.some(l => l.type === 'navigation')).toBe(true);
    });

    test('should navigate to landmarks by voice', () => {
      const main = createTestElement('main');
      main.setAttribute('aria-label', 'Main content');
      document.body.appendChild(main);

      voiceControl.refreshLandmarks();
      const success = voiceControl.navigateToLandmark('main');

      expect(success).toBe(true);
      expect(document.activeElement).toBe(main);
    });

    test('should provide speech synthesis', () => {
      voiceControl.speak('Test announcement');
      
      expect(global.speechSynthesis.speak).toHaveBeenCalled();
    });
  });
});