/**
 * Results Dropdown - Search Results Display Component
 * @description Handles rendering and interaction with search results list
 */

import type { SearchResult } from '../types/Results';
import type { UIConfig } from '../types/Config';
import { ValidationError } from '../utils/validation';

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
export class ResultsDropdown {
  private readonly container: HTMLElement;
  private readonly config: UIConfig;
  private dropdownElement: HTMLElement | null = null;
  private listElement: HTMLElement | null = null;
  private results: SearchResult[] = [];
  private selectedIndex = -1;
  private eventListeners: Map<keyof ResultsDropdownEvents, Function> = new Map();
  private isInitialized = false;
  private isVisible = false;

  constructor(container: HTMLElement, config: UIConfig) {
    if (!container || !(container instanceof HTMLElement)) {
      throw new ValidationError('Container must be a valid HTMLElement');
    }

    this.container = container;
    this.config = { ...config };
    this.validateConfig();
  }

  /**
   * Initialize the results dropdown component
   */
  public init(): void {
    if (this.isInitialized) {
      return;
    }

    this.render();
    this.bindEvents();
    this.isInitialized = true;
  }

  /**
   * Destroy the component and clean up
   */
  public destroy(): void {
    if (!this.isInitialized) {
      return;
    }

    this.unbindEvents();
    this.container.innerHTML = '';
    this.dropdownElement = null;
    this.listElement = null;
    this.results = [];
    this.selectedIndex = -1;
    this.eventListeners.clear();
    this.isInitialized = false;
    this.isVisible = false;
  }

  /**
   * Show results in the dropdown
   */
  public showResults(results: SearchResult[]): void {
    if (!Array.isArray(results)) {
      throw new ValidationError('Results must be an array');
    }

    this.results = [...results];
    this.selectedIndex = -1;
    this.renderResults();
    this.show();
  }

  /**
   * Clear and hide results
   */
  public clearResults(): void {
    this.results = [];
    this.selectedIndex = -1;
    this.renderResults();
    this.hide();
  }

  /**
   * Show loading state
   */
  public showLoading(): void {
    if (!this.listElement) return;

    this.listElement.innerHTML = '';
    const loadingItem = this.createLoadingItem();
    this.listElement.appendChild(loadingItem);
    this.show();
  }

  /**
   * Show error state
   */
  public showError(message: string): void {
    if (!this.listElement) return;

    this.listElement.innerHTML = '';
    const errorItem = this.createErrorItem(message);
    this.listElement.appendChild(errorItem);
    this.show();
  }

  /**
   * Show no results state
   */
  public showNoResults(): void {
    if (!this.listElement) return;

    this.listElement.innerHTML = '';
    const noResultsItem = this.createNoResultsItem();
    this.listElement.appendChild(noResultsItem);
    this.show();
  }

  /**
   * Hide the dropdown
   */
  public hide(): void {
    if (this.dropdownElement) {
      this.dropdownElement.style.display = 'none';
      this.dropdownElement.setAttribute('aria-hidden', 'true');
      this.isVisible = false;
    }
  }

  /**
   * Show the dropdown
   */
  public show(): void {
    if (this.dropdownElement) {
      this.dropdownElement.style.display = 'block';
      this.dropdownElement.setAttribute('aria-hidden', 'false');
      this.isVisible = true;
    }
  }

  /**
   * Navigate through results
   */
  public navigate(direction: 'up' | 'down' | 'first' | 'last'): void {
    if (this.results.length === 0) return;

    let newIndex = this.selectedIndex;

    switch (direction) {
      case 'up':
        newIndex = newIndex <= 0 ? this.results.length - 1 : newIndex - 1;
        break;
      case 'down':
        newIndex = newIndex >= this.results.length - 1 ? 0 : newIndex + 1;
        break;
      case 'first':
        newIndex = 0;
        break;
      case 'last':
        newIndex = this.results.length - 1;
        break;
    }

    this.setSelectedIndex(newIndex);
    this.emit('navigate', direction);
  }

  /**
   * Select result at current index
   */
  public selectCurrent(): void {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.results.length) {
      const result = this.results[this.selectedIndex];
      if (result) {
        this.emit('select', result, this.selectedIndex);
      }
    }
  }

  /**
   * Get selected result
   */
  public getSelectedResult(): SearchResult | null {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.results.length) {
      return this.results[this.selectedIndex] || null;
    }
    return null;
  }

  /**
   * Set selected index
   */
  public setSelectedIndex(index: number): void {
    const oldIndex = this.selectedIndex;
    this.selectedIndex = Math.max(-1, Math.min(index, this.results.length - 1));
    
    if (oldIndex !== this.selectedIndex) {
      this.updateSelection();
    }
  }

  /**
   * Check if dropdown is visible
   */
  public isOpen(): boolean {
    return this.isVisible;
  }

  /**
   * Add event listener
   */
  public on<K extends keyof ResultsDropdownEvents>(event: K, handler: ResultsDropdownEvents[K]): void {
    this.eventListeners.set(event, handler as Function);
  }

  /**
   * Remove event listener
   */
  public off<K extends keyof ResultsDropdownEvents>(event: K): void {
    this.eventListeners.delete(event);
  }

  /**
   * Render the dropdown component
   */
  private render(): void {
    this.dropdownElement = document.createElement('div');
    this.dropdownElement.className = 'search-dropdown';
    this.dropdownElement.style.display = 'none';
    this.dropdownElement.setAttribute('aria-hidden', 'true');

    this.listElement = document.createElement('ul');
    this.listElement.className = 'search-results';
    this.listElement.setAttribute('role', 'listbox');
    this.listElement.setAttribute('aria-label', 'Search results');

    // RTL support
    if (this.config.rtl) {
      this.dropdownElement.dir = 'rtl';
    }

    this.dropdownElement.appendChild(this.listElement);
    this.container.appendChild(this.dropdownElement);
  }

  /**
   * Render search results
   */
  private renderResults(): void {
    if (!this.listElement) return;

    this.listElement.innerHTML = '';

    if (this.results.length === 0) {
      return;
    }

    const maxResults = Math.min(this.results.length, this.config.maxResults);

    for (let i = 0; i < maxResults; i++) {
      const result = this.results[i];
      if (result) {
        const resultItem = this.createResultItem(result, i);
        this.listElement.appendChild(resultItem);
      }
    }

    this.updateSelection();
  }

  /**
   * Create a result item element
   */
  private createResultItem(result: SearchResult, index: number): HTMLElement {
    const listItem = document.createElement('li');
    listItem.className = 'search-result';
    listItem.setAttribute('role', 'option');
    listItem.setAttribute('data-index', String(index));
    
    const title = document.createElement('div');
    title.className = 'result-title';
    title.textContent = result.title;

    listItem.appendChild(title);

    if (result.description) {
      const description = document.createElement('div');
      description.className = 'result-description';
      description.textContent = result.description;
      listItem.appendChild(description);
    }

    // Add metadata if available
    if (result.metadata?.category) {
      const category = document.createElement('div');
      category.className = 'result-category';
      category.textContent = String(result.metadata.category);
      listItem.appendChild(category);
    }

    return listItem;
  }

  /**
   * Create loading item
   */
  private createLoadingItem(): HTMLElement {
    const listItem = document.createElement('li');
    listItem.className = 'search-loading';
    listItem.setAttribute('role', 'status');
    listItem.setAttribute('aria-live', 'polite');
    listItem.textContent = this.config.loadingText || 'Loading...';
    return listItem;
  }

  /**
   * Create error item
   */
  private createErrorItem(message: string): HTMLElement {
    const listItem = document.createElement('li');
    listItem.className = 'search-error';
    listItem.setAttribute('role', 'alert');
    listItem.textContent = message;
    return listItem;
  }

  /**
   * Create no results item
   */
  private createNoResultsItem(): HTMLElement {
    const listItem = document.createElement('li');
    listItem.className = 'search-no-results';
    listItem.setAttribute('role', 'status');
    listItem.textContent = this.config.noResultsText || 'No results found';
    return listItem;
  }

  /**
   * Update selection visual state
   */
  private updateSelection(): void {
    if (!this.listElement) return;

    const items = this.listElement.querySelectorAll('.search-result');
    
    items.forEach((item, index) => {
      const isSelected = index === this.selectedIndex;
      
      if (isSelected) {
        item.classList.add('selected');
        item.setAttribute('aria-selected', 'true');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('selected');
        item.setAttribute('aria-selected', 'false');
      }
    });
  }

  /**
   * Bind event listeners
   */
  private bindEvents(): void {
    if (!this.listElement) return;

    this.listElement.addEventListener('click', this.handleClick.bind(this));
    this.listElement.addEventListener('mouseenter', this.handleMouseEnter.bind(this), true);
  }

  /**
   * Unbind event listeners
   */
  private unbindEvents(): void {
    if (!this.listElement) return;

    this.listElement.removeEventListener('click', this.handleClick.bind(this));
    this.listElement.removeEventListener('mouseenter', this.handleMouseEnter.bind(this), true);
  }

  /**
   * Handle click events
   */
  private handleClick(event: Event): void {
    const target = event.target as HTMLElement;
    const resultItem = target.closest('.search-result') as HTMLElement;
    
    if (resultItem) {
      const index = parseInt(resultItem.getAttribute('data-index') || '-1');
      if (index >= 0 && index < this.results.length) {
        this.setSelectedIndex(index);
        this.selectCurrent();
      }
    }
  }

  /**
   * Handle mouse enter events
   */
  private handleMouseEnter(event: Event): void {
    const target = event.target as HTMLElement;
    const resultItem = target.closest('.search-result') as HTMLElement;
    
    if (resultItem) {
      const index = parseInt(resultItem.getAttribute('data-index') || '-1');
      if (index >= 0 && index < this.results.length) {
        this.setSelectedIndex(index);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private emit<K extends keyof ResultsDropdownEvents>(event: K, ...args: Parameters<ResultsDropdownEvents[K]>): void {
    const handler = this.eventListeners.get(event);
    if (handler) {
      try {
        (handler as any)(...args);
      } catch (error) {
        console.error(`[ResultsDropdown] Error in ${event} handler:`, error);
      }
    }
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (typeof this.config.maxResults !== 'number' || this.config.maxResults <= 0) {
      throw new ValidationError('maxResults must be a positive number', 'maxResults');
    }

    if (typeof this.config.loadingText !== 'string') {
      throw new ValidationError('loadingText must be a string', 'loadingText');
    }

    if (typeof this.config.noResultsText !== 'string') {
      throw new ValidationError('noResultsText must be a string', 'noResultsText');
    }

    if (typeof this.config.rtl !== 'boolean') {
      throw new ValidationError('rtl must be a boolean', 'rtl');
    }
  }
}