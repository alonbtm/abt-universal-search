/**
 * Search Input - Basic Search Input UI Component
 * @description Handles search input rendering and user interaction
 */
import type { UIConfig } from '../types/Config';
/**
 * Search input event types
 */
export interface SearchInputEvents {
    'input': (value: string) => void;
    'focus': (event: FocusEvent) => void;
    'blur': (event: FocusEvent) => void;
    'keydown': (event: KeyboardEvent) => void;
    'clear': () => void;
}
/**
 * Search input component for handling user input
 */
export declare class SearchInput {
    private readonly container;
    private readonly config;
    private inputElement;
    private clearButton;
    private eventListeners;
    private isInitialized;
    constructor(container: HTMLElement, config: UIConfig);
    /**
     * Initialize the search input component
     */
    init(): void;
    /**
     * Destroy the component and clean up
     */
    destroy(): void;
    /**
     * Get current input value
     */
    getValue(): string;
    /**
     * Set input value
     */
    setValue(value: string): void;
    /**
     * Focus the input element
     */
    focus(): void;
    /**
     * Blur the input element
     */
    blur(): void;
    /**
     * Clear the input value
     */
    clear(): void;
    /**
     * Set loading state
     */
    setLoading(loading: boolean): void;
    /**
     * Set error state
     */
    setError(error: string | null): void;
    /**
     * Add event listener
     */
    on<K extends keyof SearchInputEvents>(event: K, handler: SearchInputEvents[K]): void;
    /**
     * Remove event listener
     */
    off<K extends keyof SearchInputEvents>(event: K): void;
    /**
     * Render the input component
     */
    private render;
    /**
     * Bind event listeners
     */
    private bindEvents;
    /**
     * Unbind event listeners
     */
    private unbindEvents;
    /**
     * Handle input events
     */
    private handleInput;
    /**
     * Handle focus events
     */
    private handleFocus;
    /**
     * Handle blur events
     */
    private handleBlur;
    /**
     * Handle keydown events
     */
    private handleKeydown;
    /**
     * Handle clear button click
     */
    private handleClear;
    /**
     * Update clear button visibility
     */
    private updateClearButton;
    /**
     * Emit event to listeners
     */
    private emit;
    /**
     * Validate configuration
     */
    private validateConfig;
}
//# sourceMappingURL=SearchInput.d.ts.map