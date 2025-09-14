/**
 * Callback Executor - Async callback execution utilities
 * @description Handles async callback execution with error handling, retries, and timeouts
 */
/**
 * Advanced callback executor with retry, timeout, and error handling
 */
export class AdvancedCallbackExecutor {
    constructor() {
        this.activeExecutions = new Set();
        this.executionStats = {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            totalExecutionTime: 0,
            averageExecutionTime: 0
        };
    }
    /**
     * Execute a single callback with options
     */
    async execute(callback, args = [], options = {}) {
        const executionId = this.generateExecutionId();
        const startTime = performance.now();
        const config = {
            timeout: 10000,
            catchErrors: true,
            maxParallel: 10,
            ...options
        };
        this.activeExecutions.add(executionId);
        this.executionStats.totalExecutions++;
        let attempts = 0;
        let lastError;
        try {
            const maxAttempts = config.retry?.maxAttempts || 1;
            let delay = config.retry?.delayMs || 0;
            while (attempts < maxAttempts) {
                attempts++;
                try {
                    const result = await this.executeWithTimeout(callback, args, config.timeout);
                    const executionTime = performance.now() - startTime;
                    this.updateStats(true, executionTime);
                    return {
                        success: true,
                        result,
                        metadata: {
                            executionTime,
                            attempts,
                            timedOut: false,
                            retried: attempts > 1
                        }
                    };
                }
                catch (error) {
                    lastError = error instanceof Error ? error : new Error(String(error));
                    if (attempts < maxAttempts) {
                        await this.delay(delay);
                        if (config.retry?.backoffMultiplier) {
                            delay *= config.retry.backoffMultiplier;
                        }
                    }
                }
            }
            // All attempts failed
            const executionTime = performance.now() - startTime;
            this.updateStats(false, executionTime);
            return {
                success: false,
                error: lastError || new Error('Callback execution failed'),
                metadata: {
                    executionTime,
                    attempts,
                    timedOut: lastError?.message.includes('timeout') || false,
                    retried: attempts > 1
                }
            };
        }
        finally {
            this.activeExecutions.delete(executionId);
        }
    }
    /**
     * Execute multiple callbacks in parallel
     */
    async executeParallel(callbacks, globalOptions = {}) {
        const startTime = performance.now();
        const promises = callbacks.map(({ callback, args = [], options = {} }) => this.execute(callback, args, { ...globalOptions, ...options }));
        const results = await Promise.all(promises);
        const totalTime = performance.now() - startTime;
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.length - successCount;
        return {
            results,
            successCount,
            failureCount,
            totalTime,
            averageTime: results.length > 0 ? totalTime / results.length : 0
        };
    }
    /**
     * Execute multiple callbacks in sequence
     */
    async executeSequential(callbacks, globalOptions = {}) {
        const startTime = performance.now();
        const results = [];
        for (const { callback, args = [], options = {} } of callbacks) {
            const result = await this.execute(callback, args, { ...globalOptions, ...options });
            results.push(result);
            // Stop on first failure if configured
            if (!result.success && globalOptions.catchErrors === false) {
                break;
            }
        }
        const totalTime = performance.now() - startTime;
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.length - successCount;
        return {
            results,
            successCount,
            failureCount,
            totalTime,
            averageTime: results.length > 0 ? totalTime / results.length : 0
        };
    }
    /**
     * Execute callback with timeout
     */
    async executeWithTimeout(callback, args, timeoutMs) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Callback execution timed out after ${timeoutMs}ms`));
            }, timeoutMs);
            try {
                const result = callback(...args);
                if (result instanceof Promise) {
                    result
                        .then(value => {
                        clearTimeout(timer);
                        resolve(value);
                    })
                        .catch(error => {
                        clearTimeout(timer);
                        reject(error);
                    });
                }
                else {
                    clearTimeout(timer);
                    resolve(result);
                }
            }
            catch (error) {
                clearTimeout(timer);
                reject(error);
            }
        });
    }
    /**
     * Delay execution
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Update execution statistics
     */
    updateStats(success, executionTime) {
        if (success) {
            this.executionStats.successfulExecutions++;
        }
        else {
            this.executionStats.failedExecutions++;
        }
        this.executionStats.totalExecutionTime += executionTime;
        this.executionStats.averageExecutionTime =
            this.executionStats.totalExecutionTime / this.executionStats.totalExecutions;
    }
    /**
     * Generate execution ID
     */
    generateExecutionId() {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Get execution statistics
     */
    getStatistics() {
        return {
            ...this.executionStats,
            activeExecutions: this.activeExecutions.size
        };
    }
    /**
     * Reset statistics
     */
    resetStatistics() {
        this.executionStats = {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            totalExecutionTime: 0,
            averageExecutionTime: 0
        };
    }
}
/**
 * Global callback executor instance
 */
export const callbackExecutor = new AdvancedCallbackExecutor();
//# sourceMappingURL=CallbackExecutor.js.map