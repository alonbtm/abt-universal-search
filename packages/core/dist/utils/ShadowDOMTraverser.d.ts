/**
 * Shadow DOM Traverser - Shadow root traversal and element identification
 * @description Handles shadow DOM traversal for modern web components
 */
import type { DOMShadowConfig } from '../types/Config';
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
export declare class ShadowDOMTraverser {
    private config;
    private traversedRoots;
    private elementCache;
    constructor(config: DOMShadowConfig);
    /**
     * Find all elements matching selector across shadow boundaries
     */
    findElements(selector: string, root?: Element | Document): ShadowElementReference[];
    /**
     * Get all shadow roots within a given element
     */
    findShadowRoots(root?: Element | Document): ShadowRoot[];
    /**
     * Create a stable path for an element across shadow boundaries
     */
    createElementPath(element: Element): string;
    /**
     * Find an element by its shadow-aware path
     */
    findElementByPath(path: string, root?: Element | Document): Element | null;
    /**
     * Get traversal statistics for the last operation
     */
    getTraversalStats(): ShadowTraversalStats;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<DOMShadowConfig>): void;
    /**
     * Check if an element is inside a shadow root
     */
    isInShadowDOM(element: Element): boolean;
    /**
     * Get the shadow root that contains an element
     */
    getShadowRoot(element: Element): ShadowRoot | null;
    /**
     * Traverse DOM tree with shadow DOM support
     */
    private traverseWithShadow;
    /**
     * Find direct shadow roots within an element (non-recursive)
     */
    private findDirectShadowRoots;
    /**
     * Get shadow root from an element
     */
    private getShadowRootFromElement;
    /**
     * Collect all shadow roots recursively
     */
    private collectShadowRoots;
    /**
     * Create shadow element reference
     */
    private createShadowReference;
    /**
     * Create regular (non-shadow) element reference
     */
    private createRegularReference;
    /**
     * Build element path from document root
     */
    private buildElementPath;
    /**
     * Build shadow-specific element path
     */
    private buildShadowElementPath;
    /**
     * Build path for shadow root
     */
    private buildShadowPath;
    /**
     * Resolve element from path
     */
    private resolveElementPath;
    /**
     * Resolve regular element path
     */
    private resolveRegularPath;
    /**
     * Resolve shadow DOM path
     */
    private resolveShadowPath;
}
/**
 * Shadow DOM utility functions
 */
export declare class ShadowDOMUtils {
    /**
     * Check if Shadow DOM is supported
     */
    static isSupported(): boolean;
    /**
     * Create a traverser with default configuration
     */
    static createTraverser(config?: Partial<DOMShadowConfig>): ShadowDOMTraverser;
    /**
     * Find all custom elements (potential shadow DOM hosts)
     */
    static findCustomElements(root?: Element | Document): Element[];
    /**
     * Get shadow DOM statistics for a given root
     */
    static getShadowStatistics(root?: Element | Document): {
        customElements: number;
        shadowRoots: number;
        maxDepth: number;
    };
}
/**
 * Shadow DOM traverser factory
 */
export declare class ShadowDOMTraverserFactory {
    private static instance;
    /**
     * Get singleton traverser instance
     */
    static getInstance(config?: DOMShadowConfig): ShadowDOMTraverser;
    /**
     * Create new traverser instance
     */
    static createTraverser(config: DOMShadowConfig): ShadowDOMTraverser;
    /**
     * Clear singleton instance
     */
    static clearInstance(): void;
}
/**
 * Global shadow DOM traverser factory
 */
export declare const shadowDOMTraverserFactory: typeof ShadowDOMTraverserFactory;
//# sourceMappingURL=ShadowDOMTraverser.d.ts.map