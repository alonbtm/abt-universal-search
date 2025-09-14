/**
 * Shadow DOM Traverser - Shadow root traversal and element identification
 * @description Handles shadow DOM traversal for modern web components
 */
import { ValidationError } from './validation';
/**
 * Advanced Shadow DOM traverser with comprehensive shadow root support
 */
export class ShadowDOMTraverser {
    constructor(config) {
        this.traversedRoots = new Set();
        this.elementCache = new WeakMap();
        this.config = config;
    }
    /**
     * Find all elements matching selector across shadow boundaries
     */
    findElements(selector, root = document) {
        if (!this.config.enabled) {
            // Fall back to regular querySelector if shadow DOM disabled
            const elements = Array.from(root.querySelectorAll(selector));
            return elements.map(element => this.createRegularReference(element));
        }
        const results = [];
        const startTime = performance.now();
        this.traversedRoots.clear();
        this.traverseWithShadow(root, selector, results, '', 0);
        return results;
    }
    /**
     * Get all shadow roots within a given element
     */
    findShadowRoots(root = document) {
        const shadowRoots = [];
        const startTime = performance.now();
        this.collectShadowRoots(root, shadowRoots, 0);
        return shadowRoots;
    }
    /**
     * Create a stable path for an element across shadow boundaries
     */
    createElementPath(element) {
        if (this.elementCache.has(element)) {
            return this.elementCache.get(element);
        }
        const path = this.buildElementPath(element);
        this.elementCache.set(element, path);
        return path;
    }
    /**
     * Find an element by its shadow-aware path
     */
    findElementByPath(path, root = document) {
        try {
            return this.resolveElementPath(path, root);
        }
        catch (error) {
            console.warn('Failed to resolve element path:', path, error);
            return null;
        }
    }
    /**
     * Get traversal statistics for the last operation
     */
    getTraversalStats() {
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
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        // Clear cache when configuration changes
        this.elementCache = new WeakMap();
        this.traversedRoots.clear();
    }
    /**
     * Check if an element is inside a shadow root
     */
    isInShadowDOM(element) {
        let current = element;
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
    getShadowRoot(element) {
        let current = element;
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
    traverseWithShadow(root, selector, results, currentPath, depth) {
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
    findDirectShadowRoots(root) {
        const shadowRoots = [];
        if (root instanceof Document) {
            // Search all elements in document
            const walker = document.createTreeWalker(root.documentElement, NodeFilter.SHOW_ELEMENT, null);
            let element;
            while (element = walker.nextNode()) {
                const shadowRoot = this.getShadowRootFromElement(element);
                if (shadowRoot) {
                    shadowRoots.push(shadowRoot);
                }
            }
        }
        else {
            // Search within specific element
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null);
            let element;
            while (element = walker.nextNode()) {
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
    getShadowRootFromElement(element) {
        try {
            // Try to access open shadow root
            if (element.shadowRoot) {
                return element.shadowRoot;
            }
            // Try to access closed shadow root (if configured)
            if (this.config.includeClosed) {
                // This is a hack - in real scenarios, closed shadow roots
                // are not accessible. This is just for demonstration.
                const closedRoot = element.shadowRoot;
                if (closedRoot instanceof ShadowRoot) {
                    return closedRoot;
                }
            }
            return null;
        }
        catch (error) {
            // Shadow root might be inaccessible
            return null;
        }
    }
    /**
     * Collect all shadow roots recursively
     */
    collectShadowRoots(root, collected, depth) {
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
    createShadowReference(element, currentPath, depth) {
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
    createRegularReference(element) {
        const documentPath = this.buildElementPath(element);
        return {
            element,
            documentPath,
            shadowPath: '',
            shadowRoot: null, // Not in shadow DOM
            shadowDepth: 0,
            hostElement: null // Not in shadow DOM
        };
    }
    /**
     * Build element path from document root
     */
    buildElementPath(element) {
        const path = [];
        let current = element;
        while (current && current !== document.documentElement) {
            const parent = current.parentElement;
            if (!parent)
                break;
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
    buildShadowElementPath(element, shadowRoot) {
        const path = [];
        let current = element;
        while (current && current.getRootNode() === shadowRoot) {
            const parent = current.parentElement;
            if (!parent)
                break;
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
    buildShadowPath(shadowRoot, parentPath) {
        const hostPath = this.buildElementPath(shadowRoot.host);
        return parentPath ? `${parentPath} :: ${hostPath}` : hostPath;
    }
    /**
     * Resolve element from path
     */
    resolveElementPath(path, root) {
        if (path.includes('::')) {
            // Shadow DOM path
            return this.resolveShadowPath(path, root);
        }
        else {
            // Regular path
            return this.resolveRegularPath(path, root);
        }
    }
    /**
     * Resolve regular element path
     */
    resolveRegularPath(path, root) {
        const parts = path.split(' > ');
        let current = root;
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
            const children = Array.from(current.children);
            const child = children[index];
            if (!child || child.tagName.toLowerCase() !== tagName) {
                return null;
            }
            current = child;
        }
        return current;
    }
    /**
     * Resolve shadow DOM path
     */
    resolveShadowPath(path, root) {
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
    static isSupported() {
        return typeof Element !== 'undefined' &&
            typeof Element.prototype.attachShadow === 'function';
    }
    /**
     * Create a traverser with default configuration
     */
    static createTraverser(config) {
        const defaultConfig = {
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
    static findCustomElements(root = document) {
        const customElements = [];
        const walker = document.createTreeWalker(root instanceof Document ? root.documentElement : root, NodeFilter.SHOW_ELEMENT, {
            acceptNode: (node) => {
                const element = node;
                // Custom elements have hyphens in their tag names
                if (element.tagName && element.tagName.includes('-')) {
                    return NodeFilter.FILTER_ACCEPT;
                }
                return NodeFilter.FILTER_SKIP;
            }
        });
        let element;
        while (element = walker.nextNode()) {
            customElements.push(element);
        }
        return customElements;
    }
    /**
     * Get shadow DOM statistics for a given root
     */
    static getShadowStatistics(root = document) {
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
    /**
     * Get singleton traverser instance
     */
    static getInstance(config) {
        if (!this.instance || config) {
            const defaultConfig = {
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
    static createTraverser(config) {
        return new ShadowDOMTraverser(config);
    }
    /**
     * Clear singleton instance
     */
    static clearInstance() {
        this.instance = null;
    }
}
ShadowDOMTraverserFactory.instance = null;
/**
 * Global shadow DOM traverser factory
 */
export const shadowDOMTraverserFactory = ShadowDOMTraverserFactory;
//# sourceMappingURL=ShadowDOMTraverser.js.map