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
export class AdvancedCallbackExecutor {
  private activeExecutions = new Set<string>();
  private executionStats = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    totalExecutionTime: 0,
    averageExecutionTime: 0
  };

  /**
   * Execute a single callback with options
   */
  public async execute<T>(
    callback: (...args: any[]) => T | Promise<T>,
    args: any[] = [],
    options: CallbackExecutionOptions = {}
  ): Promise<CallbackExecutionResult<T>> {
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
    let lastError: Error | undefined;

    try {
      const maxAttempts = config.retry?.maxAttempts || 1;
      let delay = config.retry?.delayMs || 0;

      while (attempts < maxAttempts) {
        attempts++;

        try {
          const result = await this.executeWithTimeout(callback, args, config.timeout!);
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

        } catch (error) {
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

    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Execute multiple callbacks in parallel
   */
  public async executeParallel<T>(
    callbacks: Array<{
      callback: (...args: any[]) => T | Promise<T>;
      args?: any[];
      options?: CallbackExecutionOptions;
    }>,
    globalOptions: CallbackExecutionOptions = {}
  ): Promise<BatchCallbackExecutionResult<T>> {
    const startTime = performance.now();

    const promises = callbacks.map(({ callback, args = [], options = {} }) =>
      this.execute(callback, args, { ...globalOptions, ...options })
    );

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
  public async executeSequential<T>(
    callbacks: Array<{
      callback: (...args: any[]) => T | Promise<T>;
      args?: any[];
      options?: CallbackExecutionOptions;
    }>,
    globalOptions: CallbackExecutionOptions = {}
  ): Promise<BatchCallbackExecutionResult<T>> {
    const startTime = performance.now();
    const results: CallbackExecutionResult<T>[] = [];

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
  private async executeWithTimeout<T>(
    callback: (...args: any[]) => T | Promise<T>,
    args: any[],
    timeoutMs: number
  ): Promise<T> {
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
        } else {
          clearTimeout(timer);
          resolve(result);
        }
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update execution statistics
   */
  private updateStats(success: boolean, executionTime: number): void {
    if (success) {
      this.executionStats.successfulExecutions++;
    } else {
      this.executionStats.failedExecutions++;
    }

    this.executionStats.totalExecutionTime += executionTime;
    this.executionStats.averageExecutionTime = 
      this.executionStats.totalExecutionTime / this.executionStats.totalExecutions;
  }

  /**
   * Generate execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get execution statistics
   */
  public getStatistics() {
    return {
      ...this.executionStats,
      activeExecutions: this.activeExecutions.size
    };
  }

  /**
   * Reset statistics
   */
  public resetStatistics(): void {
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