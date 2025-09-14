/**
 * Callback Executor - Async callback execution utilities
 * @description Handles async callback execution with error handling, retries, and timeouts
 */
/**
 * Callback execution options
 */
export interface CallbackExecutionOptions {
    /** Execution timeout in milliseconds */
    timeout?: number;
    /** Retry configuration */
    retry?: {
        maxAttempts: number;
        delayMs: number;
        backoffMultiplier?: number;
    };
    /** Whether to catch and handle errors */
    catchErrors?: boolean;
    /** Maximum parallel executions */
    maxParallel?: number;
}
/**
 * Callback execution result
 */
export interface CallbackExecutionResult<T = unknown> {
    /** Whether execution was successful */
    success: boolean;
    /** Execution result */
    result?: T;
    /** Execution error if any */
    error?: Error;
    /** Execution metadata */
    metadata: {
        executionTime: number;
        attempts: number;
        timedOut: boolean;
        retried: boolean;
    };
}
/**
 * Batch callback execution result
 */
export interface BatchCallbackExecutionResult<T = unknown> {
    /** All execution results */
    results: CallbackExecutionResult<T>[];
    /** Number of successful executions */
    successCount: number;
    /** Number of failed executions */
    failureCount: number;
    /** Total execution time */
    totalTime: number;
    /** Average execution time */
    averageTime: number;
}
/**
 * Advanced callback executor with retry, timeout, and error handling
 */
export declare class AdvancedCallbackExecutor {
    private activeExecutions;
    private executionStats;
    /**
     * Execute a single callback with options
     */
    execute<T>(callback: (...args: any[]) => T | Promise<T>, args?: any[], options?: CallbackExecutionOptions): Promise<CallbackExecutionResult<T>>;
    /**
     * Execute multiple callbacks in parallel
     */
    executeParallel<T>(callbacks: Array<{
        callback: (...args: any[]) => T | Promise<T>;
        args?: any[];
        options?: CallbackExecutionOptions;
    }>, globalOptions?: CallbackExecutionOptions): Promise<BatchCallbackExecutionResult<T>>;
    /**
     * Execute multiple callbacks in sequence
     */
    executeSequential<T>(callbacks: Array<{
        callback: (...args: any[]) => T | Promise<T>;
        args?: any[];
        options?: CallbackExecutionOptions;
    }>, globalOptions?: CallbackExecutionOptions): Promise<BatchCallbackExecutionResult<T>>;
    /**
     * Execute callback with timeout
     */
    private executeWithTimeout;
    /**
     * Delay execution
     */
    private delay;
    /**
     * Update execution statistics
     */
    private updateStats;
    /**
     * Generate execution ID
     */
    private generateExecutionId;
    /**
     * Get execution statistics
     */
    getStatistics(): {
        activeExecutions: number;
        totalExecutions: number;
        successfulExecutions: number;
        failedExecutions: number;
        totalExecutionTime: number;
        averageExecutionTime: number;
    };
    /**
     * Reset statistics
     */
    resetStatistics(): void;
}
/**
 * Global callback executor instance
 */
export declare const callbackExecutor: AdvancedCallbackExecutor;
//# sourceMappingURL=CallbackExecutor.d.ts.map