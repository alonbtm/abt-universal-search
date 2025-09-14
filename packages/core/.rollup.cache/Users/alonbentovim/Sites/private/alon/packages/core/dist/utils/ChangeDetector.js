/**
 * Change Detector - Reactive data source change detection
 * @description Handles change detection for reactive data sources with various strategies
 */
/**
 * Advanced change detector with multiple detection strategies
 */
export class AdvancedChangeDetector {
    constructor(options) {
        this.lastHash = '';
        this.previousData = [];
        this.listeners = new Set();
        this.debounceTimeout = null;
        this.pendingChanges = [];
        this.isWatching = false;
        this.strategy = options.strategy;
        this.watchedProperties = options.watchedProperties;
        this.options = options;
    }
    /**
     * Start watching for changes
     */
    startWatching(data) {
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
    stopWatching() {
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
    checkForChanges(data) {
        const startTime = performance.now();
        const previousHash = this.lastHash;
        const currentHash = this.computeHash(data);
        const result = {
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
    addListener(listener) {
        this.listeners.add(listener);
    }
    /**
     * Remove change listener
     */
    removeListener(listener) {
        this.listeners.delete(listener);
    }
    /**
     * Update configuration
     */
    updateOptions(options) {
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
    getStats() {
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
    detectChanges(oldData, newData) {
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
    detectShallowChanges(oldData, newData) {
        const changes = [];
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
            }
            else if (i >= newData.length) {
                // Item deleted
                changes.push({
                    type: 'delete',
                    index: i,
                    oldValue: oldItem
                });
            }
            else if (oldItem !== newItem) {
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
    detectDeepChanges(oldData, newData) {
        const changes = [];
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
            }
            else if (i >= newData.length) {
                changes.push({
                    type: 'delete',
                    index: i,
                    oldValue: oldItem
                });
            }
            else {
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
    getWatcherChanges(oldData, newData) {
        // In a real implementation, this would return changes detected by property watchers
        // For now, fall back to shallow detection
        return this.detectShallowChanges(oldData, newData);
    }
    /**
     * Detect changes using hash comparison
     */
    detectHashBasedChanges(oldData, newData) {
        const changes = [];
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
            }
            else if (i >= newData.length) {
                changes.push({
                    type: 'delete',
                    index: i,
                    oldValue: oldItem
                });
            }
            else if (oldHash !== newHash) {
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
    compareObjects(oldObj, newObj) {
        if (!this.isObject(oldObj) || !this.isObject(newObj)) {
            return oldObj !== newObj ? ['value'] : [];
        }
        const oldObject = oldObj;
        const newObject = newObj;
        const changedFields = [];
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
    setupPropertyWatchers(data) {
        // In a real implementation, this would set up Proxy objects or other mechanisms
        // to watch for property changes in real-time
        console.log('Property watchers would be set up here for', data.length, 'items');
    }
    /**
     * Tear down property watchers
     */
    teardownPropertyWatchers() {
        // Clean up any property watchers
        console.log('Property watchers would be torn down here');
    }
    /**
     * Compute hash for data array
     */
    computeHash(data) {
        return this.hashValue(data);
    }
    /**
     * Hash a single value
     */
    hashValue(value) {
        try {
            return this.simpleHash(JSON.stringify(value));
        }
        catch {
            return this.simpleHash(String(value));
        }
    }
    /**
     * Simple hash function
     */
    simpleHash(str) {
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
    cloneData(data) {
        try {
            return JSON.parse(JSON.stringify(data));
        }
        catch {
            return [...data]; // Shallow clone as fallback
        }
    }
    /**
     * Check if value is an object
     */
    isObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }
    /**
     * Deep equality check
     */
    deepEqual(a, b) {
        if (a === b)
            return true;
        if (a == null || b == null)
            return a === b;
        if (typeof a !== typeof b)
            return false;
        if (typeof a === 'object') {
            try {
                return JSON.stringify(a) === JSON.stringify(b);
            }
            catch {
                return false;
            }
        }
        return false;
    }
    /**
     * Notify listeners of changes
     */
    notifyListeners(result) {
        for (const listener of this.listeners) {
            try {
                listener(result);
            }
            catch (error) {
                console.error('Error in change listener:', error);
            }
        }
    }
    /**
     * Handle debounced change notifications
     */
    handleDebouncedChanges(changes) {
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
    flushPendingChanges() {
        if (this.pendingChanges.length === 0) {
            return;
        }
        const changes = [...this.pendingChanges];
        this.clearPendingChanges();
        const result = {
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
    clearPendingChanges() {
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
    constructor(initialData, options) {
        this.data = [];
        this.listeners = new Set();
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
    getData() {
        return [...this.data];
    }
    /**
     * Update data
     */
    setData(newData) {
        this.data = [...newData];
        this.changeDetector.checkForChanges(this.data);
    }
    /**
     * Add item
     */
    addItem(item) {
        this.data.push(item);
        this.changeDetector.checkForChanges(this.data);
    }
    /**
     * Update item
     */
    updateItem(index, item) {
        if (index >= 0 && index < this.data.length) {
            this.data[index] = item;
            this.changeDetector.checkForChanges(this.data);
        }
    }
    /**
     * Remove item
     */
    removeItem(index) {
        if (index >= 0 && index < this.data.length) {
            this.data.splice(index, 1);
            this.changeDetector.checkForChanges(this.data);
        }
    }
    /**
     * Add data change listener
     */
    addDataListener(listener) {
        this.listeners.add(listener);
    }
    /**
     * Remove data change listener
     */
    removeDataListener(listener) {
        this.listeners.delete(listener);
    }
    /**
     * Destroy reactive data source
     */
    destroy() {
        this.changeDetector.stopWatching();
        this.listeners.clear();
    }
    /**
     * Notify data listeners
     */
    notifyDataListeners() {
        for (const listener of this.listeners) {
            try {
                listener(this.getData());
            }
            catch (error) {
                console.error('Error in data listener:', error);
            }
        }
    }
}
/**
 * Change detector factory
 */
export class ChangeDetectorFactory {
    /**
     * Create change detector
     */
    static createDetector(options) {
        return new AdvancedChangeDetector(options);
    }
    /**
     * Get or create named detector
     */
    static getDetector(name, options) {
        if (!this.instances.has(name)) {
            this.instances.set(name, new AdvancedChangeDetector(options));
        }
        return this.instances.get(name);
    }
    /**
     * Create reactive data source
     */
    static createReactiveSource(data, options) {
        return new ReactiveDataSource(data, options);
    }
    /**
     * Clear detector
     */
    static clearDetector(name) {
        const detector = this.instances.get(name);
        if (detector) {
            detector.stopWatching();
            this.instances.delete(name);
        }
    }
    /**
     * Clear all detectors
     */
    static clearAllDetectors() {
        for (const detector of this.instances.values()) {
            detector.stopWatching();
        }
        this.instances.clear();
    }
}
ChangeDetectorFactory.instances = new Map();
/**
 * Global change detector factory instance
 */
export const changeDetectorFactory = ChangeDetectorFactory;
//# sourceMappingURL=ChangeDetector.js.map