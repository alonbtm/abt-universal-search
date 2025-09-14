/**
 * UI Manager for rendering search interface and results
 */

import { SearchResult, UIConfig, SearchEvent } from '../types';
import { SecurityUtils } from '../utils/SecurityUtils';
import { EventEmitter } from '../utils/EventEmitter';

export class UIManager extends EventEmitter {
  private container: HTMLElement;
  private config: UIConfig;
  private searchInput?: HTMLInputElement;
  private resultsContainer?: HTMLElement;
  private isInitialized = false;

  constructor(config: UIConfig) {
    super();
    this.config = config;
    this.container = this.resolveContainer(config.container);
    this.init();
  }

  private resolveContainer(container: string | HTMLElement): HTMLElement {
    if (typeof container === 'string') {
      const element = document.querySelector(container);
      if (!element) {
        throw new Error(`Container not found: ${container}`);
      }
      return element as HTMLElement;
    }
    return container;
  }

  private init(): void {
    if (this.isInitialized) return;

    // Apply theme
    this.applyTheme();

    // Create search interface
    this.createSearchInterface();

    // Set up event listeners
    this.setupEventListeners();

    this.isInitialized = true;
  }

  private applyTheme(): void {
    const theme = this.config.theme || 'auto';
    
    // Add theme class to container
    this.container.classList.add('universal-search');
    this.container.classList.add(`universal-search--${theme}`);

    // Inject CSS if not already present
    if (!document.querySelector('#universal-search-styles')) {
      this.injectStyles();
    }
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.id = 'universal-search-styles';
    style.textContent = `
      .universal-search {
        position: relative;
        width: 100%;
        max-width: 600px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .universal-search__input {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #e1e5e9;
        border-radius: 8px;
        font-size: 16px;
        outline: none;
        transition: border-color 0.2s ease;
      }

      .universal-search__input:focus {
        border-color: #007bff;
        box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
      }

      .universal-search__results {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #e1e5e9;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        max-height: 400px;
        overflow-y: auto;
        z-index: 1000;
        margin-top: 4px;
      }

      .universal-search__result {
        padding: 12px 16px;
        border-bottom: 1px solid #f1f3f4;
        cursor: pointer;
        transition: background-color 0.2s ease;
      }

      .universal-search__result:hover {
        background-color: #f8f9fa;
      }

      .universal-search__result:last-child {
        border-bottom: none;
      }

      .universal-search__result-title {
        font-weight: 600;
        color: #1a1a1a;
        margin-bottom: 4px;
      }

      .universal-search__result-description {
        font-size: 14px;
        color: #6c757d;
        line-height: 1.4;
      }

      .universal-search__result mark {
        background-color: #fff3cd;
        padding: 0 2px;
        border-radius: 2px;
      }

      .universal-search__loading,
      .universal-search__no-results,
      .universal-search__error {
        padding: 16px;
        text-align: center;
        color: #6c757d;
      }

      .universal-search__error {
        color: #dc3545;
      }

      /* Dark theme */
      .universal-search--dark {
        color: #ffffff;
      }

      .universal-search--dark .universal-search__input {
        background: #2d3748;
        border-color: #4a5568;
        color: #ffffff;
      }

      .universal-search--dark .universal-search__input:focus {
        border-color: #63b3ed;
      }

      .universal-search--dark .universal-search__results {
        background: #2d3748;
        border-color: #4a5568;
      }

      .universal-search--dark .universal-search__result:hover {
        background-color: #4a5568;
      }

      .universal-search--dark .universal-search__result-title {
        color: #ffffff;
      }

      .universal-search--dark .universal-search__result-description {
        color: #a0aec0;
      }

      /* Auto theme detection */
      @media (prefers-color-scheme: dark) {
        .universal-search--auto {
          color: #ffffff;
        }

        .universal-search--auto .universal-search__input {
          background: #2d3748;
          border-color: #4a5568;
          color: #ffffff;
        }

        .universal-search--auto .universal-search__results {
          background: #2d3748;
          border-color: #4a5568;
        }

        .universal-search--auto .universal-search__result:hover {
          background-color: #4a5568;
        }

        .universal-search--auto .universal-search__result-title {
          color: #ffffff;
        }

        .universal-search--auto .universal-search__result-description {
          color: #a0aec0;
        }
      }

      /* Mobile responsive */
      @media (max-width: 768px) {
        .universal-search__input {
          font-size: 16px; /* Prevent zoom on iOS */
        }

        .universal-search__results {
          max-height: 60vh;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private createSearchInterface(): void {
    if (this.config.showSearchBox !== false) {
      this.createSearchInput();
    }
    this.createResultsContainer();
  }

  private createSearchInput(): void {
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.className = 'universal-search__input';
    this.searchInput.placeholder = this.config.placeholder || 'Search...';
    this.searchInput.setAttribute('autocomplete', 'off');
    this.searchInput.setAttribute('spellcheck', 'false');
    
    this.container.appendChild(this.searchInput);
  }

  private createResultsContainer(): void {
    this.resultsContainer = document.createElement('div');
    this.resultsContainer.className = 'universal-search__results';
    this.resultsContainer.style.display = 'none';
    
    this.container.appendChild(this.resultsContainer);
  }

  private setupEventListeners(): void {
    if (this.searchInput) {
      let debounceTimer: number;
      
      this.searchInput.addEventListener('input', (event) => {
        const query = (event.target as HTMLInputElement).value;
        
        clearTimeout(debounceTimer);
        debounceTimer = window.setTimeout(() => {
          this.emit('search', { query });
        }, this.config.debounceMs || 300);
      });

      this.searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          this.hideResults();
        }
      });
    }

    // Hide results when clicking outside
    document.addEventListener('click', (event) => {
      if (!this.container.contains(event.target as Node)) {
        this.hideResults();
      }
    });
  }

  showResults(results: SearchResult[]): void {
    if (!this.resultsContainer) return;

    if (results.length === 0) {
      this.showNoResults();
      return;
    }

    this.resultsContainer.innerHTML = '';
    
    results.forEach(result => {
      const resultElement = this.createResultElement(result);
      this.resultsContainer!.appendChild(resultElement);
    });

    this.resultsContainer.style.display = 'block';
  }

  private createResultElement(result: SearchResult): HTMLElement {
    const element = document.createElement('div');
    element.className = 'universal-search__result';
    
    const title = this.config.templates?.result 
      ? this.renderTemplate(this.config.templates.result, result)
      : this.renderDefaultResult(result);
    
    element.innerHTML = title;
    
    element.addEventListener('click', () => {
      this.emit('select', { result });
      this.hideResults();
    });

    return element;
  }

  private renderTemplate(template: string | ((result: SearchResult) => string), result: SearchResult): string {
    if (typeof template === 'function') {
      return SecurityUtils.sanitizeHTML(template(result), true);
    }
    
    // Simple template replacement
    return SecurityUtils.sanitizeHTML(
      template
        .replace(/\{\{title\}\}/g, result.title)
        .replace(/\{\{description\}\}/g, result.description || '')
        .replace(/\{\{url\}\}/g, result.url || ''),
      true
    );
  }

  private renderDefaultResult(result: SearchResult): string {
    const title = result.highlight?.title || SecurityUtils.escapeHTML(result.title);
    const description = result.highlight?.description || SecurityUtils.escapeHTML(result.description || '');
    
    return `
      <div class="universal-search__result-title">${title}</div>
      ${description ? `<div class="universal-search__result-description">${description}</div>` : ''}
    `;
  }

  showLoading(): void {
    if (!this.resultsContainer) return;

    const loadingText = this.config.templates?.loading || 'Searching...';
    this.resultsContainer.innerHTML = `<div class="universal-search__loading">${SecurityUtils.escapeHTML(loadingText)}</div>`;
    this.resultsContainer.style.display = 'block';
  }

  showNoResults(): void {
    if (!this.resultsContainer) return;

    const noResultsText = this.config.templates?.noResults || 'No results found';
    this.resultsContainer.innerHTML = `<div class="universal-search__no-results">${SecurityUtils.escapeHTML(noResultsText)}</div>`;
    this.resultsContainer.style.display = 'block';
  }

  showError(error: Error): void {
    if (!this.resultsContainer) return;

    const errorText = this.config.templates?.error || 'An error occurred while searching';
    this.resultsContainer.innerHTML = `<div class="universal-search__error">${SecurityUtils.escapeHTML(errorText)}</div>`;
    this.resultsContainer.style.display = 'block';
  }

  hideResults(): void {
    if (this.resultsContainer) {
      this.resultsContainer.style.display = 'none';
    }
  }

  setQuery(query: string): void {
    if (this.searchInput) {
      this.searchInput.value = query;
    }
  }

  getQuery(): string {
    return this.searchInput?.value || '';
  }

  destroy(): void {
    this.hideResults();
    this.removeAllListeners();
    
    // Remove generated elements
    if (this.searchInput) {
      this.searchInput.remove();
    }
    if (this.resultsContainer) {
      this.resultsContainer.remove();
    }

    // Remove theme classes
    this.container.classList.remove('universal-search');
    this.container.classList.remove(`universal-search--${this.config.theme || 'auto'}`);
  }
}