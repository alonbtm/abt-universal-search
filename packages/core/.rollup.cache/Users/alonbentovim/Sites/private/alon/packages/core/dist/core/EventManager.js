/**
 * Event Manager - Comprehensive event management system
 * @description Provides search lifecycle events, subscription management, and event handling
 */
/**
 * Advanced event manager with comprehensive lifecycle management
 */
export class AdvancedEventManager {
    constructor(options = {}) {
        this.listeners = new Map();
        this.wildcardListeners = [];
        this.eventHistory = [];
        this.statistics = this.initializeStatistics();
        this.isEnabled = true;
        this.maxHistorySize = 1000;
        this.defaultTimeout = 5000; // 5 seconds
        this.debugMode = false;
        this.maxHistorySize = options.maxHistorySize || 1000;
        this.defaultTimeout = options.defaultTimeout || 5000;
        this.debugMode = options.debugMode || false;
    }
    /**
     * Subscribe to an event
     */
    subscribe(event, listener, options = {}) {
        if (!this.isEnabled) {
            throw new Error('EventManager is disabled');
        }
        const subscription = {
            event,
            listener: listener,
            options: {
                once: false,
                priority: 0,
                passive: false,
                timeout: this.defaultTimeout,
                ...options
            },
            id: this.generateSubscriptionId(),
            created: Date.now(),
            executionCount: 0
        };
        if (event === '*') {
            this.wildcardListeners.push(subscription);
            this.wildcardListeners.sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));
        }
        else {
            if (!this.listeners.has(event)) {
                this.listeners.set(event, []);
            }
            this.listeners.get(event).push(subscription);
            // Sort by priority (higher priority first)
            this.listeners.get(event).sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));
        }
        if (this.debugMode) {
            console.log(`[EventManager] Subscribed to event '${event}' with ID: ${subscription.id}`);
        }
        return subscription.id;
    }
    /**
     * Subscribe to multiple events at once
     */
    subscribeMultiple(events, listener, options = {}) {
        return events.map(event => this.subscribe(event, listener, options));
    }
    /**
     * Unsubscribe from an event by subscription ID
     */
    unsubscribe(subscriptionId) {
        // Check wildcard listeners
        const wildcardIndex = this.wildcardListeners.findIndex(s => s.id === subscriptionId);
        if (wildcardIndex !== -1) {
            this.wildcardListeners.splice(wildcardIndex, 1);
            if (this.debugMode) {
                console.log(`[EventManager] Unsubscribed wildcard listener: ${subscriptionId}`);
            }
            return true;
        }
        // Check specific event listeners
        for (const [event, subscriptions] of this.listeners.entries()) {
            const index = subscriptions.findIndex(s => s.id === subscriptionId);
            if (index !== -1) {
                subscriptions.splice(index, 1);
                if (subscriptions.length === 0) {
                    this.listeners.delete(event);
                }
                if (this.debugMode) {
                    console.log(`[EventManager] Unsubscribed from event '${event}': ${subscriptionId}`);
                }
                return true;
            }
        }
        return false;
    }
    /**
     * Unsubscribe all listeners for a specific event
     */
    unsubscribeAll(event) {
        const count = this.listeners.get(event)?.length || 0;
        this.listeners.delete(event);
        if (this.debugMode) {
            console.log(`[EventManager] Unsubscribed all listeners for event '${event}': ${count} listeners`);
        }
        return count;
    }
    /**
     * Unsubscribe all listeners in a group
     */
    unsubscribeGroup(group) {
        let count = 0;
        // Remove from wildcard listeners
        this.wildcardListeners = this.wildcardListeners.filter(s => {
            if (s.options.group === group) {
                count++;
                return false;
            }
            return true;
        });
        // Remove from specific event listeners
        for (const [event, subscriptions] of this.listeners.entries()) {
            const originalLength = subscriptions.length;
            this.listeners.set(event, subscriptions.filter(s => {
                if (s.options.group === group) {
                    count++;
                    return false;
                }
                return true;
            }));
            if (this.listeners.get(event).length === 0) {
                this.listeners.delete(event);
            }
        }
        if (this.debugMode) {
            console.log(`[EventManager] Unsubscribed group '${group}': ${count} listeners`);
        }
        return count;
    }
    /**
     * Emit an event to all subscribers
     */
    async emit(event, data, metadata) {
        if (!this.isEnabled) {
            return this.createEmptyBatchResult(event, data, metadata);
        }
        const startTime = performance.now();
        const eventData = {
            type: event,
            timestamp: Date.now(),
            data: data,
            metadata
        };
        // Create propagation control
        let propagationStopped = false;
        let defaultPrevented = false;
        const propagation = {
            stopPropagation: () => { propagationStopped = true; },
            preventDefault: () => { defaultPrevented = true; },
            isPropagationStopped: () => propagationStopped,
            isDefaultPrevented: () => defaultPrevented
        };
        const controllableEventData = {
            ...eventData,
            propagation
        };
        // Add to history
        this.addToHistory(eventData);
        // Update statistics
        this.statistics.totalEventsEmitted++;
        this.statistics.eventCounts[event] = (this.statistics.eventCounts[event] || 0) + 1;
        const results = [];
        // Get listeners outside try block so they're in scope for statistics
        const specificListeners = this.listeners.get(event) || [];
        try {
            // Execute specific event listeners
            for (const subscription of specificListeners) {
                if (propagationStopped)
                    break;
                const result = await this.executeListener(subscription, controllableEventData);
                results.push(result);
                if (subscription.options.once) {
                    this.unsubscribe(subscription.id);
                }
            }
            // Execute wildcard listeners if propagation not stopped
            if (!propagationStopped) {
                for (const subscription of this.wildcardListeners) {
                    if (propagationStopped)
                        break;
                    const result = await this.executeListener(subscription, controllableEventData);
                    results.push(result);
                    if (subscription.options.once) {
                        this.unsubscribe(subscription.id);
                    }
                }
            }
        }
        catch (error) {
            if (this.debugMode) {
                console.error(`[EventManager] Error during event emission for '${event}':`, error);
            }
        }
        const totalTime = performance.now() - startTime;
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;
        // Update statistics
        this.statistics.totalListenersExecuted += results.length;
        this.statistics.totalExecutionTime += totalTime;
        this.statistics.averageExecutionTime = this.statistics.totalExecutionTime / this.statistics.totalEventsEmitted;
        this.statistics.listenerCounts[event] = specificListeners.length + this.wildcardListeners.length;
        this.statistics.errorCounts[event] = failureCount;
        const batchResult = {
            event,
            eventData,
            results,
            totalTime,
            successCount,
            failureCount,
            defaultPrevented,
            propagationStopped
        };
        if (this.debugMode) {
            console.log(`[EventManager] Emitted event '${event}':`, {
                listeners: results.length,
                successful: successCount,
                failed: failureCount,
                time: totalTime.toFixed(2) + 'ms',
                defaultPrevented,
                propagationStopped
            });
        }
        return batchResult;
    }
    /**
     * Emit event synchronously (for simple, non-async listeners)
     */
    emitSync(event, data, metadata) {
        const startTime = performance.now();
        const eventData = {
            type: event,
            timestamp: Date.now(),
            data: data,
            metadata
        };
        let propagationStopped = false;
        let defaultPrevented = false;
        const propagation = {
            stopPropagation: () => { propagationStopped = true; },
            preventDefault: () => { defaultPrevented = true; },
            isPropagationStopped: () => propagationStopped,
            isDefaultPrevented: () => defaultPrevented
        };
        const controllableEventData = {
            ...eventData,
            propagation
        };
        this.addToHistory(eventData);
        this.statistics.totalEventsEmitted++;
        this.statistics.eventCounts[event] = (this.statistics.eventCounts[event] || 0) + 1;
        const results = [];
        const specificListeners = this.listeners.get(event) || [];
        // Execute specific listeners
        for (const subscription of specificListeners) {
            if (propagationStopped)
                break;
            const result = this.executeListenerSync(subscription, controllableEventData);
            results.push(result);
        }
        // Execute wildcard listeners
        if (!propagationStopped) {
            for (const subscription of this.wildcardListeners) {
                if (propagationStopped)
                    break;
                const result = this.executeListenerSync(subscription, controllableEventData);
                results.push(result);
            }
        }
        const totalTime = performance.now() - startTime;
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;
        return {
            event,
            eventData,
            results,
            totalTime,
            successCount,
            failureCount,
            defaultPrevented,
            propagationStopped
        };
    }
    /**
     * Check if there are listeners for a specific event
     */
    hasListeners(event) {
        return (this.listeners.get(event)?.length || 0) > 0 || this.wildcardListeners.length > 0;
    }
    /**
     * Get count of listeners for a specific event
     */
    getListenerCount(event) {
        return (this.listeners.get(event)?.length || 0) + this.wildcardListeners.length;
    }
    /**
     * Get all active subscriptions
     */
    getActiveSubscriptions() {
        const subscriptions = [];
        for (const eventSubscriptions of this.listeners.values()) {
            subscriptions.push(...eventSubscriptions);
        }
        subscriptions.push(...this.wildcardListeners);
        return subscriptions;
    }
    /**
     * Get subscriptions for a specific event
     */
    getEventSubscriptions(event) {
        return [...(this.listeners.get(event) || []), ...this.wildcardListeners];
    }
    /**
     * Get event statistics
     */
    getStatistics() {
        // Update dynamic statistics
        const mostActiveEvents = Object.entries(this.statistics.eventCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([event, count]) => ({ event, count }));
        const slowestEvents = [];
        const fastestEvents = [];
        const errorProne = [];
        // Calculate performance metrics
        for (const [event, count] of Object.entries(this.statistics.eventCounts)) {
            const errorCount = this.statistics.errorCounts[event] || 0;
            const errorRate = count > 0 ? errorCount / count : 0;
            if (errorRate > 0.1) { // More than 10% error rate
                errorProne.push({ event, errorRate });
            }
        }
        return {
            ...this.statistics,
            mostActiveEvents,
            performance: {
                slowestEvents,
                fastestEvents,
                errorProne: errorProne.sort((a, b) => b.errorRate - a.errorRate).slice(0, 5)
            }
        };
    }
    /**
     * Clear event history
     */
    clearHistory() {
        this.eventHistory = [];
    }
    /**
     * Get event history
     */
    getHistory(limit) {
        return limit ? this.eventHistory.slice(-limit) : [...this.eventHistory];
    }
    /**
     * Enable or disable the event manager
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        if (this.debugMode) {
            console.log(`[EventManager] ${enabled ? 'Enabled' : 'Disabled'}`);
        }
    }
    /**
     * Clear all listeners and reset state
     */
    clear() {
        const listenerCount = this.getActiveSubscriptions().length;
        this.listeners.clear();
        this.wildcardListeners = [];
        this.eventHistory = [];
        this.statistics = this.initializeStatistics();
        if (this.debugMode) {
            console.log(`[EventManager] Cleared ${listenerCount} listeners and reset state`);
        }
    }
    /**
     * Execute a listener with error handling and timeout
     */
    async executeListener(subscription, eventData) {
        const startTime = performance.now();
        try {
            subscription.executionCount++;
            subscription.lastExecuted = Date.now();
            const timeout = subscription.options.timeout || this.defaultTimeout;
            // Create timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error(`Listener timeout after ${timeout}ms`)), timeout);
            });
            // Execute listener with timeout
            const listenerPromise = Promise.resolve(subscription.listener(eventData));
            const result = await Promise.race([listenerPromise, timeoutPromise]);
            return {
                subscription,
                success: true,
                executionTime: performance.now() - startTime,
                result
            };
        }
        catch (error) {
            return {
                subscription,
                success: false,
                executionTime: performance.now() - startTime,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }
    /**
     * Execute a listener synchronously
     */
    executeListenerSync(subscription, eventData) {
        const startTime = performance.now();
        try {
            subscription.executionCount++;
            subscription.lastExecuted = Date.now();
            const result = subscription.listener(eventData);
            return {
                subscription,
                success: true,
                executionTime: performance.now() - startTime,
                result
            };
        }
        catch (error) {
            return {
                subscription,
                success: false,
                executionTime: performance.now() - startTime,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }
    /**
     * Add event to history
     */
    addToHistory(eventData) {
        this.eventHistory.push(eventData);
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
        }
    }
    /**
     * Generate unique subscription ID
     */
    generateSubscriptionId() {
        return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Initialize statistics object
     */
    initializeStatistics() {
        return {
            totalEventsEmitted: 0,
            totalListenersExecuted: 0,
            totalExecutionTime: 0,
            averageExecutionTime: 0,
            eventCounts: {},
            listenerCounts: {},
            errorCounts: {},
            mostActiveEvents: [],
            performance: {
                slowestEvents: [],
                fastestEvents: [],
                errorProne: []
            }
        };
    }
    /**
     * Create empty batch result for disabled state
     */
    createEmptyBatchResult(event, data, metadata) {
        return {
            event,
            eventData: {
                type: event,
                timestamp: Date.now(),
                data: data,
                metadata
            },
            results: [],
            totalTime: 0,
            successCount: 0,
            failureCount: 0,
            defaultPrevented: false,
            propagationStopped: false
        };
    }
}
/**
 * Global event manager instance
 */
export const eventManager = new AdvancedEventManager({
    debugMode: process.env.NODE_ENV === 'development'
});
//# sourceMappingURL=EventManager.js.map