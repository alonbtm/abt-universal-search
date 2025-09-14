import { IRetryManager, RetryConfig, RetryState, RetryMetrics, SearchError } from '../types/ErrorHandling';
export interface RetryEvents {
    onRetryStart?: (error: SearchError, attempt: number) => void;
    onRetrySuccess?: (result: any, attempt: number, totalTime: number) => void;
    onRetryFailure?: (error: SearchError, attempt: number) => void;
    onRetryExhausted?: (errors: SearchError[], totalTime: number) => void;
    onRetryAborted?: (reason: string) => void;
}
export declare class RetryManager implements IRetryManager {
    private defaultConfig;
    private currentState;
    private events;
    private metrics;
    private abortController;
    constructor(defaultConfig?: Partial<RetryConfig>, events?: RetryEvents);
    retry<T>(operation: () => Promise<T>, config?: Partial<RetryConfig>): Promise<T>;
    private executeRetryLoop;
    private executeWithTimeout;
    private initializeRetryState;
    canRetry(error: SearchError, attempt: number): boolean;
    calculateDelay(attempt: number, config: RetryConfig): number;
    private applyJitter;
    private sleep;
    private normalizeError;
    private inferErrorType;
    private inferRecoverability;
    private generateCorrelationId;
    private updateSuccessMetrics;
    private updateFailureMetrics;
    getRetryState(): RetryState | null;
    abort(): void;
    reset(): void;
    getMetrics(): RetryMetrics;
    setDefaultConfig(config: Partial<RetryConfig>): void;
    getDefaultConfig(): RetryConfig;
    static exponentialBackoff(maxAttempts?: number): Partial<RetryConfig>;
    static linearBackoff(maxAttempts?: number, delay?: number): Partial<RetryConfig>;
    static fixedDelay(maxAttempts?: number, delay?: number): Partial<RetryConfig>;
    static immediateRetry(maxAttempts?: number): Partial<RetryConfig>;
    static networkRetry(): Partial<RetryConfig>;
    static authRetry(): Partial<RetryConfig>;
    static rateLimitRetry(): Partial<RetryConfig>;
    resetMetrics(): void;
    isRetrying(): boolean;
    getCurrentAttempt(): number;
    getNextRetryDelay(): number;
    getTotalDelay(): number;
    getRetryHistory(): SearchError[];
}
//# sourceMappingURL=RetryManager.d.ts.map