/**
 * DOM Data Source for searching existing HTML content on the page
 * Automatically indexes DOM elements and supports live updates via MutationObserver
 */

import { SearchResult, SearchOptions, DataSourceStats, DOMDataSourceConfig } from '../types';
import { DataSourceBase } from './DataSourceBase';
import { SecurityUtils } from '../utils/SecurityUtils';

interface DOMElement {
  id: number;
  element: Element;
  title: string;
  description: string;
  url?: string;
  metadata: Record<string, any>;
  tokens: Set<string>;
}

export class DOMDataSource extends DataSourceBase {
  private config: DOMDataSourceConfig;
  private elements: DOMElement[] = [];
  private observer?: MutationObserver;
  private isInitialized = false;
  private lastIndexTime = 0;
  private indexedElementsCount = 0;

  constructor(config: DOMDataSourceConfig) {
    super();
    this.config = {
      observeChanges: true,
      extractMetadata: true,
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await this.indexDOMElements();
    
    if (this.config.observeChanges) {
      this.setupMutationObserver();
    }

    this.isInitialized = true;
    this.emitSearchEvent('search', { 
      message: `DOM indexed: ${this.elements.length} elements` 
    });
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const startTime = performance.now();
    
    if (!this.isInitialized) {
      await this.initialize();
    }

    const sanitizedQuery = SecurityUtils.sanitizeQuery(query);
    
    if (!sanitizedQuery || sanitizedQuery.length < 1) {
      return [];
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(sanitizedQuery, options);
    const cachedResults = this.getCachedResults(cacheKey);
    if (cachedResults) {
      return cachedResults;
    }

    const results = this.performDOMSearch(sanitizedQuery, options);
    const searchTime = performance.now() - startTime;

    console.debug(`DOM search completed in ${searchTime.toFixed(2)}ms for ${this.elements.length} elements`);

    // Cache results
    this.setCachedResults(cacheKey, results);
    
    // Emit results event
    this.emitSearchEvent('results', { 
      query: sanitizedQuery, 
      results,
      searchTime 
    });

    return results;
  }

  private async indexDOMElements(): Promise<void> {
    const startTime = performance.now();
    this.elements = [];
    this.indexedElementsCount = 0;

    // Find all elements matching the selector
    const elements = document.querySelectorAll(this.config.selector);
    
    elements.forEach((element, index) => {
      try {
        const domElement = this.indexElement(element, index);
        if (domElement) {
          this.elements.push(domElement);
          this.indexedElementsCount++;
        }
      } catch (error) {
        console.warn('Failed to index DOM element:', element, error);
      }
    });

    this.lastIndexTime = performance.now() - startTime;
    console.debug(`DOM indexing completed in ${this.lastIndexTime.toFixed(2)}ms for ${this.indexedElementsCount} elements`);
  }

  private indexElement(element: Element, index: number): DOMElement | null {
    // Extract title from configured selector or fallback
    const title = this.extractText(element, this.config.searchFields.title) || 
                 element.textContent?.trim().substring(0, 100) || 
                 `Element ${index + 1}`;

    // Extract description if configured
    const description = this.config.searchFields.description 
      ? this.extractText(element, this.config.searchFields.description) || ''
      : element.textContent?.trim() || '';

    // Extract URL if configured
    const url = this.config.searchFields.url 
      ? this.extractText(element, this.config.searchFields.url)
      : this.extractURL(element);

    // Extract metadata if enabled
    const metadata = this.config.extractMetadata 
      ? this.extractElementMetadata(element)
      : {};

    // Create searchable tokens
    const searchableText = `${title} ${description}`.toLowerCase();
    const tokens = new Set(this.tokenize(searchableText));

    return {
      id: index,
      element,
      title,
      description,
      url,
      metadata,
      tokens
    };
  }

  private extractText(element: Element, selector: string): string | null {
    try {
      // If selector starts with '@', it's an attribute
      if (selector.startsWith('@')) {
        const attrName = selector.substring(1);
        return element.getAttribute(attrName);
      }
      
      // If selector is 'textContent' or empty, use element's text
      if (selector === 'textContent' || selector === '') {
        return element.textContent?.trim() || null;
      }
      
      // Otherwise, it's a child selector
      const childElement = element.querySelector(selector);
      return childElement?.textContent?.trim() || null;
    } catch (error) {
      console.warn('Failed to extract text with selector:', selector, error);
      return null;
    }
  }

  private extractURL(element: Element): string | undefined {
    // Try to extract URL from common attributes
    const url = element.getAttribute('href') || 
                element.getAttribute('data-url') ||
                element.getAttribute('data-href');
    
    if (url) {
      return url.startsWith('http') ? url : new URL(url, window.location.origin).href;
    }

    // Look for anchor children
    const anchor = element.querySelector('a[href]');
    if (anchor) {
      const href = anchor.getAttribute('href');
      return href ? (href.startsWith('http') ? href : new URL(href, window.location.origin).href) : undefined;
    }

    return undefined;
  }

  private extractElementMetadata(element: Element): Record<string, any> {
    const metadata: Record<string, any> = {};

    // Extract data attributes
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('data-')) {
        const key = attr.name.substring(5); // Remove 'data-' prefix
        metadata[key] = attr.value;
      }
    });

    // Extract common metadata
    metadata.tagName = element.tagName.toLowerCase();
    metadata.className = element.className;
    metadata.id = element.id;

    // Extract position information
    const rect = element.getBoundingClientRect();
    metadata.position = {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height
    };

    return metadata;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  private performDOMSearch(query: string, options: SearchOptions): SearchResult[] {
    const queryLower = query.toLowerCase();
    const queryTokens = this.tokenize(queryLower);
    const results: Array<SearchResult & { _score: number }> = [];

    for (const domElement of this.elements) {
      const score = this.calculateScore(domElement, queryLower, queryTokens);
      
      if (score > 0) {
        const result: SearchResult & { _score: number } = {
          id: domElement.id,
          title: domElement.title,
          description: domElement.description,
          url: domElement.url,
          metadata: domElement.metadata,
          score,
          _score: score
        };

        // Add highlighting if requested
        if (options.highlight) {
          result.highlight = this.generateHighlight(result, queryLower);
        }

        results.push(result);
      }
    }

    // Sort by score (highest first)
    results.sort((a, b) => b._score - a._score);

    // Apply custom sorting if specified
    if (options.sort) {
      this.applySorting(results, options.sort);
    }

    // Apply pagination
    const start = options.offset || 0;
    const limit = options.limit || 20;
    const paginatedResults = results.slice(start, start + limit);

    // Remove internal _score property and highlight matching elements
    return paginatedResults.map(({ _score, ...result }) => {
      // Highlight the matching DOM element
      if (options.highlight) {
        this.highlightDOMElement(this.elements[result.id as number].element);
      }
      return result;
    });
  }

  private calculateScore(domElement: DOMElement, query: string, queryTokens: string[]): number {
    let score = 0;
    
    const titleLower = domElement.title.toLowerCase();
    const descriptionLower = domElement.description.toLowerCase();

    // Exact matches get highest scores
    if (titleLower.includes(query)) {
      score += titleLower === query ? 100 : titleLower.startsWith(query) ? 80 : 60;
    }
    
    if (descriptionLower.includes(query)) {
      score += descriptionLower === query ? 50 : descriptionLower.startsWith(query) ? 40 : 30;
    }

    // Token-based scoring
    for (const queryToken of queryTokens) {
      if (domElement.tokens.has(queryToken)) {
        score += 20;
      }
      
      // Partial token matches
      for (const elementToken of domElement.tokens) {
        if (elementToken.includes(queryToken) && elementToken !== queryToken) {
          score += elementToken.startsWith(queryToken) ? 15 : 10;
        }
      }
    }

    // Boost score based on element visibility
    const rect = domElement.element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      score += 5; // Visible elements get slight boost
    }

    return score;
  }

  private generateHighlight(result: SearchResult, query: string): SearchResult['highlight'] {
    const highlight: SearchResult['highlight'] = {};

    if (result.title) {
      highlight.title = this.highlightText(result.title, query);
    }

    if (result.description) {
      highlight.description = this.highlightText(result.description, query);
    }

    return highlight;
  }

  private highlightText(text: string, query: string): string {
    const regex = new RegExp(`(${this.escapeRegExp(query)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  private highlightDOMElement(element: Element): void {
    // Add a highlight class to the element
    element.classList.add('universal-search-highlight');
    
    // Remove highlight after 3 seconds
    setTimeout(() => {
      element.classList.remove('universal-search-highlight');
    }, 3000);
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private applySorting(results: SearchResult[], sort: { field: string; direction: 'asc' | 'desc' }): void {
    results.sort((a, b) => {
      const aValue = this.getNestedValue(a, sort.field);
      const bValue = this.getNestedValue(b, sort.field);
      
      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;
      
      return sort.direction === 'desc' ? -comparison : comparison;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setupMutationObserver(): void {
    if (!window.MutationObserver) {
      console.warn('MutationObserver not supported, DOM changes will not be tracked');
      return;
    }

    this.observer = new MutationObserver((mutations) => {
      let shouldReindex = false;

      for (const mutation of mutations) {
        // Check if nodes were added or removed that match our selector
        if (mutation.type === 'childList') {
          const addedNodes = Array.from(mutation.addedNodes)
            .filter(node => node.nodeType === Node.ELEMENT_NODE) as Element[];
          
          const removedNodes = Array.from(mutation.removedNodes)
            .filter(node => node.nodeType === Node.ELEMENT_NODE) as Element[];

          // Check if any added/removed nodes match our selector or contain matching elements
          for (const node of [...addedNodes, ...removedNodes]) {
            if (node.matches?.(this.config.selector) || node.querySelector?.(this.config.selector)) {
              shouldReindex = true;
              break;
            }
          }
        }
        
        // Check if text content changed in tracked elements
        if (mutation.type === 'characterData' || mutation.type === 'attributes') {
          const target = mutation.target as Element;
          if (target.matches?.(this.config.selector) || target.closest(this.config.selector)) {
            shouldReindex = true;
          }
        }
      }

      if (shouldReindex) {
        this.reindexDOM();
      }
    });

    // Observe the document for changes
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'id', 'data-title', 'data-description']
    });
  }

  private async reindexDOM(): Promise<void> {
    console.debug('DOM changed, reindexing elements...');
    this.clearCache(); // Clear cache since DOM changed
    await this.indexDOMElements();
  }

  async destroy(): Promise<void> {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = undefined;
    }
    
    // Remove all highlight classes
    document.querySelectorAll('.universal-search-highlight').forEach(el => {
      el.classList.remove('universal-search-highlight');
    });

    this.elements = [];
    this.isInitialized = false;
    
    await super.destroy();
  }

  getStats(): DataSourceStats {
    return {
      itemCount: this.elements.length,
      isIndexed: this.isInitialized,
      tokenCount: this.elements.reduce((total, el) => total + el.tokens.size, 0),
      cacheSize: this.cache.size,
      indexingThreshold: 0
    };
  }

  /**
   * Manually trigger a reindex of DOM elements
   */
  async reindex(): Promise<void> {
    await this.reindexDOM();
  }

  /**
   * Get the current configuration
   */
  getConfig(): DOMDataSourceConfig {
    return { ...this.config };
  }

  /**
   * Update the configuration and reindex if necessary
   */
  configure(options: Partial<DOMDataSourceConfig> & Record<string, any>): void {
    super.configure(options);
    
    let shouldReindex = false;

    if (options.selector && options.selector !== this.config.selector) {
      this.config.selector = options.selector;
      shouldReindex = true;
    }

    if (options.searchFields) {
      this.config.searchFields = { ...this.config.searchFields, ...options.searchFields };
      shouldReindex = true;
    }

    if (options.extractMetadata !== undefined) {
      this.config.extractMetadata = options.extractMetadata;
      shouldReindex = true;
    }

    if (options.observeChanges !== undefined) {
      this.config.observeChanges = options.observeChanges;
      
      if (this.config.observeChanges && !this.observer) {
        this.setupMutationObserver();
      } else if (!this.config.observeChanges && this.observer) {
        this.observer.disconnect();
        this.observer = undefined;
      }
    }

    if (shouldReindex && this.isInitialized) {
      this.reindexDOM();
    }
  }
}