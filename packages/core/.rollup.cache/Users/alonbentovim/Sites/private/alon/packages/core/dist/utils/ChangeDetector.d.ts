/**
 * Change Detector - Reactive data source change detection
 * @description Handles change detection for reactive data sources with various strategies
 */
import type { DataChange, ChangeDetector } from '../types/Results';
/**
 * Change detection options
 */
export interface ChangeDetectionOptions {
    /** Detection strategy */
    strategy: 'shallow' | 'deep' | 'property-watchers' | 'hash-based';
    /** Properties to watch specifically */
    watchedProperties?: string[];
    /** Debounce delay for change notifications */
    debounceMs?: number;
    /** Maximum batch size for change events */
    maxBatchSize?: number;
    /** Enable detailed change tracking */
    trackChanges?: boolean;
}
/**
 * Change detection result
 */
export interface ChangeDetectionResult {
    /** Whether any changes were detected */
    hasChanges: boolean;
    /** Array of detected changes */
    changes: DataChange[];
    /** Previous data hash/snapshot */
    previousHash: string;
    /** Current data hash/snapshot */
    currentHash: string;
    /** Detection time in milliseconds */
    detectionTime: number;
}
/**
 * Change listener function
 */
export type ChangeListener = (result: ChangeDetectionResult) => void;
/**
 * Advanced change detector with multiple detection strategies
 */
export declare class AdvancedChangeDetector implements ChangeDetector {
    lastHash: string;
    strategy: ChangeDetector['strategy'];
    watchedProperties?: string[];
    onChange?: (changes: DataChange[]) => void;
    private previousData;
    private options;
    private listeners;
    private debounceTimeout;
    private pendingChanges;
    private isWatching;
    constructor(options: ChangeDetectionOptions);
    /**
     * Start watching for changes
     */
    startWatching(data: unknown[]): void;
    /**
     * Stop watching for changes
     */
    stopWatching(): void;
    /**
     * Check for changes manually
     */
    checkForChanges(data: unknown[]): ChangeDetectionResult;
    /**
     * Add change listener
     */
    addListener(listener: ChangeListener): void;
    /**
     * Remove change listener
     */
    removeListener(listener: ChangeListener): void;
    /**
     * Update configuration
     */
    updateOptions(options: Partial<ChangeDetectionOptions>): void;
    /**
     * Get detection statistics
     */
    getStats(): {
        isWatching: boolean;
        listenerCount: number;
        pendingChanges: number;
        lastDetectionTime: number;
    };
    /**
     * Detect changes between two data arrays
     */
    private detectChanges;
    /**
     * Detect shallow changes (reference equality)
     */
    private detectShallowChanges;
    /**
     * Detect deep changes (property-by-property comparison)
     */
    private detectDeepChanges;
    /**
     * Get changes from property watchers
     */
    private getWatcherChanges;
    /**
     * Detect changes using hash comparison
     */
    private detectHashBasedChanges;
    /**
     * Compare two objects for property changes
     */
    private compareObjects;
    /**
     * Set up property watchers (simplified implementation)
     */
    private setupPropertyWatchers;
    /**
     * Tear down property watchers
     */
    private teardownPropertyWatchers;
    /**
     * Compute hash for data array
     */
    private computeHash;
    /**
     * Hash a single value
     */
    private hashValue;
    /**
     * Simple hash function
     */
    private simpleHash;
    /**
     * Deep clone data
     */
    private cloneData;
    /**
     * Check if value is an object
     */
    private isObject;
    /**
     * Deep equality check
     */
    private deepEqual;
    /**
     * Notify listeners of changes
     */
    private notifyListeners;
    /**
     * Handle debounced change notifications
     */
    private handleDebouncedChanges;
    /**
     * Flush pending changes
     */
    private flushPendingChanges;
    /**
     * Clear pending changes
     */
    private clearPendingChanges;
}
/**
 * Reactive data source wrapper
 */
export declare class ReactiveDataSource {
    private data;
    private changeDetector;
    private listeners;
    constructor(initialData: unknown[], options: ChangeDetectionOptions);
    /**
     * Get current data
     */
    getData(): unknown[];
    /**
     * Update data
     */
    setData(newData: unknown[]): void;
    /**
     * Add item
     */
    addItem(item: unknown): void;
    /**
     * Update item
     */
    updateItem(index: number, item: unknown): void;
    /**
     * Remove item
     */
    removeItem(index: number): void;
    /**
     * Add data change listener
     */
    addDataListener(listener: (data: unknown[]) => void): void;
    /**
     * Remove data change listener
     */
    removeDataListener(listener: (data: unknown[]) => void): void;
    /**
     * Destroy reactive data source
     */
    destroy(): void;
    /**
     * Notify data listeners
     */
    private notifyDataListeners;
}
/**
 * Change detector factory
 */
export declare class ChangeDetectorFactory {
    private static instances;
    /**
     * Create change detector
     */
    static createDetector(options: ChangeDetectionOptions): AdvancedChangeDetector;
    /**
     * Get or create named detector
     */
    static getDetector(name: string, options: ChangeDetectionOptions): AdvancedChangeDetector;
    /**
     * Create reactive data source
     */
    static createReactiveSource(data: unknown[], options: ChangeDetectionOptions): ReactiveDataSource;
    /**
     * Clear detector
     */
    static clearDetector(name: string): void;
    /**
     * Clear all detectors
     */
    static clearAllDetectors(): void;
}
/**
 * Global change detector factory instance
 */
export declare const changeDetectorFactory: typeof ChangeDetectorFactory;
//# sourceMappingURL=ChangeDetector.d.ts.map