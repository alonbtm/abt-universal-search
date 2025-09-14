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
export type SearchEventType =
  | 'search:start'
  | 'search:complete'
  | 'search:error'
  | 'search:select'
  | 'query:change'
  | 'results:updated'
  | 'connection:established'
  | 'connection:lost'
  | 'transformation:complete'
  | 'validation:failed'
  | 'performance:warning'
  | 'action:prevented'
  | 'cleanup:completed';

/**
 * Event listener function type
 */
export type EventListener<T = unknown> = (
  eventData: EventData & { data: T }
) => void | Promise<void>;

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
  mostActiveEvents: Array<{ event: string; count: number }>;
  /** Performance metrics */
  performance: {
    slowestEvents: Array<{ event: string; avgTime: number }>;
    fastestEvents: Array<{ event: string; avgTime: number }>;
    errorProne: Array<{ event: string; errorRate: number }>;
  };
}

/**
 * Advanced event manager with comprehensive lifecycle management
 */
export class AdvancedEventManager {
  private listeners = new Map<string, EventSubscription[]>();
  private wildcardListeners: EventSubscription[] = [];
  private eventHistory: EventData[] = [];
  private statistics: EventStatistics = this.initializeStatistics();
  private isEnabled = true;
  private maxHistorySize = 1000;
  private defaultTimeout = 5000; // 5 seconds
  private debugMode = false;

  constructor(
    options: {
      maxHistorySize?: number;
      defaultTimeout?: number;
      debugMode?: boolean;
    } = {}
  ) {
    this.maxHistorySize = options.maxHistorySize || 1000;
    this.defaultTimeout = options.defaultTimeout || 5000;
    this.debugMode = options.debugMode || false;
  }

  /**
   * Subscribe to an event
   */
  public subscribe<T = unknown>(
    event: string | SearchEventType,
    listener: EventListener<T>,
    options: EventListenerOptions = {}
  ): string {
    if (!this.isEnabled) {
      throw new Error('EventManager is disabled');
    }

    const subscription: EventSubscription = {
      event,
      listener: listener as EventListener,
      options: {
        once: false,
        priority: 0,
        passive: false,
        timeout: this.defaultTimeout,
        ...options,
      },
      id: this.generateSubscriptionId(),
      created: Date.now(),
      executionCount: 0,
    };

    if (event === '*') {
      this.wildcardListeners.push(subscription);
      this.wildcardListeners.sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));
    } else {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }

      this.listeners.get(event)!.push(subscription);
      // Sort by priority (higher priority first)
      this.listeners
        .get(event)!
        .sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));
    }

    if (this.debugMode) {
      console.log(`[EventManager] Subscribed to event '${event}' with ID: ${subscription.id}`);
    }

    return subscription.id;
  }

  /**
   * Subscribe to multiple events at once
   */
  public subscribeMultiple<T = unknown>(
    events: Array<string | SearchEventType>,
    listener: EventListener<T>,
    options: EventListenerOptions = {}
  ): string[] {
    return events.map(event => this.subscribe(event, listener, options));
  }

  /**
   * Unsubscribe from an event by subscription ID
   */
  public unsubscribe(subscriptionId: string): boolean {
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
  public unsubscribeAll(event: string): number {
    const count = this.listeners.get(event)?.length || 0;
    this.listeners.delete(event);

    if (this.debugMode) {
      console.log(
        `[EventManager] Unsubscribed all listeners for event '${event}': ${count} listeners`
      );
    }

    return count;
  }

  /**
   * Unsubscribe all listeners in a group
   */
  public unsubscribeGroup(group: string): number {
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
      this.listeners.set(
        event,
        subscriptions.filter(s => {
          if (s.options.group === group) {
            count++;
            return false;
          }
          return true;
        })
      );

      if (this.listeners.get(event)!.length === 0) {
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
  public async emit(
    event: string | SearchEventType,
    data?: unknown,
    metadata?: Record<string, unknown>
  ): Promise<EventBatchResult> {
    if (!this.isEnabled) {
      return this.createEmptyBatchResult(event, data, metadata);
    }

    const startTime = performance.now();

    const eventData: EventData = {
      type: event,
      timestamp: Date.now(),
      data: data as Record<string, unknown>,
      metadata,
    };

    // Create propagation control
    let propagationStopped = false;
    let defaultPrevented = false;

    const propagation: EventPropagation = {
      stopPropagation: () => {
        propagationStopped = true;
      },
      preventDefault: () => {
        defaultPrevented = true;
      },
      isPropagationStopped: () => propagationStopped,
      isDefaultPrevented: () => defaultPrevented,
    };

    const controllableEventData: ControllableEventData = {
      ...eventData,
      propagation,
    };

    // Add to history
    this.addToHistory(eventData);

    // Update statistics
    this.statistics.totalEventsEmitted++;
    this.statistics.eventCounts[event] = (this.statistics.eventCounts[event] || 0) + 1;

    const results: EventExecutionResult[] = [];

    // Get listeners outside try block so they're in scope for statistics
    const specificListeners = this.listeners.get(event) || [];

    try {
      // Execute specific event listeners
      for (const subscription of specificListeners) {
        if (propagationStopped) break;

        const result = await this.executeListener(subscription, controllableEventData);
        results.push(result);

        if (subscription.options.once) {
          this.unsubscribe(subscription.id);
        }
      }

      // Execute wildcard listeners if propagation not stopped
      if (!propagationStopped) {
        for (const subscription of this.wildcardListeners) {
          if (propagationStopped) break;

          const result = await this.executeListener(subscription, controllableEventData);
          results.push(result);

          if (subscription.options.once) {
            this.unsubscribe(subscription.id);
          }
        }
      }
    } catch (error) {
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
    this.statistics.averageExecutionTime =
      this.statistics.totalExecutionTime / this.statistics.totalEventsEmitted;
    this.statistics.listenerCounts[event] =
      specificListeners.length + this.wildcardListeners.length;
    this.statistics.errorCounts[event] = failureCount;

    const batchResult: EventBatchResult = {
      event,
      eventData,
      results,
      totalTime,
      successCount,
      failureCount,
      defaultPrevented,
      propagationStopped,
    };

    if (this.debugMode) {
      console.log(`[EventManager] Emitted event '${event}':`, {
        listeners: results.length,
        successful: successCount,
        failed: failureCount,
        time: totalTime.toFixed(2) + 'ms',
        defaultPrevented,
        propagationStopped,
      });
    }

    return batchResult;
  }

  /**
   * Emit event synchronously (for simple, non-async listeners)
   */
  public emitSync(
    event: string | SearchEventType,
    data?: unknown,
    metadata?: Record<string, unknown>
  ): EventBatchResult {
    const startTime = performance.now();

    const eventData: EventData = {
      type: event,
      timestamp: Date.now(),
      data: data as Record<string, unknown>,
      metadata,
    };

    let propagationStopped = false;
    let defaultPrevented = false;

    const propagation: EventPropagation = {
      stopPropagation: () => {
        propagationStopped = true;
      },
      preventDefault: () => {
        defaultPrevented = true;
      },
      isPropagationStopped: () => propagationStopped,
      isDefaultPrevented: () => defaultPrevented,
    };

    const controllableEventData: ControllableEventData = {
      ...eventData,
      propagation,
    };

    this.addToHistory(eventData);
    this.statistics.totalEventsEmitted++;
    this.statistics.eventCounts[event] = (this.statistics.eventCounts[event] || 0) + 1;

    const results: EventExecutionResult[] = [];
    const specificListeners = this.listeners.get(event) || [];

    // Execute specific listeners
    for (const subscription of specificListeners) {
      if (propagationStopped) break;

      const result = this.executeListenerSync(subscription, controllableEventData);
      results.push(result);
    }

    // Execute wildcard listeners
    if (!propagationStopped) {
      for (const subscription of this.wildcardListeners) {
        if (propagationStopped) break;

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
      propagationStopped,
    };
  }

  /**
   * Check if there are listeners for a specific event
   */
  public hasListeners(event: string): boolean {
    return (this.listeners.get(event)?.length || 0) > 0 || this.wildcardListeners.length > 0;
  }

  /**
   * Get count of listeners for a specific event
   */
  public getListenerCount(event: string): number {
    return (this.listeners.get(event)?.length || 0) + this.wildcardListeners.length;
  }

  /**
   * Get all active subscriptions
   */
  public getActiveSubscriptions(): EventSubscription[] {
    const subscriptions: EventSubscription[] = [];

    for (const eventSubscriptions of this.listeners.values()) {
      subscriptions.push(...eventSubscriptions);
    }

    subscriptions.push(...this.wildcardListeners);
    return subscriptions;
  }

  /**
   * Get subscriptions for a specific event
   */
  public getEventSubscriptions(event: string): EventSubscription[] {
    return [...(this.listeners.get(event) || []), ...this.wildcardListeners];
  }

  /**
   * Get event statistics
   */
  public getStatistics(): EventStatistics {
    // Update dynamic statistics
    const mostActiveEvents = Object.entries(this.statistics.eventCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([event, count]) => ({ event, count }));

    const slowestEvents: Array<{ event: string; avgTime: number }> = [];
    const fastestEvents: Array<{ event: string; avgTime: number }> = [];
    const errorProne: Array<{ event: string; errorRate: number }> = [];

    // Calculate performance metrics
    for (const [event, count] of Object.entries(this.statistics.eventCounts)) {
      const errorCount = this.statistics.errorCounts[event] || 0;
      const errorRate = count > 0 ? errorCount / count : 0;

      if (errorRate > 0.1) {
        // More than 10% error rate
        errorProne.push({ event, errorRate });
      }
    }

    return {
      ...this.statistics,
      mostActiveEvents,
      performance: {
        slowestEvents,
        fastestEvents,
        errorProne: errorProne.sort((a, b) => b.errorRate - a.errorRate).slice(0, 5),
      },
    };
  }

  /**
   * Clear event history
   */
  public clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get event history
   */
  public getHistory(limit?: number): EventData[] {
    return limit ? this.eventHistory.slice(-limit) : [...this.eventHistory];
  }

  /**
   * Enable or disable the event manager
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (this.debugMode) {
      console.log(`[EventManager] ${enabled ? 'Enabled' : 'Disabled'}`);
    }
  }

  /**
   * Clear all listeners and reset state
   */
  public clear(): void {
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
  private async executeListener(
    subscription: EventSubscription,
    eventData: ControllableEventData
  ): Promise<EventExecutionResult> {
    const startTime = performance.now();

    try {
      subscription.executionCount++;
      subscription.lastExecuted = Date.now();

      const timeout = subscription.options.timeout || this.defaultTimeout;

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Listener timeout after ${timeout}ms`)), timeout);
      });

      // Execute listener with timeout
      const listenerPromise = Promise.resolve(subscription.listener(eventData));
      const result = await Promise.race([listenerPromise, timeoutPromise]);

      return {
        subscription,
        success: true,
        executionTime: performance.now() - startTime,
        result,
      };
    } catch (error) {
      return {
        subscription,
        success: false,
        executionTime: performance.now() - startTime,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Execute a listener synchronously
   */
  private executeListenerSync(
    subscription: EventSubscription,
    eventData: ControllableEventData
  ): EventExecutionResult {
    const startTime = performance.now();

    try {
      subscription.executionCount++;
      subscription.lastExecuted = Date.now();

      const result = subscription.listener(eventData);

      return {
        subscription,
        success: true,
        executionTime: performance.now() - startTime,
        result,
      };
    } catch (error) {
      return {
        subscription,
        success: false,
        executionTime: performance.now() - startTime,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Add event to history
   */
  private addToHistory(eventData: EventData): void {
    this.eventHistory.push(eventData);

    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Generate unique subscription ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize statistics object
   */
  private initializeStatistics(): EventStatistics {
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
        errorProne: [],
      },
    };
  }

  /**
   * Create empty batch result for disabled state
   */
  private createEmptyBatchResult(
    event: string | SearchEventType,
    data?: unknown,
    metadata?: Record<string, unknown>
  ): EventBatchResult {
    return {
      event,
      eventData: {
        type: event,
        timestamp: Date.now(),
        data: data as Record<string, unknown>,
        metadata,
      },
      results: [],
      totalTime: 0,
      successCount: 0,
      failureCount: 0,
      defaultPrevented: false,
      propagationStopped: false,
    };
  }
}

/**
 * Global event manager instance
 */
export const eventManager = new AdvancedEventManager({
  debugMode: process.env.NODE_ENV === 'development',
});
