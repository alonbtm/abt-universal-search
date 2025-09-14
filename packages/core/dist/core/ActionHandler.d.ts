/**
 * Action Handler - Enhanced action processing pipeline
 * @description Main pipeline that orchestrates action handling with events, callbacks, and lifecycle management
 */
import { SearchResult } from '../types/Search';
/**
 * Action handler configuration
 */
export interface ActionHandlerConfig {
    /** Enable debug logging */
    debug?: boolean;
    /** Default callback timeout */
    timeout?: number;
    /** Enable automatic cleanup */
    autoCleanup?: boolean;
    /** Maximum concurrent actions */
    maxConcurrentActions?: number;
    /** Enable performance monitoring */
    enableMetrics?: boolean;
    /** Global error handling strategy */
    errorStrategy?: 'throw' | 'callback' | 'both';
    /** Enable context validation */
    validateContext?: boolean;
    /** Enable memory leak detection */
    detectLeaks?: boolean;
}
/**
 * Action processing options
 */
export interface ActionProcessingOptions {
    /** Action type identifier */
    actionType?: string;
    /** Custom callback execution options */
    callbackOptions?: {
        timeout?: number;
        retries?: number;
        parallel?: boolean;
    };
    /** Context enrichment configuration */
    contextConfig?: {
        includeMetadata?: boolean;
        sanitize?: boolean;
        validate?: boolean;
    };
    /** Interception configuration */
    interceptionConfig?: {
        preventable?: boolean;
        customNavigation?: boolean;
        priority?: number;
    };
    /** Cleanup configuration */
    cleanupConfig?: {
        immediate?: boolean;
        cascade?: boolean;
        force?: boolean;
    };
}
/**
 * Action processing result
 */
export interface ActionProcessingResult {
    /** Whether action was successful */
    success: boolean;
    /** Action result data */
    result?: unknown;
    /** Processing error if any */
    error?: Error;
    /** Action context */
    context?: any;
    /** Processing metadata */
    metadata: {
        actionId: string;
        processingTime: number;
        eventCount: number;
        callbackCount: number;
        intercepted: boolean;
        prevented: boolean;
        cleanupPerformed: boolean;
    };
    /** Event emission results */
    eventResults?: any[];
    /** Callback execution results */
    callbackResults?: any[];
}
/**
 * Action handler statistics
 */
export interface ActionHandlerStatistics {
    /** Total actions processed */
    totalActions: number;
    /** Successful actions */
    successfulActions: number;
    /** Failed actions */
    failedActions: number;
    /** Prevented actions */
    preventedActions: number;
    /** Average processing time */
    averageProcessingTime: number;
    /** Current concurrent actions */
    concurrentActions: number;
    /** Peak concurrent actions */
    peakConcurrentActions: number;
    /** Memory usage statistics */
    memoryStats: {
        activeContexts: number;
        cleanupOperations: number;
        memoryLeaks: number;
    };
    /** Performance metrics */
    performance: {
        fastestAction: number;
        slowestAction: number;
        totalProcessingTime: number;
    };
}
/**
 * Enhanced action handler with integrated pipeline
 */
export declare class AdvancedActionHandler {
    private config;
    private statistics;
    private activeActions;
    private processingQueue;
    private isProcessingQueue;
    constructor(config?: ActionHandlerConfig);
    /**
     * Process an action through the complete pipeline
     */
    processAction(result: SearchResult, options?: ActionProcessingOptions): Promise<ActionProcessingResult>;
    /**
     * Register action callback with specific event
     */
    registerActionCallback(event: string, callback: (result: SearchResult, context: any) => unknown | Promise<unknown>, options?: {
        priority?: number;
        once?: boolean;
        timeout?: number;
        retries?: number;
    }): string;
    /**
     * Process multiple actions in parallel
     */
    processActionsParallel(actions: Array<{
        result: SearchResult;
        options?: ActionProcessingOptions;
    }>, globalOptions?: ActionProcessingOptions): Promise<ActionProcessingResult[]>;
    /**
     * Get current statistics
     */
    getStatistics(): ActionHandlerStatistics;
    /**
     * Reset statistics
     */
    resetStatistics(): void;
    /**
     * Perform immediate cleanup
     */
    cleanup(): Promise<{
        cleaned: number;
        errors: number;
    }>;
    /**
     * Create action context with validation
     */
    private createActionContext;
    /**
     * Execute action interception
     */
    private executeInterception;
    /**
     * Execute registered callbacks
     */
    private executeCallbacks;
    /**
     * Execute final action
     */
    private executeFinalAction;
    /**
     * Handle prevented action
     */
    private handlePreventedAction;
    /**
     * Perform action-specific cleanup
     */
    private performActionCleanup;
    /**
     * Queue action when at concurrent limit
     */
    private queueAction;
    /**
     * Process queued actions
     */
    private processQueuedActions;
    /**
     * Perform periodic maintenance tasks
     */
    private performMaintenanceTasks;
    /**
     * Update processing statistics
     */
    private updateStatistics;
    /**
     * Update concurrent action statistics
     */
    private updateConcurrentStats;
    /**
     * Generate unique action ID
     */
    private generateActionId;
    /**
     * Initialize statistics
     */
    private initializeStatistics;
}
/**
 * Global action handler instance
 */
export declare const actionHandler: AdvancedActionHandler;
//# sourceMappingURL=ActionHandler.d.ts.map