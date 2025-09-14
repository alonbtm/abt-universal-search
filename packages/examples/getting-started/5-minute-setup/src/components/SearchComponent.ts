/**
 * Main Search Component
 * A TypeScript class that creates and manages the search interface
 */

import { SearchConfig, SearchItem, SearchState, PerformanceMetrics } from '../types/search';
import { ApiClient, MockApiClient, handleApiError, validateConfig } from '../utils/api';
import { SearchEngine, debounce, highlightMatches, extractFilterOptions, applyFilters, PerformanceMonitor } from '../utils/search';

export class UniversalSearch {
  private config: SearchConfig;
  private container: HTMLElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private resultsContainer: HTMLElement | null = null;
  private loadingIndicator: HTMLElement | null = null;
  private errorContainer: HTMLElement | null = null;
  private filtersContainer: HTMLElement | null = null;

  private state: SearchState = {
    loading: false,
    error: null,
    results: [],
    query: '',
    totalCount: 0,
    currentPage: 1,
  };

  private apiClient: ApiClient | MockApiClient | null = null;
  private searchEngine: SearchEngine;
  private performanceMonitor: PerformanceMonitor;
  private debouncedSearch: (...args: any[]) => void;
  private activeFilters: Record<string, any> = {};

  constructor(config: SearchConfig) {
    validateConfig(config);
    
    this.config = {
      searchKeys: ['name', 'category', 'description'],
      placeholder: 'Search...',
      maxResults: 10,
      debounceMs: 300,
      fuzzySearch: false,
      caseSensitive: false,
      highlight: true,
      showCategories: true,
      showDescriptions: true,
      theme: 'light',
      ...config,
    };

    this.searchEngine = new SearchEngine(
      this.config.fuzzySearch ? 'fuzzy' : 'contains',
      this.config.caseSensitive
    );

    this.performanceMonitor = new PerformanceMonitor();

    // Initialize API client
    if (this.config.apiEndpoint) {
      this.apiClient = new ApiClient(this.config);
    } else if (this.config.data) {
      this.apiClient = new MockApiClient(this.config.data);
    }

    // Create debounced search function
    this.debouncedSearch = debounce(
      this.performSearch.bind(this),
      this.config.debounceMs!
    );
  }

  /**
   * Mount the search component to a DOM element
   */
  mount(selector: string | HTMLElement): this {
    this.container = typeof selector === 'string' 
      ? document.querySelector(selector)
      : selector;

    if (!this.container) {
      throw new Error('UniversalSearch: Container element not found');
    }

    this.render();
    this.attachEventListeners();
    this.loadInitialData();

    return this;
  }

  /**
   * Update search configuration
   */
  updateConfig(newConfig: Partial<SearchConfig>): this {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.data && !this.config.apiEndpoint) {
      this.apiClient = new MockApiClient(newConfig.data);
    }

    return this;
  }

  /**
   * Programmatically trigger a search
   */
  search(query: string): Promise<void> {
    this.state.query = query;
    if (this.searchInput) {
      this.searchInput.value = query;
    }
    return this.performSearch(query);
  }

  /**
   * Clear search results and input
   */
  clear(): void {
    this.state = {
      loading: false,
      error: null,
      results: [],
      query: '',
      totalCount: 0,
      currentPage: 1,
    };

    if (this.searchInput) {
      this.searchInput.value = '';
    }

    this.renderResults();
  }

  /**
   * Get current search state
   */
  getState(): SearchState {
    return { ...this.state };
  }

  /**
   * Get performance metrics
   */
  getMetrics(): Partial<PerformanceMetrics> {
    return this.performanceMonitor.getAverageMetrics();
  }

  /**
   * Destroy the component and clean up
   */
  destroy(): void {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="universal-search ${this.config.theme}" data-theme="${this.config.theme}">
        <div class="search-header">
          <div class="search-input-container">
            <input 
              type="text" 
              class="search-input" 
              placeholder="${this.config.placeholder}"
              aria-label="Search"
              autocomplete="off"
              spellcheck="false"
            />
            <div class="search-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M21 21L16.514 16.506L21 21ZM19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" stroke="currentColor" stroke-width="2"/>
              </svg>
            </div>
            <div class="loading-indicator" style="display: none;">
              <svg class="spinner" width="20" height="20" viewBox="0 0 24 24">
                <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8Z" fill="currentColor"/>
              </svg>
            </div>
          </div>
        </div>
        
        ${this.config.filters ? '<div class="search-filters"></div>' : ''}
        
        <div class="search-error" style="display: none;"></div>
        
        <div class="search-results-container">
          <div class="search-results"></div>
          <div class="search-pagination" style="display: none;"></div>
        </div>
      </div>
    `;

    // Get references to elements
    this.searchInput = this.container.querySelector('.search-input');
    this.resultsContainer = this.container.querySelector('.search-results');
    this.loadingIndicator = this.container.querySelector('.loading-indicator');
    this.errorContainer = this.container.querySelector('.search-error');
    this.filtersContainer = this.container.querySelector('.search-filters');

    // Apply styles
    this.injectStyles();
  }

  private attachEventListeners(): void {
    if (!this.searchInput) return;

    // Search input events
    this.searchInput.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value;
      this.state.query = query;
      this.debouncedSearch(query);
    });

    this.searchInput.addEventListener('focus', () => {
      if (this.state.results.length > 0) {
        this.showResults();
      }
    });

    // Click outside to hide results
    document.addEventListener('click', (e) => {
      if (this.container && !this.container.contains(e.target as Node)) {
        this.hideResults();
      }
    });

    // Keyboard navigation
    this.searchInput.addEventListener('keydown', this.handleKeyNavigation.bind(this));
  }

  private async loadInitialData(): Promise<void> {
    if (!this.config.data && !this.config.apiEndpoint) return;

    try {
      this.setState({ loading: true, error: null });

      if (this.config.data) {
        // Set up filters if enabled
        if (this.config.filters) {
          this.setupFilters(this.config.data);
        }
      }

      this.setState({ loading: false });
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  private async performSearch(query: string): Promise<void> {
    if (!query.trim()) {
      this.clear();
      return;
    }

    try {
      this.performanceMonitor.start();
      this.setState({ loading: true, error: null, query });

      let results: SearchItem[] = [];

      if (this.apiClient) {
        const response = await this.apiClient.search(query, {
          page: this.state.currentPage,
          pageSize: this.config.maxResults,
        });
        
        results = response.data;
        this.setState({ 
          totalCount: response.total || results.length,
        });
      } else if (this.config.data) {
        results = this.searchEngine.search(
          this.config.data,
          query,
          this.config.searchKeys!
        ).slice(0, this.config.maxResults);
      }

      // Apply filters
      if (Object.keys(this.activeFilters).length > 0) {
        results = applyFilters(results, this.activeFilters);
      }

      const metrics = this.performanceMonitor.end(results.length);
      
      this.setState({ 
        loading: false, 
        results,
        totalCount: results.length,
      });

      this.renderResults();
      this.showResults();

      // Call onSearch callback
      if (this.config.onSearch) {
        this.config.onSearch(query, results);
      }

      console.debug('Search metrics:', metrics);

    } catch (error) {
      this.handleError(error as Error);
    }
  }

  private renderResults(): void {
    if (!this.resultsContainer) return;

    if (this.state.results.length === 0) {
      this.resultsContainer.innerHTML = `
        <div class="search-no-results">
          <div class="no-results-icon">🔍</div>
          <div class="no-results-title">No results found</div>
          <div class="no-results-description">
            Try adjusting your search terms or filters
          </div>
        </div>
      `;
      return;
    }

    const resultsHTML = this.state.results
      .map(item => this.renderResultItem(item))
      .join('');

    this.resultsContainer.innerHTML = `
      <div class="search-results-header">
        <span class="results-count">
          ${this.state.totalCount} result${this.state.totalCount !== 1 ? 's' : ''}
        </span>
      </div>
      <div class="search-results-list">
        ${resultsHTML}
      </div>
    `;
  }

  private renderResultItem(item: SearchItem): string {
    const title = this.config.highlight && this.state.query
      ? highlightMatches(item.name, this.state.query, this.config.caseSensitive)
      : item.name;

    const category = this.config.showCategories && item.category
      ? `<span class="result-category">${item.category}</span>`
      : '';

    const description = this.config.showDescriptions && item.description
      ? `<div class="result-description">${
          this.config.highlight && this.state.query
            ? highlightMatches(item.description, this.state.query, this.config.caseSensitive)
            : item.description
        }</div>`
      : '';

    const price = item.price
      ? `<span class="result-price">$${item.price}</span>`
      : '';

    return `
      <div class="search-result-item" data-id="${item.id || ''}" role="option">
        <div class="result-content">
          <div class="result-header">
            <div class="result-title">${title}</div>
            ${category}
            ${price}
          </div>
          ${description}
        </div>
      </div>
    `;
  }

  private setupFilters(data: SearchItem[]): void {
    if (!this.filtersContainer || !this.config.filters) return;

    const filterOptions = this.config.filters.map(key => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      values: extractFilterOptions(data, key),
    }));

    const filtersHTML = filterOptions
      .map(filter => this.renderFilter(filter))
      .join('');

    this.filtersContainer.innerHTML = `
      <div class="filters-header">
        <span>Filters:</span>
        <button class="filters-clear" type="button">Clear All</button>
      </div>
      <div class="filters-list">
        ${filtersHTML}
      </div>
    `;

    // Attach filter event listeners
    this.attachFilterListeners();
  }

  private renderFilter(filter: any): string {
    return `
      <div class="filter-group">
        <label class="filter-label">${filter.label}</label>
        <select class="filter-select" data-key="${filter.key}" multiple>
          ${filter.values.map((value: string) => 
            `<option value="${value}">${value}</option>`
          ).join('')}
        </select>
      </div>
    `;
  }

  private attachFilterListeners(): void {
    if (!this.filtersContainer) return;

    this.filtersContainer.addEventListener('change', (e) => {
      const select = e.target as HTMLSelectElement;
      if (select.classList.contains('filter-select')) {
        const key = select.dataset.key!;
        const selectedValues = Array.from(select.selectedOptions)
          .map(option => option.value);
        
        if (selectedValues.length > 0) {
          this.activeFilters[key] = selectedValues;
        } else {
          delete this.activeFilters[key];
        }

        this.debouncedSearch(this.state.query);
      }
    });

    const clearButton = this.filtersContainer.querySelector('.filters-clear');
    clearButton?.addEventListener('click', () => {
      this.activeFilters = {};
      this.filtersContainer!.querySelectorAll('.filter-select').forEach(select => {
        (select as HTMLSelectElement).selectedIndex = -1;
      });
      this.debouncedSearch(this.state.query);
    });
  }

  private handleKeyNavigation(e: KeyboardEvent): void {
    // TODO: Implement arrow key navigation through results
    if (e.key === 'Escape') {
      this.hideResults();
    }
  }

  private showResults(): void {
    if (this.resultsContainer) {
      this.resultsContainer.style.display = 'block';
    }
  }

  private hideResults(): void {
    if (this.resultsContainer) {
      this.resultsContainer.style.display = 'none';
    }
  }

  private setState(updates: Partial<SearchState>): void {
    this.state = { ...this.state, ...updates };
    this.updateUI();
  }

  private updateUI(): void {
    // Update loading state
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = this.state.loading ? 'block' : 'none';
    }

    // Update error state
    if (this.errorContainer) {
      if (this.state.error) {
        this.errorContainer.textContent = this.state.error;
        this.errorContainer.style.display = 'block';
      } else {
        this.errorContainer.style.display = 'none';
      }
    }
  }

  private handleError(error: Error): void {
    console.error('Search error:', error);
    
    this.setState({ 
      loading: false, 
      error: error.message || 'An error occurred while searching'
    });

    if (this.config.onError) {
      this.config.onError(error);
    }

    handleApiError(error, this.config.onError);
  }

  private injectStyles(): void {
    const styleId = 'universal-search-styles';
    if (document.getElementById(styleId)) return;

    const styles = `
      .universal-search {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        position: relative;
        width: 100%;
        max-width: 600px;
      }

      .search-input-container {
        position: relative;
        display: flex;
        align-items: center;
      }

      .search-input {
        width: 100%;
        padding: 12px 20px 12px 50px;
        border: 2px solid #e2e8f0;
        border-radius: 12px;
        font-size: 16px;
        transition: all 0.3s ease;
        background: white;
      }

      .search-input:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }

      .search-icon {
        position: absolute;
        left: 15px;
        color: #9ca3af;
        pointer-events: none;
        z-index: 1;
      }

      .loading-indicator {
        position: absolute;
        right: 15px;
        color: #667eea;
      }

      .spinner {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .search-results {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 0 0 12px 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        max-height: 400px;
        overflow-y: auto;
        z-index: 1000;
        display: none;
      }

      .search-results-header {
        padding: 10px 20px;
        border-bottom: 1px solid #f1f5f9;
        background: #f8fafc;
        font-size: 14px;
        color: #64748b;
      }

      .search-result-item {
        padding: 15px 20px;
        border-bottom: 1px solid #f1f5f9;
        cursor: pointer;
        transition: background-color 0.2s;
      }

      .search-result-item:hover {
        background: #f8fafc;
      }

      .search-result-item:last-child {
        border-bottom: none;
      }

      .result-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 5px;
      }

      .result-title {
        font-weight: 600;
        color: #1e293b;
        flex: 1;
      }

      .result-category {
        background: #e0e7ff;
        color: #3730a3;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
      }

      .result-price {
        font-weight: 600;
        color: #059669;
      }

      .result-description {
        color: #64748b;
        font-size: 14px;
        line-height: 1.4;
      }

      .search-highlight {
        background: rgba(102, 126, 234, 0.2);
        color: inherit;
        padding: 1px 2px;
        border-radius: 2px;
      }

      .search-no-results {
        padding: 40px 20px;
        text-align: center;
      }

      .no-results-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      .no-results-title {
        font-size: 18px;
        font-weight: 600;
        color: #1e293b;
        margin-bottom: 8px;
      }

      .no-results-description {
        color: #64748b;
        font-size: 14px;
      }

      .search-error {
        padding: 15px 20px;
        background: #fef2f2;
        color: #dc2626;
        border: 1px solid #fecaca;
        border-radius: 8px;
        margin-top: 10px;
        font-size: 14px;
      }
    `;

    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }
}