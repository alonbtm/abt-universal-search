/**
 * Accessibility Type Definitions
 * Comprehensive TypeScript interfaces for WCAG 2.1 AA compliance and assistive technology support
 */
/**
 * WCAG 2.1 compliance levels
 */
export type WCAGLevel = 'A' | 'AA' | 'AAA';
/**
 * ARIA role types for semantic HTML
 */
export type ARIARole = 'alert' | 'alertdialog' | 'application' | 'article' | 'banner' | 'button' | 'cell' | 'checkbox' | 'columnheader' | 'combobox' | 'complementary' | 'contentinfo' | 'definition' | 'dialog' | 'directory' | 'document' | 'feed' | 'figure' | 'form' | 'grid' | 'gridcell' | 'group' | 'heading' | 'img' | 'link' | 'list' | 'listbox' | 'listitem' | 'log' | 'main' | 'marquee' | 'math' | 'menu' | 'menubar' | 'menuitem' | 'menuitemcheckbox' | 'menuitemradio' | 'navigation' | 'none' | 'note' | 'option' | 'presentation' | 'progressbar' | 'radio' | 'radiogroup' | 'region' | 'row' | 'rowgroup' | 'rowheader' | 'scrollbar' | 'search' | 'searchbox' | 'separator' | 'slider' | 'spinbutton' | 'status' | 'switch' | 'tab' | 'table' | 'tablist' | 'tabpanel' | 'term' | 'textbox' | 'timer' | 'toolbar' | 'tooltip' | 'tree' | 'treegrid' | 'treeitem';
/**
 * ARIA live region politeness levels
 */
export type ARIALive = 'off' | 'polite' | 'assertive';
/**
 * ARIA autocomplete values
 */
export type ARIAAutocomplete = 'none' | 'inline' | 'list' | 'both';
/**
 * ARIA expanded states
 */
export type ARIAExpanded = 'true' | 'false' | 'undefined';
/**
 * ARIA pressed states
 */
export type ARIAPressed = 'true' | 'false' | 'mixed' | 'undefined';
/**
 * ARIA checked states
 */
export type ARIAChecked = 'true' | 'false' | 'mixed' | 'undefined';
/**
 * ARIA selected states
 */
export type ARIASelected = 'true' | 'false' | 'undefined';
/**
 * Keyboard navigation directions
 */
export type NavigationDirection = 'up' | 'down' | 'left' | 'right' | 'first' | 'last';
/**
 * Keyboard event types for navigation
 */
export type KeyboardEventType = 'keydown' | 'keyup' | 'keypress';
/**
 * Focus management strategy
 */
export type FocusStrategy = 'restore' | 'first' | 'last' | 'none';
/**
 * Screen reader announcement priority
 */
export type AnnouncementPriority = 'low' | 'medium' | 'high' | 'urgent';
/**
 * Assistive technology types
 */
export type AssistiveTechnology = 'screen-reader' | 'voice-control' | 'switch-navigation' | 'magnifier';
/**
 * Color contrast compliance levels
 */
export interface ColorContrastLevel {
    level: WCAGLevel;
    minimumRatio: number;
    largeTextRatio: number;
}
/**
 * ARIA attributes interface
 */
export interface ARIAAttributes {
    'aria-autocomplete'?: ARIAAutocomplete;
    'aria-checked'?: ARIAChecked;
    'aria-disabled'?: boolean;
    'aria-expanded'?: ARIAExpanded;
    'aria-haspopup'?: boolean | 'false' | 'true' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
    'aria-hidden'?: boolean;
    'aria-invalid'?: boolean | 'false' | 'true' | 'grammar' | 'spelling';
    'aria-label'?: string;
    'aria-level'?: number;
    'aria-multiline'?: boolean;
    'aria-multiselectable'?: boolean;
    'aria-orientation'?: 'horizontal' | 'vertical' | 'undefined';
    'aria-pressed'?: ARIAPressed;
    'aria-readonly'?: boolean;
    'aria-required'?: boolean;
    'aria-selected'?: ARIASelected;
    'aria-sort'?: 'none' | 'ascending' | 'descending' | 'other';
    'aria-valuemax'?: number;
    'aria-valuemin'?: number;
    'aria-valuenow'?: number;
    'aria-valuetext'?: string;
    'aria-atomic'?: boolean;
    'aria-busy'?: boolean;
    'aria-live'?: ARIALive;
    'aria-relevant'?: string;
    'aria-dropeffect'?: 'none' | 'copy' | 'execute' | 'link' | 'move' | 'popup';
    'aria-grabbed'?: boolean | 'undefined';
    'aria-activedescendant'?: string;
    'aria-colcount'?: number;
    'aria-colindex'?: number;
    'aria-colspan'?: number;
    'aria-controls'?: string;
    'aria-describedby'?: string;
    'aria-details'?: string;
    'aria-errormessage'?: string;
    'aria-flowto'?: string;
    'aria-labelledby'?: string;
    'aria-owns'?: string;
    'aria-posinset'?: number;
    'aria-rowcount'?: number;
    'aria-rowindex'?: number;
    'aria-rowspan'?: number;
    'aria-setsize'?: number;
}
/**
 * Keyboard navigation configuration
 */
export interface KeyboardNavigationConfig {
    /** Enable arrow key navigation */
    enableArrowKeys: boolean;
    /** Enable Enter key selection */
    enableEnterKey: boolean;
    /** Enable Escape key closing */
    enableEscapeKey: boolean;
    /** Enable Tab navigation */
    enableTabNavigation: boolean;
    /** Enable Home/End keys for first/last navigation */
    enableHomeEndKeys: boolean;
    /** Enable Page Up/Down for bulk navigation */
    enablePageKeys: boolean;
    /** Custom keyboard shortcuts */
    customShortcuts: Map<string, () => void>;
    /** Trap focus within component */
    trapFocus: boolean;
    /** Circular navigation */
    circularNavigation: boolean;
}
/**
 * Focus management configuration
 */
export interface FocusManagementConfig {
    /** Focus trapping enabled */
    trapFocus: boolean;
    /** Focus restoration strategy */
    restoreStrategy: FocusStrategy;
    /** Initial focus target */
    initialFocus?: HTMLElement | string;
    /** Focus visible indicators */
    showFocusIndicators: boolean;
    /** Focus outline color */
    focusOutlineColor?: string;
    /** Focus outline width */
    focusOutlineWidth?: string;
    /** Skip invisible elements */
    skipInvisible: boolean;
}
/**
 * Screen reader announcement
 */
export interface ScreenReaderAnnouncement {
    /** Message to announce */
    message: string;
    /** Priority level */
    priority: AnnouncementPriority;
    /** ARIA live region type */
    liveRegion: ARIALive;
    /** Delay before announcement (ms) */
    delay?: number;
    /** Clear previous announcements */
    clearPrevious?: boolean;
}
/**
 * Accessibility validation result
 */
export interface AccessibilityValidationResult {
    /** Overall compliance status */
    isCompliant: boolean;
    /** WCAG level achieved */
    level: WCAGLevel;
    /** List of violations */
    violations: AccessibilityViolation[];
    /** List of warnings */
    warnings: AccessibilityWarning[];
    /** Overall score (0-100) */
    score: number;
    /** Timestamp of validation */
    timestamp: Date;
}
/**
 * Accessibility violation details
 */
export interface AccessibilityViolation {
    /** Violation ID */
    id: string;
    /** Violation description */
    description: string;
    /** WCAG criterion */
    criterion: string;
    /** Severity level */
    severity: 'minor' | 'moderate' | 'serious' | 'critical';
    /** Affected elements */
    elements: HTMLElement[];
    /** How to fix */
    fixSuggestion: string;
    /** Help URL */
    helpUrl?: string;
}
/**
 * Accessibility warning details
 */
export interface AccessibilityWarning {
    /** Warning ID */
    id: string;
    /** Warning description */
    description: string;
    /** Affected elements */
    elements: HTMLElement[];
    /** Recommendation */
    recommendation: string;
}
/**
 * Color contrast check result
 */
export interface ColorContrastResult {
    /** Contrast ratio value */
    ratio: number;
    /** Passes AA level */
    passesAA: boolean;
    /** Passes AAA level */
    passesAAA: boolean;
    /** Foreground color */
    foregroundColor: string;
    /** Background color */
    backgroundColor: string;
    /** Is large text */
    isLargeText: boolean;
}
/**
 * Voice control command
 */
export interface VoiceControlCommand {
    /** Command phrase */
    phrase: string;
    /** Alternative phrases */
    alternatives?: string[];
    /** Action to execute */
    action: () => void;
    /** Command description */
    description: string;
    /** Enabled state */
    enabled: boolean;
}
/**
 * Landmark information for voice control
 */
export interface LandmarkInfo {
    /** Element reference */
    element: HTMLElement;
    /** Landmark type */
    type: ARIARole;
    /** Accessible name */
    name: string;
    /** Description */
    description?: string;
    /** Level (for headings) */
    level?: number;
}
/**
 * Accessibility manager configuration
 */
export interface AccessibilityConfig {
    /** Target WCAG compliance level */
    wcagLevel: WCAGLevel;
    /** Enable keyboard navigation */
    enableKeyboardNavigation: boolean;
    /** Enable screen reader support */
    enableScreenReaderSupport: boolean;
    /** Enable focus management */
    enableFocusManagement: boolean;
    /** Enable voice control */
    enableVoiceControl: boolean;
    /** Enable high contrast mode */
    enableHighContrastMode: boolean;
    /** Enable reduced motion */
    respectReducedMotion: boolean;
    /** Enable automated validation */
    enableAutomatedValidation: boolean;
    /** Validation interval (ms) */
    validationInterval?: number;
    /** Debug mode */
    debugMode: boolean;
}
/**
 * Accessibility event types
 */
export interface AccessibilityEvents {
    /** Focus change event */
    'focus-change': (element: HTMLElement, previousElement: HTMLElement | null) => void;
    /** Keyboard navigation event */
    'keyboard-navigation': (direction: NavigationDirection, currentIndex: number) => void;
    /** Screen reader announcement */
    'screen-reader-announcement': (announcement: ScreenReaderAnnouncement) => void;
    /** Accessibility violation detected */
    'violation-detected': (violation: AccessibilityViolation) => void;
    /** Voice command executed */
    'voice-command': (command: VoiceControlCommand) => void;
    /** Focus trapped */
    'focus-trapped': (container: HTMLElement) => void;
    /** Focus restored */
    'focus-restored': (element: HTMLElement) => void;
}
/**
 * Assistive technology detection result
 */
export interface AssistiveTechnologyDetection {
    /** Screen reader detected */
    screenReader: boolean;
    /** Screen reader name */
    screenReaderName?: string;
    /** Voice control detected */
    voiceControl: boolean;
    /** Switch navigation detected */
    switchNavigation: boolean;
    /** High contrast mode */
    highContrastMode: boolean;
    /** Reduced motion preference */
    reducedMotion: boolean;
    /** Touch support */
    touchSupport: boolean;
    /** Keyboard-only navigation */
    keyboardOnly: boolean;
}
/**
 * Accessibility test configuration
 */
export interface AccessibilityTestConfig {
    /** Include WCAG 2.1 tests */
    includeWCAG21: boolean;
    /** Include keyboard navigation tests */
    includeKeyboardTests: boolean;
    /** Include screen reader tests */
    includeScreenReaderTests: boolean;
    /** Include color contrast tests */
    includeColorContrastTests: boolean;
    /** Include focus management tests */
    includeFocusTests: boolean;
    /** Include voice control tests */
    includeVoiceControlTests: boolean;
    /** Test timeout (ms) */
    timeout: number;
    /** Retry attempts */
    retryAttempts: number;
}
/**
 * Accessibility metrics
 */
export interface AccessibilityMetrics {
    /** Total elements tested */
    totalElements: number;
    /** Accessible elements */
    accessibleElements: number;
    /** Violations found */
    violationsFound: number;
    /** Warnings issued */
    warningsIssued: number;
    /** Keyboard navigable elements */
    keyboardNavigableElements: number;
    /** Elements with ARIA labels */
    ariaLabeledElements: number;
    /** Color contrast compliant elements */
    colorContrastCompliantElements: number;
    /** Average contrast ratio */
    averageContrastRatio: number;
    /** Test duration (ms) */
    testDuration: number;
    /** Compliance score (0-100) */
    complianceScore: number;
}
/**
 * Accessibility preferences
 */
export interface AccessibilityPreferences {
    /** Preferred color scheme */
    colorScheme: 'light' | 'dark' | 'auto' | 'high-contrast';
    /** Reduced motion preference */
    reducedMotion: boolean;
    /** Increased font size */
    increasedFontSize: boolean;
    /** Font size multiplier */
    fontSizeMultiplier: number;
    /** Enhanced focus indicators */
    enhancedFocusIndicators: boolean;
    /** Audio announcements */
    audioAnnouncements: boolean;
    /** Keyboard navigation only */
    keyboardOnly: boolean;
    /** Voice control enabled */
    voiceControlEnabled: boolean;
}
//# sourceMappingURL=Accessibility.d.ts.map