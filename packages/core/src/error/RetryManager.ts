import {
  IRetryManager,
  RetryConfig,
  RetryState,
  RetryMetrics,
  SearchError,
  ErrorType,
} from '../types/ErrorHandling';

export interface RetryEvents {
  onRetryStart?: (error: SearchError, attempt: number) => void;
  onRetrySuccess?: (result: any, attempt: number, totalTime: number) => void;
  onRetryFailure?: (error: SearchError, attempt: number) => void;
  onRetryExhausted?: (errors: SearchError[], totalTime: number) => void;
  onRetryAborted?: (reason: string) => void;
}

export class RetryManager implements IRetryManager {
  private defaultConfig: RetryConfig;
  private currentState: RetryState | null = null;
  private events: RetryEvents;
  private metrics: RetryMetrics;
  private abortController: AbortController | null = null;

  constructor(defaultConfig?: Partial<RetryConfig>, events: RetryEvents = {}) {
    this.defaultConfig = {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitterType: 'equal',
      jitterAmount: 0.1,
      timeout: 60000,
      ...defaultConfig,
    };

    this.events = events;
    this.metrics = {
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageRetryCount: 0,
      averageSuccessDelay: 0,
      retrySuccessRate: 0,
      errorTypeBreakdown: {} as Record<ErrorType, number>,
    };
  }

  public async retry<T>(operation: () => Promise<T>, config?: Partial<RetryConfig>): Promise<T> {
    const retryConfig: RetryConfig = { ...this.defaultConfig, ...config };

    this.initializeRetryState(retryConfig);
    const startTime = Date.now();

    try {
      // First attempt (not counted as retry)
      return await this.executeWithTimeout(operation, retryConfig);
    } catch (error) {
      const searchError = this.normalizeError(error);
      this.currentState!.errors.push(searchError);

      if (!this.canRetry(searchError, 1)) {
        this.updateFailureMetrics(searchError, Date.now() - startTime);
        throw searchError;
      }

      return this.executeRetryLoop(operation, retryConfig, startTime);
    }
  }

  private async executeRetryLoop<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    startTime: number
  ): Promise<T> {
    while (this.currentState!.canRetry && this.currentState!.attempt < config.maxAttempts) {
      this.currentState!.attempt++;
      this.currentState!.isRetrying = true;

      const delay = this.calculateDelay(this.currentState!.attempt, config);
      this.currentState!.nextRetryDelay = delay;
      this.currentState!.totalDelay += delay;

      const lastError = this.currentState!.errors[this.currentState!.errors.length - 1];
      this.events.onRetryStart?.(lastError, this.currentState!.attempt);

      await this.sleep(delay);

      // Check if aborted during sleep
      if (this.abortController?.signal.aborted) {
        this.events.onRetryAborted?.('Operation aborted');
        throw new Error('Retry operation aborted');
      }

      try {
        const result = await this.executeWithTimeout(operation, config);
        const totalTime = Date.now() - startTime;

        this.updateSuccessMetrics(this.currentState!.attempt, totalTime);
        this.events.onRetrySuccess?.(result, this.currentState!.attempt, totalTime);

        return result;
      } catch (error) {
        const searchError = this.normalizeError(error);
        this.currentState!.errors.push(searchError);
        this.events.onRetryFailure?.(searchError, this.currentState!.attempt);

        if (!this.canRetry(searchError, this.currentState!.attempt + 1)) {
          this.currentState!.canRetry = false;
          break;
        }
      }
    }

    // All retries exhausted
    const totalTime = Date.now() - startTime;
    this.updateFailureMetrics(
      this.currentState!.errors[this.currentState!.errors.length - 1],
      totalTime
    );
    this.events.onRetryExhausted?.(this.currentState!.errors, totalTime);

    throw this.currentState!.errors[this.currentState!.errors.length - 1];
  }

  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    config: RetryConfig
  ): Promise<T> {
    if (!config.timeout) {
      return operation();
    }

    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Operation timeout after ${config.timeout}ms`));
        }, config.timeout);

        // Clear timeout if operation completes first
        this.abortController?.signal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
        });
      }),
    ]);
  }

  private initializeRetryState(config: RetryConfig): void {
    this.abortController = new AbortController();
    this.currentState = {
      attempt: 0,
      maxAttempts: config.maxAttempts,
      nextRetryDelay: 0,
      totalDelay: 0,
      errors: [],
      startTime: Date.now(),
      isRetrying: false,
      canRetry: true,
    };
  }

  public canRetry(error: SearchError, attempt: number): boolean {
    if (!this.currentState) return false;
    if (attempt > this.currentState.maxAttempts) return false;

    // Check custom retry condition first
    if (this.defaultConfig.retryCondition) {
      return this.defaultConfig.retryCondition(error, attempt);
    }

    // Default retry logic based on error type and recoverability
    switch (error.recoverability) {
      case 'permanent':
        return false;
      case 'recoverable':
        return true;
      case 'transient':
        return true;
      case 'unknown':
        // Be conservative with unknown errors
        return attempt <= 2;
      default:
        return false;
    }
  }

  public calculateDelay(attempt: number, config: RetryConfig): number {
    // Calculate base delay with exponential backoff
    let delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1);

    // Apply maximum delay cap
    delay = Math.min(delay, config.maxDelay);

    // Apply jitter to prevent thundering herd
    delay = this.applyJitter(delay, config.jitterType, config.jitterAmount);

    return Math.floor(delay);
  }

  private applyJitter(
    delay: number,
    jitterType: NonNullable<RetryConfig['jitterType']>,
    jitterAmount: number
  ): number {
    switch (jitterType) {
      case 'none':
        return delay;

      case 'full':
        // Random delay between 0 and calculated delay
        return Math.random() * delay;

      case 'equal':
        // Random delay between (delay/2) and delay
        return delay * 0.5 + Math.random() * delay * 0.5;

      case 'decorrelated':
        // Decorrelated jitter: random between initialDelay and (delay * 3)
        const min = this.defaultConfig.initialDelay;
        const max = delay * 3;
        return min + Math.random() * (max - min);

      default:
        return delay;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(resolve, ms);

      this.abortController?.signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new Error('Sleep interrupted by abort'));
      });
    });
  }

  private normalizeError(error: any): SearchError {
    if (error && typeof error === 'object' && 'type' in error && 'code' in error) {
      return error as SearchError;
    }

    // Convert regular Error to SearchError
    const searchError: SearchError = {
      name: error.name || 'Error',
      message: error.message || String(error),
      type: this.inferErrorType(error),
      code: error.code || error.status || 'UNKNOWN',
      severity: 'medium',
      recoverability: this.inferRecoverability(error),
      originalError: error,
      timestamp: Date.now(),
      correlationId: this.generateCorrelationId(),
    };

    return searchError;
  }

  private inferErrorType(error: any): ErrorType {
    const message = String(error.message || '').toLowerCase();
    const name = String(error.name || '').toLowerCase();
    const code = String(error.code || error.status || '');

    if (message.includes('timeout') || code.includes('TIMEOUT')) return 'timeout';
    if (message.includes('network') || code.includes('NETWORK')) return 'network';
    if (message.includes('auth') || code === '401') return 'authentication';
    if (message.includes('forbidden') || code === '403') return 'authorization';
    if (message.includes('validation') || code === '400') return 'validation';
    if (code === '429') return 'rate_limit';
    if (code.startsWith('5')) return 'system';

    return 'unknown';
  }

  private inferRecoverability(error: any): 'recoverable' | 'transient' | 'permanent' | 'unknown' {
    const code = String(error.code || error.status || '');
    const message = String(error.message || '').toLowerCase();

    // Network and timeout errors are usually transient
    if (message.includes('timeout') || message.includes('network')) return 'transient';

    // 4xx client errors are often permanent
    if (code.startsWith('4')) {
      if (code === '408' || code === '429') return 'transient'; // Timeout or rate limit
      return 'permanent';
    }

    // 5xx server errors are usually transient
    if (code.startsWith('5')) return 'transient';

    return 'unknown';
  }

  private generateCorrelationId(): string {
    return `retry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateSuccessMetrics(attempts: number, totalTime: number): void {
    this.metrics.totalRetries++;
    this.metrics.successfulRetries++;

    // Update average retry count
    this.metrics.averageRetryCount =
      (this.metrics.averageRetryCount * (this.metrics.totalRetries - 1) + attempts) /
      this.metrics.totalRetries;

    // Update average success delay
    this.metrics.averageSuccessDelay =
      (this.metrics.averageSuccessDelay * (this.metrics.successfulRetries - 1) + totalTime) /
      this.metrics.successfulRetries;

    // Update success rate
    this.metrics.retrySuccessRate = this.metrics.successfulRetries / this.metrics.totalRetries;
  }

  private updateFailureMetrics(error: SearchError, totalTime: number): void {
    this.metrics.totalRetries++;
    this.metrics.failedRetries++;

    // Update error type breakdown
    if (!this.metrics.errorTypeBreakdown[error.type]) {
      this.metrics.errorTypeBreakdown[error.type] = 0;
    }
    this.metrics.errorTypeBreakdown[error.type]++;

    // Update success rate
    this.metrics.retrySuccessRate = this.metrics.successfulRetries / this.metrics.totalRetries;
  }

  public getRetryState(): RetryState | null {
    return this.currentState ? { ...this.currentState } : null;
  }

  public abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.events.onRetryAborted?.('Manual abort requested');
    }

    if (this.currentState) {
      this.currentState.canRetry = false;
      this.currentState.isRetrying = false;
    }
  }

  public reset(): void {
    this.abort();
    this.currentState = null;
    this.abortController = null;
  }

  public getMetrics(): RetryMetrics {
    return { ...this.metrics };
  }

  public setDefaultConfig(config: Partial<RetryConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  public getDefaultConfig(): RetryConfig {
    return { ...this.defaultConfig };
  }

  // Utility methods for common retry scenarios
  public static exponentialBackoff(maxAttempts: number = 3): Partial<RetryConfig> {
    return {
      maxAttempts,
      initialDelay: 1000,
      backoffMultiplier: 2,
      jitterType: 'equal',
      jitterAmount: 0.1,
    };
  }

  public static linearBackoff(maxAttempts: number = 3, delay: number = 1000): Partial<RetryConfig> {
    return {
      maxAttempts,
      initialDelay: delay,
      backoffMultiplier: 1,
      jitterType: 'equal',
      jitterAmount: 0.1,
    };
  }

  public static fixedDelay(maxAttempts: number = 3, delay: number = 1000): Partial<RetryConfig> {
    return {
      maxAttempts,
      initialDelay: delay,
      backoffMultiplier: 1,
      jitterType: 'none',
      jitterAmount: 0,
    };
  }

  public static immediateRetry(maxAttempts: number = 3): Partial<RetryConfig> {
    return {
      maxAttempts,
      initialDelay: 0,
      backoffMultiplier: 1,
      jitterType: 'none',
      jitterAmount: 0,
    };
  }

  public static networkRetry(): Partial<RetryConfig> {
    return {
      maxAttempts: 5,
      initialDelay: 500,
      maxDelay: 10000,
      backoffMultiplier: 1.5,
      jitterType: 'decorrelated',
      jitterAmount: 0.2,
      retryCondition: error =>
        error.type === 'network' ||
        error.type === 'timeout' ||
        error.recoverability === 'transient',
    };
  }

  public static authRetry(): Partial<RetryConfig> {
    return {
      maxAttempts: 2,
      initialDelay: 1000,
      backoffMultiplier: 2,
      jitterType: 'none',
      retryCondition: error =>
        error.type === 'authentication' && error.recoverability === 'recoverable',
    };
  }

  public static rateLimitRetry(): Partial<RetryConfig> {
    return {
      maxAttempts: 4,
      initialDelay: 5000,
      maxDelay: 60000,
      backoffMultiplier: 2,
      jitterType: 'full',
      retryCondition: error => error.type === 'rate_limit',
    };
  }

  public resetMetrics(): void {
    this.metrics = {
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageRetryCount: 0,
      averageSuccessDelay: 0,
      retrySuccessRate: 0,
      errorTypeBreakdown: {} as Record<ErrorType, number>,
    };
  }

  public isRetrying(): boolean {
    return this.currentState?.isRetrying ?? false;
  }

  public getCurrentAttempt(): number {
    return this.currentState?.attempt ?? 0;
  }

  public getNextRetryDelay(): number {
    return this.currentState?.nextRetryDelay ?? 0;
  }

  public getTotalDelay(): number {
    return this.currentState?.totalDelay ?? 0;
  }

  public getRetryHistory(): SearchError[] {
    return this.currentState?.errors ? [...this.currentState.errors] : [];
  }
}
