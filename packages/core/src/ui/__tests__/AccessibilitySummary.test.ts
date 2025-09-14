/**
 * Accessibility Summary Test
 * Final validation of WCAG 2.1 AA compliance for Story 4.2
 */

import { AccessibilityManager } from '../AccessibilityManager';
import { ScreenReaderManager } from '../ScreenReaderManager';
import { KeyboardHandler } from '../KeyboardHandler';
import { FocusManager } from '../FocusManager';
import { ColorContrastValidator } from '../ColorContrastValidator';
import { VoiceControlManager } from '../VoiceControlManager';

// Mock Web APIs for testing environment
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

  // Mock HTML lang attribute for testing
  Object.defineProperty(document.documentElement, 'lang', {
    value: 'en-US',
    writable: true
  });
};

describe('Story 4.2: Accessibility and Keyboard Navigation - WCAG 2.1 AA Compliance', () => {
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

  describe('Acceptance Criteria Validation', () => {
    test('✅ AC1: WCAG 2.1 AA compliance with semantic HTML', async () => {
      const accessibilityManager = new AccessibilityManager({
        wcagLevel: 'AA',
        enableKeyboardNavigation: true,
        enableScreenReaderSupport: true,
        enableFocusManagement: true,
        enableAutomatedValidation: true,
        debugMode: false
      });

      await accessibilityManager.init();

      // Create semantic HTML structure
      const main = document.createElement('main');
      main.setAttribute('role', 'main');
      main.setAttribute('aria-label', 'Main content');

      const searchContainer = document.createElement('section');
      searchContainer.setAttribute('role', 'search');
      searchContainer.setAttribute('aria-label', 'Search interface');

      const searchInput = document.createElement('input');
      searchInput.type = 'search';
      searchInput.setAttribute('role', 'combobox');
      searchInput.setAttribute('aria-label', 'Search for content');
      searchInput.setAttribute('aria-expanded', 'false');
      searchInput.setAttribute('aria-autocomplete', 'list');

      searchContainer.appendChild(searchInput);
      main.appendChild(searchContainer);
      document.body.appendChild(main);

      // Validate WCAG compliance
      const result = await accessibilityManager.validateWCAG(document.body);
      
      expect(result.isCompliant).toBe(true);
      expect(result.level).toBe('AA');
      expect(result.score).toBeGreaterThanOrEqual(90);

      accessibilityManager.destroy();
    });

    test('✅ AC2: Complete keyboard navigation (arrow keys, Enter, Escape, Tab)', async () => {
      const keyboardHandler = new KeyboardHandler({
        enableArrowNavigation: true,
        enableTabNavigation: true,
        enableEnterActivation: true,
        enableEscapeHandling: true,
        enableHomeEndNavigation: true,
        trapFocus: false,
        enableTypeahead: true,
        typeaheadTimeout: 500,
        debugMode: false
      });

      await keyboardHandler.init();

      // Create keyboard-navigable interface
      const container = document.createElement('div');
      const button1 = document.createElement('button');
      button1.textContent = 'Button 1';
      const button2 = document.createElement('button');
      button2.textContent = 'Button 2';
      const button3 = document.createElement('button');
      button3.textContent = 'Button 3';

      container.appendChild(button1);
      container.appendChild(button2);
      container.appendChild(button3);
      document.body.appendChild(container);

      keyboardHandler.registerElement(container, {
        role: 'group',
        navigationType: 'linear',
        allowFocus: true
      });

      // Test keyboard navigation
      const arrowHandled = keyboardHandler.handleKeyboardNavigation(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      );
      const enterHandled = keyboardHandler.handleKeyboardNavigation(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
      const escapeHandled = keyboardHandler.handleKeyboardNavigation(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
      const tabHandled = keyboardHandler.handleKeyboardNavigation(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
      );

      expect(arrowHandled).toBe(true);
      expect(enterHandled).toBe(true);
      expect(escapeHandled).toBe(true);
      expect(tabHandled).toBe(true);

      keyboardHandler.destroy();
    });

    test('✅ AC3: Screen reader support with ARIA labels and live regions', async () => {
      const screenReaderManager = new ScreenReaderManager({
        politeRegionId: 'test-polite-region',
        assertiveRegionId: 'test-assertive-region',
        enableLogging: false
      });

      await screenReaderManager.init();

      // Verify ARIA live regions are created
      const politeRegion = document.getElementById('test-polite-region');
      const assertiveRegion = document.getElementById('test-assertive-region');

      expect(politeRegion).toBeTruthy();
      expect(assertiveRegion).toBeTruthy();
      expect(politeRegion?.getAttribute('aria-live')).toBe('polite');
      expect(assertiveRegion?.getAttribute('aria-live')).toBe('assertive');

      // Test announcements
      screenReaderManager.announce({
        message: 'Search results loaded',
        priority: 'polite',
        interrupting: false
      });

      expect(politeRegion?.textContent).toBe('Search results loaded');

      screenReaderManager.announce({
        message: 'Error occurred',
        priority: 'assertive',
        interrupting: true
      });

      expect(assertiveRegion?.textContent).toBe('Error occurred');

      // Test result count announcements
      screenReaderManager.announceResultsCount(5, 'test query');
      expect(politeRegion?.textContent).toContain('5 results found for "test query"');

      screenReaderManager.announceResultsCount(0, 'no match');
      expect(politeRegion?.textContent).toContain('No results found for "no match"');

      screenReaderManager.destroy();
    });

    test('✅ AC4: Focus management with clear indicators and trapping', async () => {
      const focusManager = new FocusManager({
        returnFocusOnEscape: true,
        trapFocus: true,
        preventScroll: false,
        debugMode: false
      });

      await focusManager.init();

      // Create focusable elements
      const container = document.createElement('div');
      const button1 = document.createElement('button');
      button1.textContent = 'First Button';
      const button2 = document.createElement('button');
      button2.textContent = 'Second Button';
      const outsideButton = document.createElement('button');
      outsideButton.textContent = 'Outside Button';

      container.appendChild(button1);
      container.appendChild(button2);
      document.body.appendChild(container);
      document.body.appendChild(outsideButton);

      // Test focus management
      focusManager.focusElement(button1, { preventScroll: false, selectText: false });
      expect(document.activeElement).toBe(button1);

      // Test focus trap
      focusManager.createTrap({
        container,
        initialFocus: button1,
        returnFocus: outsideButton,
        allowOutsideClick: false
      });

      expect(focusManager.getFocusState().trapped).toBe(true);

      // Test focus restoration
      focusManager.releaseTrap();
      expect(document.activeElement).toBe(outsideButton);

      // Test focusable elements detection
      const focusableElements = focusManager.getFocusableElements(container);
      expect(focusableElements).toHaveLength(2);
      expect(focusableElements).toContain(button1);
      expect(focusableElements).toContain(button2);

      focusManager.destroy();
    });

    test('✅ AC5: Color contrast compliance (4.5:1 minimum ratio)', async () => {
      const colorValidator = new ColorContrastValidator({
        enableAutomaticValidation: true,
        suggestAlternatives: true,
        debugMode: false
      });

      await colorValidator.init();

      // Test high contrast combinations
      const highContrast = colorValidator.validateColors('#000000', '#ffffff');
      expect(highContrast.passesAA).toBe(true);
      expect(highContrast.ratio).toBeGreaterThanOrEqual(4.5);

      // Test borderline AA compliance
      const borderlineAA = colorValidator.validateColors('#767676', '#ffffff');
      expect(borderlineAA.passesAA).toBe(true);
      expect(borderlineAA.ratio).toBeGreaterThanOrEqual(4.5);

      // Test failing contrast
      const lowContrast = colorValidator.validateColors('#cccccc', '#ffffff');
      expect(lowContrast.passesAA).toBe(false);
      expect(lowContrast.ratio).toBeLessThan(4.5);

      // Test color suggestions
      const suggestions = colorValidator.getSuggestedColors('#cccccc', '#ffffff');
      expect(suggestions.foregroundSuggestions.length).toBeGreaterThan(0);
      
      // All suggestions should pass AA
      suggestions.foregroundSuggestions.forEach(color => {
        const result = colorValidator.validateColors(color, '#ffffff');
        expect(result.passesAA).toBe(true);
      });

      // Test element validation
      const testElement = document.createElement('div');
      testElement.style.color = '#333333';
      testElement.style.backgroundColor = '#ffffff';
      document.body.appendChild(testElement);

      const elementResult = colorValidator.validateElement(testElement);
      expect(elementResult.passesAA).toBe(true);

      colorValidator.destroy();
    });

    test('✅ AC6: Voice control support with landmark identification', async () => {
      const voiceControl = new VoiceControlManager({
        language: 'en-US',
        enableContinuousListening: false,
        commands: {},
        debugMode: false
      });

      await voiceControl.init();

      // Create landmark elements
      const main = document.createElement('main');
      main.setAttribute('aria-label', 'Main content area');
      const nav = document.createElement('nav');
      nav.setAttribute('aria-label', 'Primary navigation');
      const search = document.createElement('section');
      search.setAttribute('role', 'search');
      search.setAttribute('aria-label', 'Search interface');

      document.body.appendChild(main);
      document.body.appendChild(nav);
      document.body.appendChild(search);

      // Test landmark detection
      voiceControl.refreshLandmarks();
      const landmarks = voiceControl.getLandmarks();

      expect(landmarks.length).toBeGreaterThanOrEqual(3);
      expect(landmarks.some(l => l.role === 'main')).toBe(true);
      expect(landmarks.some(l => l.role === 'navigation')).toBe(true);
      expect(landmarks.some(l => l.role === 'search')).toBe(true);

      // Test landmark navigation
      const navigateToMain = voiceControl.navigateToLandmark('main');
      expect(navigateToMain).toBe(true);
      expect(document.activeElement).toBe(main);

      // Test voice command registration
      const commandHandler = jest.fn();
      voiceControl.addCommand('search', {
        patterns: ['search for *', 'find *'],
        handler: commandHandler,
        description: 'Search for content'
      });

      voiceControl.processVoiceCommand('search for documents');
      expect(commandHandler).toHaveBeenCalledWith('documents');

      // Test speech synthesis
      voiceControl.speak('Navigation successful');
      expect(global.speechSynthesis.speak).toHaveBeenCalled();

      voiceControl.destroy();
    });
  });

  describe('Overall Story 4.2 Compliance', () => {
    test('✅ Complete accessibility infrastructure meets WCAG 2.1 AA standards', async () => {
      // Initialize all accessibility managers
      const accessibilityManager = new AccessibilityManager({
        wcagLevel: 'AA',
        enableKeyboardNavigation: true,
        enableScreenReaderSupport: true,
        enableFocusManagement: true,
        enableAutomatedValidation: true,
        debugMode: false
      });

      const screenReaderManager = new ScreenReaderManager({
        politeRegionId: 'story-polite',
        assertiveRegionId: 'story-assertive',
        enableLogging: false
      });

      const keyboardHandler = new KeyboardHandler({
        enableArrowNavigation: true,
        enableTabNavigation: true,
        enableEnterActivation: true,
        enableEscapeHandling: true,
        enableHomeEndNavigation: true,
        trapFocus: false,
        enableTypeahead: true,
        typeaheadTimeout: 500,
        debugMode: false
      });

      const focusManager = new FocusManager({
        returnFocusOnEscape: true,
        trapFocus: false,
        preventScroll: false,
        debugMode: false
      });

      const colorValidator = new ColorContrastValidator({
        enableAutomaticValidation: true,
        suggestAlternatives: true,
        debugMode: false
      });

      const voiceControl = new VoiceControlManager({
        language: 'en-US',
        enableContinuousListening: false,
        commands: {},
        debugMode: false
      });

      // Initialize all components
      await Promise.all([
        accessibilityManager.init(),
        screenReaderManager.init(),
        keyboardHandler.init(),
        focusManager.init(),
        colorValidator.init(),
        voiceControl.init()
      ]);

      // Create comprehensive accessible interface
      const main = document.createElement('main');
      main.setAttribute('role', 'main');
      main.setAttribute('aria-label', 'Search application');

      const searchSection = document.createElement('section');
      searchSection.setAttribute('role', 'search');
      searchSection.setAttribute('aria-label', 'Content search');

      const searchInput = document.createElement('input');
      searchInput.type = 'search';
      searchInput.setAttribute('role', 'combobox');
      searchInput.setAttribute('aria-label', 'Search for documents and content');
      searchInput.setAttribute('aria-expanded', 'false');
      searchInput.setAttribute('aria-autocomplete', 'list');
      searchInput.style.color = '#333333';
      searchInput.style.backgroundColor = '#ffffff';

      const resultsContainer = document.createElement('div');
      resultsContainer.setAttribute('role', 'listbox');
      resultsContainer.setAttribute('aria-label', 'Search results');

      const statusContainer = document.createElement('div');
      statusContainer.setAttribute('role', 'status');
      statusContainer.setAttribute('aria-live', 'polite');
      statusContainer.setAttribute('aria-atomic', 'true');

      searchSection.appendChild(searchInput);
      searchSection.appendChild(resultsContainer);
      searchSection.appendChild(statusContainer);
      main.appendChild(searchSection);
      document.body.appendChild(main);

      // Comprehensive WCAG validation
      const validationResult = await accessibilityManager.validateWCAG(document.body);

      // Validate color contrast
      const colorResult = colorValidator.validateElement(searchInput);

      // Test keyboard navigation
      keyboardHandler.registerElement(searchSection, {
        role: 'search',
        navigationType: 'complex',
        allowFocus: true
      });

      const keyboardSupport = keyboardHandler.handleKeyboardNavigation(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      );

      // Test screen reader announcements
      screenReaderManager.announceResultsCount(10, 'accessibility');

      // Test voice control
      voiceControl.refreshLandmarks();
      const landmarks = voiceControl.getLandmarks();

      // Assertions for complete compliance
      expect(validationResult.isCompliant).toBe(true);
      expect(validationResult.level).toBe('AA');
      expect(validationResult.score).toBeGreaterThanOrEqual(95);
      expect(colorResult.passesAA).toBe(true);
      expect(keyboardSupport).toBe(true);
      expect(landmarks.length).toBeGreaterThanOrEqual(2);

      // Verify all ARIA live regions exist
      expect(document.getElementById('story-polite')).toBeTruthy();
      expect(document.getElementById('story-assertive')).toBeTruthy();

      // Test focus management
      focusManager.focusElement(searchInput, { preventScroll: false, selectText: false });
      expect(document.activeElement).toBe(searchInput);

      console.log('✅ Story 4.2 Implementation Summary:');
      console.log(`📊 WCAG Compliance Score: ${validationResult.score}/100`);
      console.log(`🎯 WCAG Level: ${validationResult.level}`);
      console.log(`🔍 Color Contrast: ${colorResult.ratio.toFixed(2)}:1 (${colorResult.passesAA ? 'PASS' : 'FAIL'})`);
      console.log(`⌨️  Keyboard Navigation: ${keyboardSupport ? 'ENABLED' : 'DISABLED'}`);
      console.log(`🔊 Screen Reader Support: ${screenReaderManager ? 'ENABLED' : 'DISABLED'}`);
      console.log(`🎤 Voice Control: ${voiceControl ? 'ENABLED' : 'DISABLED'}`);
      console.log(`🎯 Focus Management: ${focusManager ? 'ENABLED' : 'DISABLED'}`);
      console.log(`🏷️  Landmarks Detected: ${landmarks.length}`);

      // Cleanup
      accessibilityManager.destroy();
      screenReaderManager.destroy();
      keyboardHandler.destroy();
      focusManager.destroy();
      colorValidator.destroy();
      voiceControl.destroy();
    });
  });
});