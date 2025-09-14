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
export class AdvancedChangeDetector implements ChangeDetector {
  public lastHash: string = '';
  public strategy: ChangeDetector['strategy'];
  public watchedProperties?: string[];
  public onChange?: (changes: DataChange[]) => void;

  private previousData: unknown[] = [];
  private options: ChangeDetectionOptions;
  private listeners = new Set<ChangeListener>();
  private debounceTimeout: number | null = null;
  private pendingChanges: DataChange[] = [];
  private isWatching = false;

  constructor(options: ChangeDetectionOptions) {
    this.strategy = options.strategy;
    this.watchedProperties = options.watchedProperties;
    this.options = options;
  }

  /**
   * Start watching for changes
   */
  public startWatching(data: unknown[]): void {
    if (this.isWatching) {
      return;
    }

    this.previousData = this.cloneData(data);
    this.lastHash = this.computeHash(data);
    this.isWatching = true;

    // Set up property watchers if using that strategy
    if (this.strategy === 'property-watchers') {
      this.setupPropertyWatchers(data);
    }
  }

  /**
   * Stop watching for changes
   */
  public stopWatching(): void {
    if (!this.isWatching) {
      return;
    }

    this.isWatching = false;
    this.previousData = [];
    this.lastHash = '';
    this.clearPendingChanges();

    if (this.strategy === 'property-watchers') {
      this.teardownPropertyWatchers();
    }
  }

  /**
   * Check for changes manually
   */
  public checkForChanges(data: unknown[]): ChangeDetectionResult {
    const startTime = performance.now();
    const previousHash = this.lastHash;
    const currentHash = this.computeHash(data);
    
    const result: ChangeDetectionResult = {
      hasChanges: false,
      changes: [],
      previousHash,
      currentHash,
      detectionTime: 0
    };

    if (currentHash !== previousHash) {
      result.hasChanges = true;
      result.changes = this.detectChanges(this.previousData, data);
      
      // Update internal state
      this.previousData = this.cloneData(data);
      this.lastHash = currentHash;
    }

    result.detectionTime = performance.now() - startTime;
    return result;
  }

  /**
   * Add change listener
   */
  public addListener(listener: ChangeListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove change listener
   */
  public removeListener(listener: ChangeListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Update configuration
   */
  public updateOptions(options: Partial<ChangeDetectionOptions>): void {
    const wasWatching = this.isWatching;
    const previousData = this.previousData;

    if (wasWatching) {
      this.stopWatching();
    }

    this.options = { ...this.options, ...options };
    this.strategy = this.options.strategy;
    this.watchedProperties = this.options.watchedProperties;

    if (wasWatching) {
      this.startWatching(previousData);
    }
  }

  /**
   * Get detection statistics
   */
  public getStats(): {
    isWatching: boolean;
    listenerCount: number;
    pendingChanges: number;
    lastDetectionTime: number;
  } {
    return {
      isWatching: this.isWatching,
      listenerCount: this.listeners.size,
      pendingChanges: this.pendingChanges.length,
      lastDetectionTime: 0 // Would track in real implementation
    };
  }

  /**
   * Detect changes between two data arrays
   */
  private detectChanges(oldData: unknown[], newData: unknown[]): DataChange[] {
    switch (this.strategy) {
      case 'shallow':
        return this.detectShallowChanges(oldData, newData);
      case 'deep':
        return this.detectDeepChanges(oldData, newData);
      case 'property-watchers':
        return this.getWatcherChanges(oldData, newData);
      case 'hash-based':
        return this.detectHashBasedChanges(oldData, newData);
      default:
        return this.detectShallowChanges(oldData, newData);
    }
  }

  /**
   * Detect shallow changes (reference equality)
   */
  private detectShallowChanges(oldData: unknown[], newData: unknown[]): DataChange[] {
    const changes: DataChange[] = [];
    const maxLength = Math.max(oldData.length, newData.length);

    for (let i = 0; i < maxLength; i++) {
      const oldItem = oldData[i];
      const newItem = newData[i];

      if (i >= oldData.length) {
        // New item added
        changes.push({
          type: 'add',
          index: i,
          newValue: newItem
        });
      } else if (i >= newData.length) {
        // Item deleted
        changes.push({
          type: 'delete',
          index: i,
          oldValue: oldItem
        });
      } else if (oldItem !== newItem) {
        // Item updated
        changes.push({
          type: 'update',
          index: i,
          oldValue: oldItem,
          newValue: newItem
        });
      }
    }

    return changes;
  }

  /**
   * Detect deep changes (property-by-property comparison)
   */
  private detectDeepChanges(oldData: unknown[], newData: unknown[]): DataChange[] {
    const changes: DataChange[] = [];
    const maxLength = Math.max(oldData.length, newData.length);

    for (let i = 0; i < maxLength; i++) {
      const oldItem = oldData[i];
      const newItem = newData[i];

      if (i >= oldData.length) {
        changes.push({
          type: 'add',
          index: i,
          newValue: newItem
        });
      } else if (i >= newData.length) {
        changes.push({
          type: 'delete',
          index: i,
          oldValue: oldItem
        });
      } else {
        const itemChanges = this.compareObjects(oldItem, newItem);
        if (itemChanges.length > 0) {
          changes.push({
            type: 'update',
            index: i,
            oldValue: oldItem,
            newValue: newItem,
            changedFields: itemChanges
          });
        }
      }
    }

    return changes;
  }

  /**
   * Get changes from property watchers
   */
  private getWatcherChanges(oldData: unknown[], newData: unknown[]): DataChange[] {
    // In a real implementation, this would return changes detected by property watchers
    // For now, fall back to shallow detection
    return this.detectShallowChanges(oldData, newData);
  }

  /**
   * Detect changes using hash comparison
   */
  private detectHashBasedChanges(oldData: unknown[], newData: unknown[]): DataChange[] {
    const changes: DataChange[] = [];
    const maxLength = Math.max(oldData.length, newData.length);

    for (let i = 0; i < maxLength; i++) {
      const oldItem = oldData[i];
      const newItem = newData[i];
      
      const oldHash = this.hashValue(oldItem);
      const newHash = this.hashValue(newItem);

      if (i >= oldData.length) {
        changes.push({
          type: 'add',
          index: i,
          newValue: newItem
        });
      } else if (i >= newData.length) {
        changes.push({
          type: 'delete',
          index: i,
          oldValue: oldItem
        });
      } else if (oldHash !== newHash) {
        changes.push({
          type: 'update',
          index: i,
          oldValue: oldItem,
          newValue: newItem
        });
      }
    }

    return changes;
  }

  /**
   * Compare two objects for property changes
   */
  private compareObjects(oldObj: unknown, newObj: unknown): string[] {
    if (!this.isObject(oldObj) || !this.isObject(newObj)) {
      return oldObj !== newObj ? ['value'] : [];
    }

    const oldObject = oldObj as Record<string, unknown>;
    const newObject = newObj as Record<string, unknown>;
    const changedFields: string[] = [];

    // Check properties to watch specifically
    const propsToCheck = this.watchedProperties || 
                        [...new Set([...Object.keys(oldObject), ...Object.keys(newObject)])];

    for (const prop of propsToCheck) {
      const oldValue = oldObject[prop];
      const newValue = newObject[prop];

      if (!this.deepEqual(oldValue, newValue)) {
        changedFields.push(prop);
      }
    }

    return changedFields;
  }

  /**
   * Set up property watchers (simplified implementation)
   */
  private setupPropertyWatchers(data: unknown[]): void {
    // In a real implementation, this would set up Proxy objects or other mechanisms
    // to watch for property changes in real-time
    console.log('Property watchers would be set up here for', data.length, 'items');
  }

  /**
   * Tear down property watchers
   */
  private teardownPropertyWatchers(): void {
    // Clean up any property watchers
    console.log('Property watchers would be torn down here');
  }

  /**
   * Compute hash for data array
   */
  private computeHash(data: unknown[]): string {
    return this.hashValue(data);
  }

  /**
   * Hash a single value
   */
  private hashValue(value: unknown): string {
    try {
      return this.simpleHash(JSON.stringify(value));
    } catch {
      return this.simpleHash(String(value));
    }
  }

  /**
   * Simple hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Deep clone data
   */
  private cloneData(data: unknown[]): unknown[] {
    try {
      return JSON.parse(JSON.stringify(data));
    } catch {
      return [...data]; // Shallow clone as fallback
    }
  }

  /**
   * Check if value is an object
   */
  private isObject(value: unknown): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Deep equality check
   */
  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    
    if (a == null || b == null) return a === b;
    
    if (typeof a !== typeof b) return false;
    
    if (typeof a === 'object') {
      try {
        return JSON.stringify(a) === JSON.stringify(b);
      } catch {
        return false;
      }
    }
    
    return false;
  }

  /**
   * Notify listeners of changes
   */
  private notifyListeners(result: ChangeDetectionResult): void {
    for (const listener of this.listeners) {
      try {
        listener(result);
      } catch (error) {
        console.error('Error in change listener:', error);
      }
    }
  }

  /**
   * Handle debounced change notifications
   */
  private handleDebouncedChanges(changes: DataChange[]): void {
    this.pendingChanges.push(...changes);

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    const debounceMs = this.options.debounceMs || 100;
    this.debounceTimeout = window.setTimeout(() => {
      this.flushPendingChanges();
    }, debounceMs);
  }

  /**
   * Flush pending changes
   */
  private flushPendingChanges(): void {
    if (this.pendingChanges.length === 0) {
      return;
    }

    const changes = [...this.pendingChanges];
    this.clearPendingChanges();

    const result: ChangeDetectionResult = {
      hasChanges: true,
      changes,
      previousHash: this.lastHash,
      currentHash: this.computeHash([]), // Would need current data
      detectionTime: 0
    };

    this.notifyListeners(result);

    if (this.onChange) {
      this.onChange(changes);
    }
  }

  /**
   * Clear pending changes
   */
  private clearPendingChanges(): void {
    this.pendingChanges = [];
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
  }
}

/**
 * Reactive data source wrapper
 */
export class ReactiveDataSource {
  private data: unknown[] = [];
  private changeDetector: AdvancedChangeDetector;
  private listeners = new Set<(data: unknown[]) => void>();

  constructor(initialData: unknown[], options: ChangeDetectionOptions) {
    this.data = [...initialData];
    this.changeDetector = new AdvancedChangeDetector(options);
    
    this.changeDetector.addListener((result) => {
      this.notifyDataListeners();
    });

    this.changeDetector.startWatching(this.data);
  }

  /**
   * Get current data
   */
  public getData(): unknown[] {
    return [...this.data];
  }

  /**
   * Update data
   */
  public setData(newData: unknown[]): void {
    this.data = [...newData];
    this.changeDetector.checkForChanges(this.data);
  }

  /**
   * Add item
   */
  public addItem(item: unknown): void {
    this.data.push(item);
    this.changeDetector.checkForChanges(this.data);
  }

  /**
   * Update item
   */
  public updateItem(index: number, item: unknown): void {
    if (index >= 0 && index < this.data.length) {
      this.data[index] = item;
      this.changeDetector.checkForChanges(this.data);
    }
  }

  /**
   * Remove item
   */
  public removeItem(index: number): void {
    if (index >= 0 && index < this.data.length) {
      this.data.splice(index, 1);
      this.changeDetector.checkForChanges(this.data);
    }
  }

  /**
   * Add data change listener
   */
  public addDataListener(listener: (data: unknown[]) => void): void {
    this.listeners.add(listener);
  }

  /**
   * Remove data change listener
   */
  public removeDataListener(listener: (data: unknown[]) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Destroy reactive data source
   */
  public destroy(): void {
    this.changeDetector.stopWatching();
    this.listeners.clear();
  }

  /**
   * Notify data listeners
   */
  private notifyDataListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.getData());
      } catch (error) {
        console.error('Error in data listener:', error);
      }
    }
  }
}

/**
 * Change detector factory
 */
export class ChangeDetectorFactory {
  private static instances = new Map<string, AdvancedChangeDetector>();

  /**
   * Create change detector
   */
  public static createDetector(options: ChangeDetectionOptions): AdvancedChangeDetector {
    return new AdvancedChangeDetector(options);
  }

  /**
   * Get or create named detector
   */
  public static getDetector(name: string, options: ChangeDetectionOptions): AdvancedChangeDetector {
    if (!this.instances.has(name)) {
      this.instances.set(name, new AdvancedChangeDetector(options));
    }
    return this.instances.get(name)!;
  }

  /**
   * Create reactive data source
   */
  public static createReactiveSource(
    data: unknown[],
    options: ChangeDetectionOptions
  ): ReactiveDataSource {
    return new ReactiveDataSource(data, options);
  }

  /**
   * Clear detector
   */
  public static clearDetector(name: string): void {
    const detector = this.instances.get(name);
    if (detector) {
      detector.stopWatching();
      this.instances.delete(name);
    }
  }

  /**
   * Clear all detectors
   */
  public static clearAllDetectors(): void {
    for (const detector of this.instances.values()) {
      detector.stopWatching();
    }
    this.instances.clear();
  }
}

/**
 * Global change detector factory instance
 */
export const changeDetectorFactory = ChangeDetectorFactory;