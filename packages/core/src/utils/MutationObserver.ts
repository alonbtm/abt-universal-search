/**
 * Mutation Observer Utility - DOM change detection and live updates
 * @description Handles DOM mutation observation for live search result updates
 */

import type { DOMUpdateConfig } from '../types/Config';
import type { DataChange } from '../types/Results';

/**
 * DOM mutation event interface
 */
export interface DOMMutationEvent {
  /** Type of mutation */
  type: 'childList' | 'attributes' | 'characterData';
  /** Target element */
  target: Element;
  /** Added nodes */
  addedNodes: Node[];
  /** Removed nodes */
  removedNodes: Node[];
  /** Changed attributes */
  attributeName?: string;
  /** Old attribute value */
  oldValue?: string;
  /** Timestamp of mutation */
  timestamp: number;
}

/**
 * Mutation observer callback
 */
export type MutationCallback = (mutations: DOMMutationEvent[]) => void;

/**
 * Enhanced DOM mutation observer with filtering and performance optimization
 */
export class EnhancedMutationObserver {
  private observer: MutationObserver | null = null;
  private config: DOMUpdateConfig;
  private callback: MutationCallback;
  private isObserving = false;
  private mutationBuffer: DOMMutationEvent[] = [];
  private bufferTimeout: number | null = null;
  private readonly bufferDelay = 16; // ~60fps

  constructor(callback: MutationCallback, config: DOMUpdateConfig) {
    this.callback = callback;
    this.config = config;
  }

  /**
   * Start observing DOM mutations
   */
  public observe(target: Element): void {
    if (!this.config.enabled || this.isObserving) {
      return;
    }

    if (typeof MutationObserver === 'undefined') {
      console.warn('MutationObserver is not supported in this environment');
      return;
    }

    const options: MutationObserverInit = {
      childList: this.config.mutationOptions?.childList ?? true,
      subtree: this.config.mutationOptions?.subtree ?? true,
      attributes: this.config.mutationOptions?.attributes ?? true,
      characterData: this.config.mutationOptions?.characterData ?? true,
      attributeOldValue: true,
      characterDataOldValue: true
    };

    if (this.config.mutationOptions?.attributeFilter) {
      options.attributeFilter = this.config.mutationOptions.attributeFilter;
    }

    this.observer = new MutationObserver((mutations) => {
      this.processMutations(mutations);
    });

    this.observer.observe(target, options);
    this.isObserving = true;
  }

  /**
   * Stop observing DOM mutations
   */
  public disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
      this.bufferTimeout = null;
    }

    this.isObserving = false;
    this.mutationBuffer = [];
  }

  /**
   * Check if currently observing
   */
  public isActive(): boolean {
    return this.isObserving;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<DOMUpdateConfig>): void {
    this.config = { ...this.config, ...config };
    
    // If observing, need to restart with new config
    if (this.isObserving && this.observer) {
      const target = this.getCurrentTarget();
      this.disconnect();
      if (target) {
        this.observe(target);
      }
    }
  }

  /**
   * Process raw mutations and convert to enhanced format
   */
  private processMutations(mutations: MutationRecord[]): void {
    const enhancedMutations: DOMMutationEvent[] = [];
    const timestamp = Date.now();

    for (const mutation of mutations) {
      // Filter out irrelevant mutations
      if (!this.shouldProcessMutation(mutation)) {
        continue;
      }

      const enhancedMutation: DOMMutationEvent = {
        type: mutation.type,
        target: mutation.target as Element,
        addedNodes: Array.from(mutation.addedNodes),
        removedNodes: Array.from(mutation.removedNodes),
        attributeName: mutation.attributeName || undefined,
        oldValue: mutation.oldValue || undefined,
        timestamp
      };

      enhancedMutations.push(enhancedMutation);
    }

    if (enhancedMutations.length > 0) {
      this.bufferMutations(enhancedMutations);
    }
  }

  /**
   * Buffer mutations to avoid excessive callback calls
   */
  private bufferMutations(mutations: DOMMutationEvent[]): void {
    this.mutationBuffer.push(...mutations);

    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
    }

    this.bufferTimeout = window.setTimeout(() => {
      if (this.mutationBuffer.length > 0) {
        const bufferedMutations = [...this.mutationBuffer];
        this.mutationBuffer = [];
        this.callback(bufferedMutations);
      }
      this.bufferTimeout = null;
    }, this.bufferDelay);
  }

  /**
   * Determine if a mutation should be processed
   */
  private shouldProcessMutation(mutation: MutationRecord): boolean {
    // Skip mutations on script and style elements
    if (mutation.target.nodeName === 'SCRIPT' || mutation.target.nodeName === 'STYLE') {
      return false;
    }

    // Skip mutations on elements with data-search-ignore attribute
    if (mutation.target instanceof Element && 
        mutation.target.hasAttribute('data-search-ignore')) {
      return false;
    }

    // For attribute mutations, check if it's a relevant attribute
    if (mutation.type === 'attributes') {
      const attributeName = mutation.attributeName;
      if (!attributeName) return false;

      // Skip style and class changes unless specifically configured
      if ((attributeName === 'style' || attributeName === 'class') && 
          !this.config.mutationOptions?.attributeFilter?.includes(attributeName)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get current observation target (if available)
   */
  private getCurrentTarget(): Element | null {
    // This is a limitation of the MutationObserver API
    // We can't easily get the current target, so we return null
    // The caller should track the target if they need to restart observation
    return null;
  }
}

/**
 * DOM polling observer for environments without MutationObserver
 */
export class DOMPollingObserver {
  private intervalId: number | null = null;
  private callback: MutationCallback;
  private config: DOMUpdateConfig;
  private target: Element | null = null;
  private lastSnapshot: string | null = null;

  constructor(callback: MutationCallback, config: DOMUpdateConfig) {
    this.callback = callback;
    this.config = config;
  }

  /**
   * Start polling for DOM changes
   */
  public observe(target: Element): void {
    if (!this.config.enabled || this.intervalId !== null) {
      return;
    }

    this.target = target;
    this.lastSnapshot = this.createSnapshot(target);

    const interval = this.config.pollIntervalMs || 1000;
    this.intervalId = window.setInterval(() => {
      this.checkForChanges();
    }, interval);
  }

  /**
   * Stop polling for DOM changes
   */
  public disconnect(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.target = null;
    this.lastSnapshot = null;
  }

  /**
   * Check if currently polling
   */
  public isActive(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Check for DOM changes by comparing snapshots
   */
  private checkForChanges(): void {
    if (!this.target) return;

    const currentSnapshot = this.createSnapshot(this.target);
    if (currentSnapshot !== this.lastSnapshot) {
      // Create a synthetic mutation event for changes
      const syntheticMutation: DOMMutationEvent = {
        type: 'childList',
        target: this.target,
        addedNodes: [],
        removedNodes: [],
        timestamp: Date.now()
      };

      this.callback([syntheticMutation]);
      this.lastSnapshot = currentSnapshot;
    }
  }

  /**
   * Create a snapshot of the DOM structure
   */
  private createSnapshot(element: Element): string {
    // Simple snapshot based on innerHTML
    // In a real implementation, you might want a more sophisticated approach
    try {
      return element.innerHTML;
    } catch {
      // Fallback for elements where innerHTML might not be available
      return element.outerHTML || element.textContent || '';
    }
  }
}

/**
 * Universal DOM observer that chooses the best strategy
 */
export class UniversalDOMObserver {
  private mutationObserver?: EnhancedMutationObserver;
  private pollingObserver?: DOMPollingObserver;
  private callback: MutationCallback;
  private config: DOMUpdateConfig;

  constructor(callback: MutationCallback, config: DOMUpdateConfig) {
    this.callback = callback;
    this.config = config;
  }

  /**
   * Start observing DOM changes using the best available method
   */
  public observe(target: Element): void {
    if (!this.config.enabled) {
      return;
    }

    switch (this.config.strategy) {
      case 'mutation-observer':
        this.useMutationObserver(target);
        break;
      case 'polling':
        this.usePollingObserver(target);
        break;
      case 'static':
        // No observation for static mode
        break;
      default:
        // Auto-detect best strategy
        this.useAutoStrategy(target);
        break;
    }
  }

  /**
   * Stop observing DOM changes
   */
  public disconnect(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = undefined;
    }

    if (this.pollingObserver) {
      this.pollingObserver.disconnect();
      this.pollingObserver = undefined;
    }
  }

  /**
   * Check if currently observing
   */
  public isActive(): boolean {
    return (this.mutationObserver?.isActive() ?? false) || 
           (this.pollingObserver?.isActive() ?? false);
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<DOMUpdateConfig>): void {
    this.config = { ...this.config, ...config };

    // Update existing observers
    if (this.mutationObserver) {
      this.mutationObserver.updateConfig(this.config);
    }
  }

  /**
   * Use MutationObserver strategy
   */
  private useMutationObserver(target: Element): void {
    this.mutationObserver = new EnhancedMutationObserver(this.callback, this.config);
    this.mutationObserver.observe(target);
  }

  /**
   * Use polling strategy
   */
  private usePollingObserver(target: Element): void {
    this.pollingObserver = new DOMPollingObserver(this.callback, this.config);
    this.pollingObserver.observe(target);
  }

  /**
   * Auto-detect and use the best strategy
   */
  private useAutoStrategy(target: Element): void {
    if (typeof MutationObserver !== 'undefined') {
      this.useMutationObserver(target);
    } else {
      this.usePollingObserver(target);
    }
  }
}

/**
 * Create mutation observer instance with factory
 */
export class MutationObserverFactory {
  /**
   * Create appropriate DOM observer for the environment
   */
  public static createObserver(
    callback: MutationCallback,
    config: DOMUpdateConfig
  ): UniversalDOMObserver {
    return new UniversalDOMObserver(callback, config);
  }

  /**
   * Test if MutationObserver is supported
   */
  public static isSupported(): boolean {
    return typeof MutationObserver !== 'undefined';
  }

  /**
   * Get recommended strategy for current environment
   */
  public static getRecommendedStrategy(): DOMUpdateConfig['strategy'] {
    if (this.isSupported()) {
      return 'mutation-observer';
    } else {
      return 'polling';
    }
  }
}

/**
 * Global mutation observer factory instance
 */
export const mutationObserverFactory = MutationObserverFactory;