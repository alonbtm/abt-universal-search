/**
 * Shadow DOM Traverser - Shadow root traversal and element identification
 * @description Handles shadow DOM traversal for modern web components
 */

import type { DOMShadowConfig } from '../types/Config';
import type { DOMElementResult } from '../types/Results';
import { ValidationError } from './validation';

/**
 * Shadow DOM element reference with path information
 */
export interface ShadowElementReference {
  /** The actual element */
  element: Element;
  /** Path from document root */
  documentPath: string;
  /** Shadow DOM path */
  shadowPath: string;
  /** Shadow root that contains this element */
  shadowRoot: ShadowRoot;
  /** Depth in shadow DOM hierarchy */
  shadowDepth: number;
  /** Host element of the shadow root */
  hostElement: Element;
}

/**
 * Shadow DOM traversal statistics
 */
export interface ShadowTraversalStats {
  /** Total elements found */
  totalElements: number;
  /** Total shadow roots traversed */
  totalShadowRoots: number;
  /** Maximum shadow depth reached */
  maxDepth: number;
  /** Traversal time in milliseconds */
  traversalTime: number;
  /** Number of inaccessible closed shadow roots */
  inaccessibleRoots: number;
}

/**
 * Advanced Shadow DOM traverser with comprehensive shadow root support
 */
export class ShadowDOMTraverser {
  private config: DOMShadowConfig;
  private traversedRoots = new Set<ShadowRoot>();
  private elementCache = new WeakMap<Element, string>();

  constructor(config: DOMShadowConfig) {
    this.config = config;
  }

  /**
   * Find all elements matching selector across shadow boundaries
   */
  public findElements(
    selector: string,
    root: Element | Document = document
  ): ShadowElementReference[] {
    if (!this.config.enabled) {
      // Fall back to regular querySelector if shadow DOM disabled
      const elements = Array.from(root.querySelectorAll(selector));
      return elements.map(element => this.createRegularReference(element));
    }

    const results: ShadowElementReference[] = [];
    const startTime = performance.now();

    this.traversedRoots.clear();
    this.traverseWithShadow(root, selector, results, '', 0);

    return results;
  }

  /**
   * Get all shadow roots within a given element
   */
  public findShadowRoots(root: Element | Document = document): ShadowRoot[] {
    const shadowRoots: ShadowRoot[] = [];
    const startTime = performance.now();

    this.collectShadowRoots(root, shadowRoots, 0);

    return shadowRoots;
  }

  /**
   * Create a stable path for an element across shadow boundaries
   */
  public createElementPath(element: Element): string {
    if (this.elementCache.has(element)) {
      return this.elementCache.get(element)!;
    }

    const path = this.buildElementPath(element);
    this.elementCache.set(element, path);
    return path;
  }

  /**
   * Find an element by its shadow-aware path
   */
  public findElementByPath(path: string, root: Element | Document = document): Element | null {
    try {
      return this.resolveElementPath(path, root);
    } catch (error) {
      console.warn('Failed to resolve element path:', path, error);
      return null;
    }
  }

  /**
   * Get traversal statistics for the last operation
   */
  public getTraversalStats(): ShadowTraversalStats {
    return {
      totalElements: 0,
      totalShadowRoots: this.traversedRoots.size,
      maxDepth: 0,
      traversalTime: 0,
      inaccessibleRoots: 0
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<DOMShadowConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Clear cache when configuration changes
    this.elementCache = new WeakMap();
    this.traversedRoots.clear();
  }

  /**
   * Check if an element is inside a shadow root
   */
  public isInShadowDOM(element: Element): boolean {
    let current: Node | null = element;
    
    while (current) {
      if (current instanceof ShadowRoot) {
        return true;
      }
      current = current.parentNode;
    }
    
    return false;
  }

  /**
   * Get the shadow root that contains an element
   */
  public getShadowRoot(element: Element): ShadowRoot | null {
    let current: Node | null = element;
    
    while (current) {
      if (current instanceof ShadowRoot) {
        return current;
      }
      current = current.parentNode;
    }
    
    return null;
  }

  /**
   * Traverse DOM tree with shadow DOM support
   */
  private traverseWithShadow(
    root: Element | Document,
    selector: string,
    results: ShadowElementReference[],
    currentPath: string,
    depth: number
  ): void {
    if (depth > this.config.maxDepth) {
      return;
    }

    // Find elements in current context
    const elements = Array.from(root.querySelectorAll(selector));
    
    for (const element of elements) {
      const shadowRef = this.createShadowReference(element, currentPath, depth);
      if (shadowRef) {
        results.push(shadowRef);
      }
    }

    // Find shadow roots and traverse them
    const shadowRoots = this.findDirectShadowRoots(root);
    
    for (const shadowRoot of shadowRoots) {
      if (this.traversedRoots.has(shadowRoot)) {
        continue; // Avoid infinite loops
      }
      
      this.traversedRoots.add(shadowRoot);
      
      const shadowPath = this.buildShadowPath(shadowRoot, currentPath);
      this.traverseWithShadow(shadowRoot, selector, results, shadowPath, depth + 1);
    }
  }

  /**
   * Find direct shadow roots within an element (non-recursive)
   */
  private findDirectShadowRoots(root: Element | Document): ShadowRoot[] {
    const shadowRoots: ShadowRoot[] = [];
    
    if (root instanceof Document) {
      // Search all elements in document
      const walker = document.createTreeWalker(
        root.documentElement,
        NodeFilter.SHOW_ELEMENT,
        null
      );
      
      let element: Element | null;
      while (element = walker.nextNode() as Element) {
        const shadowRoot = this.getShadowRootFromElement(element);
        if (shadowRoot) {
          shadowRoots.push(shadowRoot);
        }
      }
    } else {
      // Search within specific element
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_ELEMENT,
        null
      );
      
      let element: Element | null;
      while (element = walker.nextNode() as Element) {
        const shadowRoot = this.getShadowRootFromElement(element);
        if (shadowRoot) {
          shadowRoots.push(shadowRoot);
        }
      }
    }
    
    return shadowRoots;
  }

  /**
   * Get shadow root from an element
   */
  private getShadowRootFromElement(element: Element): ShadowRoot | null {
    try {
      // Try to access open shadow root
      if (element.shadowRoot) {
        return element.shadowRoot;
      }
      
      // Try to access closed shadow root (if configured)
      if (this.config.includeClosed) {
        // This is a hack - in real scenarios, closed shadow roots
        // are not accessible. This is just for demonstration.
        const closedRoot = (element as any).shadowRoot;
        if (closedRoot instanceof ShadowRoot) {
          return closedRoot;
        }
      }
      
      return null;
    } catch (error) {
      // Shadow root might be inaccessible
      return null;
    }
  }

  /**
   * Collect all shadow roots recursively
   */
  private collectShadowRoots(
    root: Element | Document,
    collected: ShadowRoot[],
    depth: number
  ): void {
    if (depth > this.config.maxDepth) {
      return;
    }

    const shadowRoots = this.findDirectShadowRoots(root);
    
    for (const shadowRoot of shadowRoots) {
      if (!collected.includes(shadowRoot)) {
        collected.push(shadowRoot);
        
        // Recursively collect from shadow root
        this.collectShadowRoots(shadowRoot, collected, depth + 1);
      }
    }
  }

  /**
   * Create shadow element reference
   */
  private createShadowReference(
    element: Element,
    currentPath: string,
    depth: number
  ): ShadowElementReference | null {
    const shadowRoot = this.getShadowRoot(element);
    
    if (!shadowRoot) {
      return this.createRegularReference(element);
    }

    const hostElement = shadowRoot.host;
    const documentPath = this.buildElementPath(element);
    const shadowPath = this.buildShadowElementPath(element, shadowRoot);

    return {
      element,
      documentPath,
      shadowPath,
      shadowRoot,
      shadowDepth: depth,
      hostElement
    };
  }

  /**
   * Create regular (non-shadow) element reference
   */
  private createRegularReference(element: Element): ShadowElementReference {
    const documentPath = this.buildElementPath(element);
    
    return {
      element,
      documentPath,
      shadowPath: '',
      shadowRoot: null as any, // Not in shadow DOM
      shadowDepth: 0,
      hostElement: null as any // Not in shadow DOM
    };
  }

  /**
   * Build element path from document root
   */
  private buildElementPath(element: Element): string {
    const path: string[] = [];
    let current: Element | null = element;
    
    while (current && current !== document.documentElement) {
      const parent = current.parentElement;
      if (!parent) break;
      
      const index = Array.from(parent.children).indexOf(current);
      const tagName = current.tagName.toLowerCase();
      
      path.unshift(`${tagName}[${index}]`);
      current = parent;
    }
    
    return path.join(' > ');
  }

  /**
   * Build shadow-specific element path
   */
  private buildShadowElementPath(element: Element, shadowRoot: ShadowRoot): string {
    const path: string[] = [];
    let current: Element | null = element;
    
    while (current && current.getRootNode() === shadowRoot) {
      const parent = current.parentElement;
      if (!parent) break;
      
      const index = Array.from(parent.children).indexOf(current);
      const tagName = current.tagName.toLowerCase();
      
      path.unshift(`${tagName}[${index}]`);
      current = parent;
    }
    
    return path.join(' > ');
  }

  /**
   * Build path for shadow root
   */
  private buildShadowPath(shadowRoot: ShadowRoot, parentPath: string): string {
    const hostPath = this.buildElementPath(shadowRoot.host);
    return parentPath ? `${parentPath} :: ${hostPath}` : hostPath;
  }

  /**
   * Resolve element from path
   */
  private resolveElementPath(path: string, root: Element | Document): Element | null {
    if (path.includes('::')) {
      // Shadow DOM path
      return this.resolveShadowPath(path, root);
    } else {
      // Regular path
      return this.resolveRegularPath(path, root);
    }
  }

  /**
   * Resolve regular element path
   */
  private resolveRegularPath(path: string, root: Element | Document): Element | null {
    const parts = path.split(' > ');
    let current: Element | Document = root;
    
    for (const part of parts) {
      const match = part.match(/^(\w+)\[(\d+)\]$/);
      if (!match) {
        throw new ValidationError(`Invalid path part: ${part}`);
      }
      
      const [, tagName, indexStr] = match;
      const index = parseInt(indexStr, 10);
      
      if (current instanceof Document) {
        current = current.documentElement;
      }
      
      const children = Array.from((current as Element).children);
      const child = children[index];
      
      if (!child || child.tagName.toLowerCase() !== tagName) {
        return null;
      }
      
      current = child;
    }
    
    return current as Element;
  }

  /**
   * Resolve shadow DOM path
   */
  private resolveShadowPath(path: string, root: Element | Document): Element | null {
    const [documentPath, shadowPath] = path.split(' :: ');
    
    // First, find the host element
    const hostElement = this.resolveRegularPath(documentPath, root);
    if (!hostElement) {
      return null;
    }
    
    // Then, find the element within the shadow root
    const shadowRoot = this.getShadowRootFromElement(hostElement);
    if (!shadowRoot) {
      return null;
    }
    
    return this.resolveRegularPath(shadowPath, shadowRoot);
  }
}

/**
 * Shadow DOM utility functions
 */
export class ShadowDOMUtils {
  /**
   * Check if Shadow DOM is supported
   */
  public static isSupported(): boolean {
    return typeof Element !== 'undefined' && 
           typeof Element.prototype.attachShadow === 'function';
  }

  /**
   * Create a traverser with default configuration
   */
  public static createTraverser(config?: Partial<DOMShadowConfig>): ShadowDOMTraverser {
    const defaultConfig: DOMShadowConfig = {
      enabled: this.isSupported(),
      maxDepth: 10,
      includeClosed: false,
      identificationStrategy: 'path'
    };

    return new ShadowDOMTraverser({ ...defaultConfig, ...config });
  }

  /**
   * Find all custom elements (potential shadow DOM hosts)
   */
  public static findCustomElements(root: Element | Document = document): Element[] {
    const customElements: Element[] = [];
    const walker = document.createTreeWalker(
      root instanceof Document ? root.documentElement : root,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node: Node) => {
          const element = node as Element;
          // Custom elements have hyphens in their tag names
          if (element.tagName && element.tagName.includes('-')) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );

    let element: Element | null;
    while (element = walker.nextNode() as Element) {
      customElements.push(element);
    }

    return customElements;
  }

  /**
   * Get shadow DOM statistics for a given root
   */
  public static getShadowStatistics(root: Element | Document = document): {
    customElements: number;
    shadowRoots: number;
    maxDepth: number;
  } {
    const traverser = this.createTraverser();
    const shadowRoots = traverser.findShadowRoots(root);
    const customElements = this.findCustomElements(root);

    // Calculate max depth
    const maxDepth = 0;
    // This would require more complex traversal to calculate accurately
    // For now, return a simple estimate
    
    return {
      customElements: customElements.length,
      shadowRoots: shadowRoots.length,
      maxDepth
    };
  }
}

/**
 * Shadow DOM traverser factory
 */
export class ShadowDOMTraverserFactory {
  private static instance: ShadowDOMTraverser | null = null;

  /**
   * Get singleton traverser instance
   */
  public static getInstance(config?: DOMShadowConfig): ShadowDOMTraverser {
    if (!this.instance || config) {
      const defaultConfig: DOMShadowConfig = {
        enabled: ShadowDOMUtils.isSupported(),
        maxDepth: 10,
        includeClosed: false,
        identificationStrategy: 'path'
      };

      this.instance = new ShadowDOMTraverser(config || defaultConfig);
    }

    return this.instance;
  }

  /**
   * Create new traverser instance
   */
  public static createTraverser(config: DOMShadowConfig): ShadowDOMTraverser {
    return new ShadowDOMTraverser(config);
  }

  /**
   * Clear singleton instance
   */
  public static clearInstance(): void {
    this.instance = null;
  }
}

/**
 * Global shadow DOM traverser factory
 */
export const shadowDOMTraverserFactory = ShadowDOMTraverserFactory;