/**
 * Mutation Observer Utility - DOM change detection and live updates
 * @description Handles DOM mutation observation for live search result updates
 */
import type { DOMUpdateConfig } from '../types/Config';
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
export declare class EnhancedMutationObserver {
    private observer;
    private config;
    private callback;
    private isObserving;
    private mutationBuffer;
    private bufferTimeout;
    private readonly bufferDelay;
    constructor(callback: MutationCallback, config: DOMUpdateConfig);
    /**
     * Start observing DOM mutations
     */
    observe(target: Element): void;
    /**
     * Stop observing DOM mutations
     */
    disconnect(): void;
    /**
     * Check if currently observing
     */
    isActive(): boolean;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<DOMUpdateConfig>): void;
    /**
     * Process raw mutations and convert to enhanced format
     */
    private processMutations;
    /**
     * Buffer mutations to avoid excessive callback calls
     */
    private bufferMutations;
    /**
     * Determine if a mutation should be processed
     */
    private shouldProcessMutation;
    /**
     * Get current observation target (if available)
     */
    private getCurrentTarget;
}
/**
 * DOM polling observer for environments without MutationObserver
 */
export declare class DOMPollingObserver {
    private intervalId;
    private callback;
    private config;
    private target;
    private lastSnapshot;
    constructor(callback: MutationCallback, config: DOMUpdateConfig);
    /**
     * Start polling for DOM changes
     */
    observe(target: Element): void;
    /**
     * Stop polling for DOM changes
     */
    disconnect(): void;
    /**
     * Check if currently polling
     */
    isActive(): boolean;
    /**
     * Check for DOM changes by comparing snapshots
     */
    private checkForChanges;
    /**
     * Create a snapshot of the DOM structure
     */
    private createSnapshot;
}
/**
 * Universal DOM observer that chooses the best strategy
 */
export declare class UniversalDOMObserver {
    private mutationObserver?;
    private pollingObserver?;
    private callback;
    private config;
    constructor(callback: MutationCallback, config: DOMUpdateConfig);
    /**
     * Start observing DOM changes using the best available method
     */
    observe(target: Element): void;
    /**
     * Stop observing DOM changes
     */
    disconnect(): void;
    /**
     * Check if currently observing
     */
    isActive(): boolean;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<DOMUpdateConfig>): void;
    /**
     * Use MutationObserver strategy
     */
    private useMutationObserver;
    /**
     * Use polling strategy
     */
    private usePollingObserver;
    /**
     * Auto-detect and use the best strategy
     */
    private useAutoStrategy;
}
/**
 * Create mutation observer instance with factory
 */
export declare class MutationObserverFactory {
    /**
     * Create appropriate DOM observer for the environment
     */
    static createObserver(callback: MutationCallback, config: DOMUpdateConfig): UniversalDOMObserver;
    /**
     * Test if MutationObserver is supported
     */
    static isSupported(): boolean;
    /**
     * Get recommended strategy for current environment
     */
    static getRecommendedStrategy(): DOMUpdateConfig['strategy'];
}
/**
 * Global mutation observer factory instance
 */
export declare const mutationObserverFactory: typeof MutationObserverFactory;
//# sourceMappingURL=MutationObserver.d.ts.map