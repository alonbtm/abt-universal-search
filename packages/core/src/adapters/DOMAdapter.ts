/**
 * DOM Data Source Adapter - DOM element searching with Shadow DOM support
 * @description Handles searching DOM elements using CSS selectors with live updates
 */

import type { DataSourceConfig, DOMDataSourceConfig } from '../types/Config';
import type {
  ProcessedQuery,
  Connection,
  RawResult,
  DOMConnection,
  DOMElementResult,
} from '../types/Results';

import { BaseDataSourceAdapter, type AdapterCapabilities } from './BaseAdapter';
import {
  UniversalDOMObserver,
  mutationObserverFactory,
  type MutationCallback,
} from '../utils/MutationObserver';
import {
  ShadowDOMTraverser,
  shadowDOMTraverserFactory,
  type ShadowElementReference,
} from '../utils/ShadowDOMTraverser';
import { ValidationError } from '../utils/validation';

/**
 * DOM search match result
 */
interface DOMSearchMatch {
  element: Element;
  matches: {
    attribute?: string;
    value: string;
    matchType: 'exact' | 'partial' | 'starts-with' | 'ends-with';
    score: number;
  }[];
  totalScore: number;
  path: string;
}

interface DOMSearchMatchWithShadow extends DOMSearchMatch {
  shadowPath: string;
}

/**
 * DOM adapter with comprehensive element searching and live updates
 */
export class DOMAdapter extends BaseDataSourceAdapter {
  private mutationObservers = new Map<string, UniversalDOMObserver>();
  private shadowTraversers = new Map<string, ShadowDOMTraverser>();
  private elementCache = new WeakMap<Element, string>();
  private resultCache = new Map<string, RawResult[]>();

  constructor() {
    super('dom');
  }

  /**
   * Connect to DOM search scope
   */
  public async connect(config: DataSourceConfig): Promise<DOMConnection> {
    const domConfig = config as DOMDataSourceConfig;
    await this.validateConfig(domConfig);

    const startTime = performance.now();
    const connectionId = this.generateConnectionId(domConfig);

    try {
      // Find root element
      const rootElement = this.findRootElement(domConfig.selector);
      if (!rootElement) {
        throw new ValidationError(`Root element not found for selector: ${domConfig.selector}`);
      }

      // Create connection
      const connection = this.createDOMConnection(connectionId, domConfig, rootElement);

      // Set up shadow DOM traverser if enabled
      if (domConfig.shadowDOM?.enabled) {
        const shadowTraverser = shadowDOMTraverserFactory.createTraverser(domConfig.shadowDOM);
        this.shadowTraversers.set(connectionId, shadowTraverser);

        // Discover shadow roots
        connection.shadowRoots = shadowTraverser.findShadowRoots(rootElement);
      }

      // Set up live updates if enabled
      if (domConfig.liveUpdate?.enabled) {
        this.setupLiveUpdates(connectionId, domConfig, rootElement);
      }

      // Update connection status and metrics
      connection.status = 'connected';
      this.updateConnectionStatus(connectionId, 'connected', {
        rootSelector: domConfig.selector,
        elementCount: this.countElements(rootElement, domConfig),
        shadowRootCount: connection.shadowRoots.length,
      });

      const connectionTime = performance.now() - startTime;
      this.recordMetrics(connectionId, {
        connectionTime,
        queryTime: 0,
        totalTime: connectionTime,
        success: true,
        resultCount: 0,
      });

      return connection;
    } catch (error) {
      this.updateConnectionStatus(connectionId, 'error', {
        error: (error as Error).message,
        errorTime: Date.now(),
      });

      throw this.createError(
        `Failed to connect to DOM: ${(error as Error).message}`,
        'connection',
        'DOM_CONNECTION_FAILED',
        error as Error
      );
    }
  }

  /**
   * Execute DOM search query
   */
  public async query(connection: Connection, query: ProcessedQuery): Promise<RawResult[]> {
    const domConnection = connection as DOMConnection;
    const config = this.getConnectionConfig(domConnection);

    return this.executeWithMetrics(
      connection.id,
      async () => {
        // Check cache first
        const cacheKey = this.generateCacheKey(query.normalized, config);
        if (config.performance?.enableCaching) {
          const cached = this.resultCache.get(cacheKey);
          if (cached) {
            return this.cloneResults(cached);
          }
        }

        // Find matching elements
        const matches = await this.findMatchingElements(domConnection, query, config);

        // Convert to RawResult format
        const results = this.convertToRawResults(matches, domConnection);

        // Cache results if enabled
        if (config.performance?.enableCaching) {
          this.resultCache.set(cacheKey, this.cloneResults(results));

          // Clear cache after TTL
          const ttl = config.performance.cacheTTL || 60000;
          setTimeout(() => {
            this.resultCache.delete(cacheKey);
          }, ttl);
        }

        return results;
      },
      'query'
    );
  }

  /**
   * Disconnect from DOM
   */
  public async disconnect(connection: Connection): Promise<void> {
    const domConnection = connection as DOMConnection;

    try {
      // Stop mutation observer
      const mutationObserver = this.mutationObservers.get(connection.id);
      if (mutationObserver) {
        mutationObserver.disconnect();
        this.mutationObservers.delete(connection.id);
      }

      // Clean up shadow traverser
      this.shadowTraversers.delete(connection.id);

      // Clear cache entries for this connection
      this.clearConnectionCache(connection.id);

      // Update status and cleanup
      domConnection.status = 'disconnected';
      this.updateConnectionStatus(connection.id, 'disconnected');
      this.removeConnection(connection.id);
    } catch (error) {
      throw this.createError(
        `Failed to disconnect from DOM: ${(error as Error).message}`,
        'connection',
        'DOM_DISCONNECT_FAILED',
        error as Error
      );
    }
  }

  /**
   * Validate DOM configuration
   */
  public async validateConfig(config: DataSourceConfig): Promise<void> {
    const domConfig = config as DOMDataSourceConfig;

    if (domConfig.type !== 'dom') {
      throw new ValidationError('Configuration type must be "dom"');
    }

    if (!domConfig.selector || typeof domConfig.selector !== 'string') {
      throw new ValidationError('Selector must be a non-empty string');
    }

    if (!domConfig.searchAttributes || !Array.isArray(domConfig.searchAttributes)) {
      throw new ValidationError('searchAttributes must be an array');
    }

    if (domConfig.searchAttributes.length === 0) {
      throw new ValidationError('At least one search attribute is required');
    }

    // Validate selector syntax
    try {
      document.querySelector(domConfig.selector);
    } catch (error) {
      throw new ValidationError(`Invalid CSS selector: ${domConfig.selector}`);
    }

    // Validate search attributes
    for (const attr of domConfig.searchAttributes) {
      if (typeof attr !== 'string' || attr.trim().length === 0) {
        throw new ValidationError('All search attributes must be non-empty strings');
      }
    }

    // Validate live update configuration
    if (domConfig.liveUpdate?.enabled) {
      const strategy = domConfig.liveUpdate.strategy;
      if (!['static', 'mutation-observer', 'polling'].includes(strategy)) {
        throw new ValidationError(`Invalid live update strategy: ${strategy}`);
      }
    }
  }

  /**
   * Get DOM adapter capabilities
   */
  public getCapabilities(): AdapterCapabilities {
    return {
      supportsPooling: false,
      supportsRealTime: true,
      supportsPagination: true,
      supportsSorting: true,
      supportsFiltering: true,
      maxConcurrentConnections: 10,
      supportedQueryTypes: ['text', 'attribute', 'css-selector'],
    };
  }

  /**
   * Find matching DOM elements
   */
  private async findMatchingElements(
    connection: DOMConnection,
    query: ProcessedQuery,
    config: DOMDataSourceConfig
  ): Promise<(DOMSearchMatch | DOMSearchMatchWithShadow)[]> {
    const matches: (DOMSearchMatch | DOMSearchMatchWithShadow)[] = [];
    const searchTerm = query.normalized.toLowerCase();

    // Get shadow traverser if available
    const shadowTraverser = this.shadowTraversers.get(connection.id);

    // Find all elements in scope
    const elements =
      shadowTraverser && config.shadowDOM?.enabled
        ? shadowTraverser.findElements(config.selector, connection.rootElement)
        : this.findRegularElements(config.selector, connection.rootElement);

    for (const elementRef of elements) {
      const element =
        shadowTraverser && 'element' in elementRef
          ? (elementRef as ShadowElementReference).element
          : (elementRef as Element);
      const elementMatches = this.matchElement(element, searchTerm, config);

      if (elementMatches.length > 0) {
        const totalScore = elementMatches.reduce((sum, match) => sum + match.score, 0);
        const path = shadowTraverser
          ? shadowTraverser.createElementPath(element)
          : this.createElementPath(element);

        const shadowPath =
          shadowTraverser && 'shadowPath' in elementRef
            ? (elementRef as ShadowElementReference).shadowPath
            : undefined;

        const match: DOMSearchMatch | DOMSearchMatchWithShadow = shadowPath
          ? {
              element,
              matches: elementMatches,
              totalScore,
              path,
              shadowPath,
            }
          : {
              element,
              matches: elementMatches,
              totalScore,
              path,
            };

        matches.push(match);
      }
    }

    // Sort by score (highest first)
    matches.sort((a, b) => b.totalScore - a.totalScore);

    return matches;
  }

  /**
   * Find regular (non-shadow) elements
   */
  private findRegularElements(selector: string, root: Element): Element[] {
    try {
      return Array.from(root.querySelectorAll(selector));
    } catch (error) {
      console.warn('Invalid selector:', selector, error);
      return [];
    }
  }

  /**
   * Match element against search criteria
   */
  private matchElement(
    element: Element,
    searchTerm: string,
    config: DOMDataSourceConfig
  ): DOMSearchMatch['matches'] {
    const matches: DOMSearchMatch['matches'] = [];
    const caseSensitive = config.options?.caseSensitive ?? false;

    for (const attribute of config.searchAttributes) {
      const value = this.extractAttributeValue(element, attribute, config);
      if (!value) continue;

      const normalizedValue = caseSensitive ? value : value.toLowerCase();
      const normalizedTerm = caseSensitive ? searchTerm : searchTerm.toLowerCase();

      // Check for matches
      let matchType: DOMSearchMatch['matches'][0]['matchType'];
      let score = 0;

      if (normalizedValue === normalizedTerm) {
        matchType = 'exact';
        score = 10;
      } else if (normalizedValue.startsWith(normalizedTerm)) {
        matchType = 'starts-with';
        score = 7;
      } else if (normalizedValue.endsWith(normalizedTerm)) {
        matchType = 'ends-with';
        score = 5;
      } else if (normalizedValue.includes(normalizedTerm)) {
        matchType = 'partial';
        score = 3;
      } else {
        continue; // No match
      }

      matches.push({
        attribute,
        value,
        matchType,
        score,
      });
    }

    return matches;
  }

  /**
   * Extract attribute value from element
   */
  private extractAttributeValue(
    element: Element,
    attribute: string,
    _config: DOMDataSourceConfig
  ): string | null {
    switch (attribute) {
      case 'textContent':
        return element.textContent?.trim() || null;
      case 'innerText':
        return (element as HTMLElement).innerText?.trim() || null;
      case 'innerHTML':
        return element.innerHTML?.trim() || null;
      default:
        // Check if it's a data attribute or regular attribute
        if (attribute.startsWith('data-')) {
          return element.getAttribute(attribute);
        } else {
          // Try as property first, then as attribute
          const value = (element as any)[attribute];
          if (value !== undefined) {
            return String(value);
          }
          return element.getAttribute(attribute);
        }
    }
  }

  /**
   * Convert DOM matches to RawResult format
   */
  private convertToRawResults(
    matches: (DOMSearchMatch | DOMSearchMatchWithShadow)[],
    connection: DOMConnection
  ): RawResult[] {
    return matches.map((match, index) => {
      const baseResult: Omit<DOMElementResult, 'shadowPath'> = {
        element: match.element,
        path: match.path,
        matches: match.matches,
        accessibility: this.getAccessibilityInfo(match.element),
      };

      const elementResult: DOMElementResult =
        'shadowPath' in match
          ? { ...baseResult, shadowPath: match.shadowPath }
          : (baseResult as DOMElementResult);

      return {
        id: `${connection.id}-element-${index}`,
        data: elementResult,
        score: match.totalScore / 10, // Normalize to 0-1 scale
        matchedFields: match.matches.map(m => m.attribute || 'content'),
        metadata: {
          source: 'dom',
          elementTagName: match.element.tagName.toLowerCase(),
          elementId: match.element.id || undefined,
          elementClasses: match.element.className || undefined,
          shadowDOM: 'shadowPath' in match,
          totalMatches: match.matches.length,
        },
      };
    });
  }

  /**
   * Get accessibility information for element
   */
  private getAccessibilityInfo(element: Element): DOMElementResult['accessibility'] {
    const ariaLabel = element.getAttribute('aria-label');
    const role = element.getAttribute('role');

    return {
      visible: this.isElementVisible(element),
      focusable: this.isElementFocusable(element),
      ...(ariaLabel && { ariaLabel }),
      ...(role && { role }),
    };
  }

  /**
   * Check if element is visible
   */
  private isElementVisible(element: Element): boolean {
    if (!(element instanceof HTMLElement)) return true;

    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  }

  /**
   * Check if element is focusable
   */
  private isElementFocusable(element: Element): boolean {
    if (!(element instanceof HTMLElement)) return false;

    const focusableElements = ['input', 'button', 'select', 'textarea', 'a', 'area'];

    const tagName = element.tagName.toLowerCase();
    if (focusableElements.includes(tagName)) {
      return !element.hasAttribute('disabled');
    }

    return element.hasAttribute('tabindex') && element.getAttribute('tabindex') !== '-1';
  }

  /**
   * Create DOM connection object
   */
  private createDOMConnection(
    connectionId: string,
    config: DOMDataSourceConfig,
    rootElement: Element
  ): DOMConnection {
    const baseConnection = this.createConnection(connectionId, {
      selector: config.selector,
      searchAttributes: config.searchAttributes,
      liveUpdates: config.liveUpdate?.enabled ?? false,
    });

    return {
      ...baseConnection,
      rootElement,
      shadowRoots: [],
      searchScope: 'element',
      performanceMetrics: {
        elementCount: 0,
        shadowRootCount: 0,
        lastScanTime: Date.now(),
      },
    } as DOMConnection;
  }

  /**
   * Find root element using selector
   */
  private findRootElement(selector: string): Element | null {
    try {
      return document.querySelector(selector);
    } catch (error) {
      console.error('Invalid selector:', selector, error);
      return null;
    }
  }

  /**
   * Set up live updates for DOM changes
   */
  private setupLiveUpdates(
    connectionId: string,
    config: DOMDataSourceConfig,
    rootElement: Element
  ): void {
    if (!config.liveUpdate?.enabled) return;

    const mutationCallback: MutationCallback = mutations => {
      // Invalidate cache when DOM changes
      this.clearConnectionCache(connectionId);

      // Emit change event (would be handled by higher-level components)
      this.emitDOMChangeEvent(connectionId, mutations);
    };

    const observer = mutationObserverFactory.createObserver(mutationCallback, config.liveUpdate);

    observer.observe(rootElement);
    this.mutationObservers.set(connectionId, observer);
  }

  /**
   * Emit DOM change event
   */
  private emitDOMChangeEvent(connectionId: string, mutations: any[]): void {
    // This would emit events to notify components of DOM changes
    // For now, just log the event
    console.log(`DOM changed for connection ${connectionId}:`, mutations.length, 'mutations');
  }

  /**
   * Count elements in scope
   */
  private countElements(rootElement: Element, config: DOMDataSourceConfig): number {
    try {
      return rootElement.querySelectorAll(config.selector || '*').length;
    } catch {
      return 0;
    }
  }

  /**
   * Create element path for identification
   */
  private createElementPath(element: Element): string {
    if (this.elementCache.has(element)) {
      return this.elementCache.get(element)!;
    }

    const path = this.buildElementPath(element);
    this.elementCache.set(element, path);
    return path;
  }

  /**
   * Build element path from root
   */
  private buildElementPath(element: Element): string {
    const path: string[] = [];
    let current: Element | null = element;

    while (current && current !== document.documentElement) {
      const parent: Element | null = current.parentElement;
      if (!parent) break;

      const index = Array.from(parent.children).indexOf(current);
      const tagName = current.tagName.toLowerCase();
      const id = current.id ? `#${current.id}` : '';
      const classes = current.className ? `.${current.className.split(' ').join('.')}` : '';

      path.unshift(`${tagName}${id}${classes}[${index}]`);
      current = parent;
    }

    return path.join(' > ');
  }

  /**
   * Generate cache key for query
   */
  private generateCacheKey(query: string, config: DOMDataSourceConfig): string {
    return `${config.selector}:${config.searchAttributes.join(',')}:${query}`;
  }

  /**
   * Clear cache for connection
   */
  private clearConnectionCache(_connectionId: string): void {
    // Remove all cache entries for this connection
    // In a real implementation, we'd track which cache keys belong to which connection
    this.resultCache.clear(); // Simplified
  }

  /**
   * Clone results for caching
   */
  private cloneResults(results: RawResult[]): RawResult[] {
    return results.map(result => ({ ...result }));
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(config: DOMDataSourceConfig): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const selectorHash = this.simpleHash(config.selector);
    return `dom_${selectorHash}_${timestamp}_${random}`;
  }

  /**
   * Simple hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Get connection configuration (mock)
   */
  private getConnectionConfig(connection: DOMConnection): DOMDataSourceConfig {
    // In a real implementation, this would retrieve the actual config
    return {
      type: 'dom',
      selector: (connection.metadata.selector as string) || 'body',
      searchAttributes: (connection.metadata.searchAttributes as string[]) || ['textContent'],
      liveUpdate: {
        enabled: (connection.metadata.liveUpdates as boolean) || false,
        strategy: 'mutation-observer',
      },
      performance: {
        enableCaching: true,
        cacheTTL: 60000,
      },
    };
  }
}

/**
 * DOM adapter factory
 */
export class DOMAdapterFactory {
  private static instance: DOMAdapter | null = null;

  /**
   * Get singleton DOM adapter instance
   */
  public static getInstance(): DOMAdapter {
    if (!this.instance) {
      this.instance = new DOMAdapter();
    }
    return this.instance;
  }

  /**
   * Create new DOM adapter instance
   */
  public static createAdapter(): DOMAdapter {
    return new DOMAdapter();
  }

  /**
   * Clear singleton instance
   */
  public static clearInstance(): void {
    this.instance = null;
  }

  /**
   * Check if DOM is available
   */
  public static isDOMAvailable(): boolean {
    return typeof document !== 'undefined' && typeof window !== 'undefined';
  }
}

/**
 * Global DOM adapter factory instance
 */
export const domAdapterFactory = DOMAdapterFactory;
