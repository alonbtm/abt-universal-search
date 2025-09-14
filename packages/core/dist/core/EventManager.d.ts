/**
 * Event Manager - Comprehensive event management system
 * @description Provides search lifecycle events, subscription management, and event handling
 */
/**
 * Event data for search lifecycle events
 */
export interface EventData {
    /** Event type */
    type: string;
    /** Event timestamp */
    timestamp: number;
    /** Event payload data */
    data?: Record<string, unknown>;
    /** Event source information */
    source?: {
        component: string;
        method?: string;
        id?: string;
    };
    /** Event metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Search lifecycle event types
 */
export type SearchEventType = 'search:start' | 'search:complete' | 'search:error' | 'search:select' | 'query:change' | 'results:updated' | 'connection:established' | 'connection:lost' | 'transformation:complete' | 'validation:failed' | 'performance:warning' | 'action:prevented' | 'cleanup:completed';
/**
 * Event listener function type
 */
export type EventListener<T = unknown> = (eventData: EventData & {
    data: T;
}) => void | Promise<void>;
/**
 * Event listener options
 */
export interface EventListenerOptions {
    /** Execute listener only once */
    once?: boolean;
    /** Listener priority (higher executes first) */
    priority?: number;
    /** Passive listener (cannot prevent default) */
    passive?: boolean;
    /** Listener group for batch operations */
    group?: string;
    /** Maximum execution time before timeout */
    timeout?: number;
}
/**
 * Event subscription information
 */
export interface EventSubscription {
    /** Event type */
    event: string;
    /** Listener function */
    listener: EventListener;
    /** Listener options */
    options: EventListenerOptions;
    /** Subscription ID */
    id: string;
    /** Creation timestamp */
    created: number;
    /** Execution count */
    executionCount: number;
    /** Last execution time */
    lastExecuted?: number;
}
/**
 * Event propagation control
 */
export interface EventPropagation {
    /** Stop event propagation to other listeners */
    stopPropagation: () => void;
    /** Prevent default action */
    preventDefault: () => void;
    /** Check if propagation was stopped */
    isPropagationStopped: () => boolean;
    /** Check if default was prevented */
    isDefaultPrevented: () => boolean;
}
/**
 * Enhanced event data with propagation control
 */
export interface ControllableEventData extends EventData {
    /** Propagation control */
    propagation: EventPropagation;
}
/**
 * Event execution result
 */
export interface EventExecutionResult {
    /** Listener that was executed */
    subscription: EventSubscription;
    /** Execution success */
    success: boolean;
    /** Execution time in milliseconds */
    executionTime: number;
    /** Error if execution failed */
    error?: Error;
    /** Result data if any */
    result?: unknown;
}
/**
 * Event batch execution result
 */
export interface EventBatchResult {
    /** Event that was emitted */
    event: string;
    /** Event data */
    eventData: EventData;
    /** Individual execution results */
    results: EventExecutionResult[];
    /** Total execution time */
    totalTime: number;
    /** Number of successful executions */
    successCount: number;
    /** Number of failed executions */
    failureCount: number;
    /** Whether default action was prevented */
    defaultPrevented: boolean;
    /** Whether propagation was stopped */
    propagationStopped: boolean;
}
/**
 * Event statistics
 */
export interface EventStatistics {
    /** Total events emitted */
    totalEventsEmitted: number;
    /** Total listeners executed */
    totalListenersExecuted: number;
    /** Total execution time */
    totalExecutionTime: number;
    /** Average execution time per event */
    averageExecutionTime: number;
    /** Event counts by type */
    eventCounts: Record<string, number>;
    /** Listener counts by event */
    listenerCounts: Record<string, number>;
    /** Error counts by event */
    errorCounts: Record<string, number>;
    /** Most active events */
    mostActiveEvents: Array<{
        event: string;
        count: number;
    }>;
    /** Performance metrics */
    performance: {
        slowestEvents: Array<{
            event: string;
            avgTime: number;
        }>;
        fastestEvents: Array<{
            event: string;
            avgTime: number;
        }>;
        errorProne: Array<{
            event: string;
            errorRate: number;
        }>;
    };
}
/**
 * Advanced event manager with comprehensive lifecycle management
 */
export declare class AdvancedEventManager {
    private listeners;
    private wildcardListeners;
    private eventHistory;
    private statistics;
    private isEnabled;
    private maxHistorySize;
    private defaultTimeout;
    private debugMode;
    constructor(options?: {
        maxHistorySize?: number;
        defaultTimeout?: number;
        debugMode?: boolean;
    });
    /**
     * Subscribe to an event
     */
    subscribe<T = unknown>(event: string | SearchEventType, listener: EventListener<T>, options?: EventListenerOptions): string;
    /**
     * Subscribe to multiple events at once
     */
    subscribeMultiple<T = unknown>(events: Array<string | SearchEventType>, listener: EventListener<T>, options?: EventListenerOptions): string[];
    /**
     * Unsubscribe from an event by subscription ID
     */
    unsubscribe(subscriptionId: string): boolean;
    /**
     * Unsubscribe all listeners for a specific event
     */
    unsubscribeAll(event: string): number;
    /**
     * Unsubscribe all listeners in a group
     */
    unsubscribeGroup(group: string): number;
    /**
     * Emit an event to all subscribers
     */
    emit(event: string | SearchEventType, data?: unknown, metadata?: Record<string, unknown>): Promise<EventBatchResult>;
    /**
     * Emit event synchronously (for simple, non-async listeners)
     */
    emitSync(event: string | SearchEventType, data?: unknown, metadata?: Record<string, unknown>): EventBatchResult;
    /**
     * Check if there are listeners for a specific event
     */
    hasListeners(event: string): boolean;
    /**
     * Get count of listeners for a specific event
     */
    getListenerCount(event: string): number;
    /**
     * Get all active subscriptions
     */
    getActiveSubscriptions(): EventSubscription[];
    /**
     * Get subscriptions for a specific event
     */
    getEventSubscriptions(event: string): EventSubscription[];
    /**
     * Get event statistics
     */
    getStatistics(): EventStatistics;
    /**
     * Clear event history
     */
    clearHistory(): void;
    /**
     * Get event history
     */
    getHistory(limit?: number): EventData[];
    /**
     * Enable or disable the event manager
     */
    setEnabled(enabled: boolean): void;
    /**
     * Clear all listeners and reset state
     */
    clear(): void;
    /**
     * Execute a listener with error handling and timeout
     */
    private executeListener;
    /**
     * Execute a listener synchronously
     */
    private executeListenerSync;
    /**
     * Add event to history
     */
    private addToHistory;
    /**
     * Generate unique subscription ID
     */
    private generateSubscriptionId;
    /**
     * Initialize statistics object
     */
    private initializeStatistics;
    /**
     * Create empty batch result for disabled state
     */
    private createEmptyBatchResult;
}
/**
 * Global event manager instance
 */
export declare const eventManager: AdvancedEventManager;
//# sourceMappingURL=EventManager.d.ts.map