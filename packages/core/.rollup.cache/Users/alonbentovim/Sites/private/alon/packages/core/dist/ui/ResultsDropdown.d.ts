/**
 * Results Dropdown - Search Results Display Component
 * @description Handles rendering and interaction with search results list
 */
import type { SearchResult } from '../types/Results';
import type { UIConfig } from '../types/Config';
/**
 * Results dropdown event types
 */
export interface ResultsDropdownEvents {
    'select': (result: SearchResult, index: number) => void;
    'navigate': (direction: 'up' | 'down' | 'first' | 'last') => void;
    'close': () => void;
}
/**
 * Results dropdown component for displaying search results
 */
export declare class ResultsDropdown {
    private readonly container;
    private readonly config;
    private dropdownElement;
    private listElement;
    private results;
    private selectedIndex;
    private eventListeners;
    private isInitialized;
    private isVisible;
    constructor(container: HTMLElement, config: UIConfig);
    /**
     * Initialize the results dropdown component
     */
    init(): void;
    /**
     * Destroy the component and clean up
     */
    destroy(): void;
    /**
     * Show results in the dropdown
     */
    showResults(results: SearchResult[]): void;
    /**
     * Clear and hide results
     */
    clearResults(): void;
    /**
     * Show loading state
     */
    showLoading(): void;
    /**
     * Show error state
     */
    showError(message: string): void;
    /**
     * Show no results state
     */
    showNoResults(): void;
    /**
     * Hide the dropdown
     */
    hide(): void;
    /**
     * Show the dropdown
     */
    show(): void;
    /**
     * Navigate through results
     */
    navigate(direction: 'up' | 'down' | 'first' | 'last'): void;
    /**
     * Select result at current index
     */
    selectCurrent(): void;
    /**
     * Get selected result
     */
    getSelectedResult(): SearchResult | null;
    /**
     * Set selected index
     */
    setSelectedIndex(index: number): void;
    /**
     * Check if dropdown is visible
     */
    isOpen(): boolean;
    /**
     * Add event listener
     */
    on<K extends keyof ResultsDropdownEvents>(event: K, handler: ResultsDropdownEvents[K]): void;
    /**
     * Remove event listener
     */
    off<K extends keyof ResultsDropdownEvents>(event: K): void;
    /**
     * Render the dropdown component
     */
    private render;
    /**
     * Render search results
     */
    private renderResults;
    /**
     * Create a result item element
     */
    private createResultItem;
    /**
     * Create loading item
     */
    private createLoadingItem;
    /**
     * Create error item
     */
    private createErrorItem;
    /**
     * Create no results item
     */
    private createNoResultsItem;
    /**
     * Update selection visual state
     */
    private updateSelection;
    /**
     * Bind event listeners
     */
    private bindEvents;
    /**
     * Unbind event listeners
     */
    private unbindEvents;
    /**
     * Handle click events
     */
    private handleClick;
    /**
     * Handle mouse enter events
     */
    private handleMouseEnter;
    /**
     * Emit event to listeners
     */
    private emit;
    /**
     * Validate configuration
     */
    private validateConfig;
}
//# sourceMappingURL=ResultsDropdown.d.ts.map