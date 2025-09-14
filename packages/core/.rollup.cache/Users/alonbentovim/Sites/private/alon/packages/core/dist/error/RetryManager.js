export class RetryManager {
    constructor(defaultConfig, events = {}) {
        this.currentState = null;
        this.abortController = null;
        this.defaultConfig = {
            maxAttempts: 3,
            initialDelay: 1000,
            maxDelay: 30000,
            backoffMultiplier: 2,
            jitterType: 'equal',
            jitterAmount: 0.1,
            timeout: 60000,
            ...defaultConfig
        };
        this.events = events;
        this.metrics = {
            totalRetries: 0,
            successfulRetries: 0,
            failedRetries: 0,
            averageRetryCount: 0,
            averageSuccessDelay: 0,
            retrySuccessRate: 0,
            errorTypeBreakdown: {}
        };
    }
    async retry(operation, config) {
        const retryConfig = { ...this.defaultConfig, ...config };
        this.initializeRetryState(retryConfig);
        const startTime = Date.now();
        try {
            // First attempt (not counted as retry)
            return await this.executeWithTimeout(operation, retryConfig);
        }
        catch (error) {
            const searchError = this.normalizeError(error);
            this.currentState.errors.push(searchError);
            if (!this.canRetry(searchError, 1)) {
                this.updateFailureMetrics(searchError, Date.now() - startTime);
                throw searchError;
            }
            return this.executeRetryLoop(operation, retryConfig, startTime);
        }
    }
    async executeRetryLoop(operation, config, startTime) {
        while (this.currentState.canRetry && this.currentState.attempt < config.maxAttempts) {
            this.currentState.attempt++;
            this.currentState.isRetrying = true;
            const delay = this.calculateDelay(this.currentState.attempt, config);
            this.currentState.nextRetryDelay = delay;
            this.currentState.totalDelay += delay;
            const lastError = this.currentState.errors[this.currentState.errors.length - 1];
            this.events.onRetryStart?.(lastError, this.currentState.attempt);
            await this.sleep(delay);
            // Check if aborted during sleep
            if (this.abortController?.signal.aborted) {
                this.events.onRetryAborted?.('Operation aborted');
                throw new Error('Retry operation aborted');
            }
            try {
                const result = await this.executeWithTimeout(operation, config);
                const totalTime = Date.now() - startTime;
                this.updateSuccessMetrics(this.currentState.attempt, totalTime);
                this.events.onRetrySuccess?.(result, this.currentState.attempt, totalTime);
                return result;
            }
            catch (error) {
                const searchError = this.normalizeError(error);
                this.currentState.errors.push(searchError);
                this.events.onRetryFailure?.(searchError, this.currentState.attempt);
                if (!this.canRetry(searchError, this.currentState.attempt + 1)) {
                    this.currentState.canRetry = false;
                    break;
                }
            }
        }
        // All retries exhausted
        const totalTime = Date.now() - startTime;
        this.updateFailureMetrics(this.currentState.errors[this.currentState.errors.length - 1], totalTime);
        this.events.onRetryExhausted?.(this.currentState.errors, totalTime);
        throw this.currentState.errors[this.currentState.errors.length - 1];
    }
    async executeWithTimeout(operation, config) {
        if (!config.timeout) {
            return operation();
        }
        return Promise.race([
            operation(),
            new Promise((_, reject) => {
                const timeoutId = setTimeout(() => {
                    reject(new Error(`Operation timeout after ${config.timeout}ms`));
                }, config.timeout);
                // Clear timeout if operation completes first
                this.abortController?.signal.addEventListener('abort', () => {
                    clearTimeout(timeoutId);
                });
            })
        ]);
    }
    initializeRetryState(config) {
        this.abortController = new AbortController();
        this.currentState = {
            attempt: 0,
            maxAttempts: config.maxAttempts,
            nextRetryDelay: 0,
            totalDelay: 0,
            errors: [],
            startTime: Date.now(),
            isRetrying: false,
            canRetry: true
        };
    }
    canRetry(error, attempt) {
        if (!this.currentState)
            return false;
        if (attempt > this.currentState.maxAttempts)
            return false;
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
    calculateDelay(attempt, config) {
        // Calculate base delay with exponential backoff
        let delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1);
        // Apply maximum delay cap
        delay = Math.min(delay, config.maxDelay);
        // Apply jitter to prevent thundering herd
        delay = this.applyJitter(delay, config.jitterType, config.jitterAmount);
        return Math.floor(delay);
    }
    applyJitter(delay, jitterType, jitterAmount) {
        switch (jitterType) {
            case 'none':
                return delay;
            case 'full':
                // Random delay between 0 and calculated delay
                return Math.random() * delay;
            case 'equal':
                // Random delay between (delay/2) and delay
                return delay * 0.5 + (Math.random() * delay * 0.5);
            case 'decorrelated':
                // Decorrelated jitter: random between initialDelay and (delay * 3)
                const min = this.defaultConfig.initialDelay;
                const max = delay * 3;
                return min + Math.random() * (max - min);
            default:
                return delay;
        }
    }
    sleep(ms) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(resolve, ms);
            this.abortController?.signal.addEventListener('abort', () => {
                clearTimeout(timeoutId);
                reject(new Error('Sleep interrupted by abort'));
            });
        });
    }
    normalizeError(error) {
        if (error && typeof error === 'object' && 'type' in error && 'code' in error) {
            return error;
        }
        // Convert regular Error to SearchError
        const searchError = {
            name: error.name || 'Error',
            message: error.message || String(error),
            type: this.inferErrorType(error),
            code: error.code || error.status || 'UNKNOWN',
            severity: 'medium',
            recoverability: this.inferRecoverability(error),
            originalError: error,
            timestamp: Date.now(),
            correlationId: this.generateCorrelationId()
        };
        return searchError;
    }
    inferErrorType(error) {
        const message = String(error.message || '').toLowerCase();
        const name = String(error.name || '').toLowerCase();
        const code = String(error.code || error.status || '');
        if (message.includes('timeout') || code.includes('TIMEOUT'))
            return 'timeout';
        if (message.includes('network') || code.includes('NETWORK'))
            return 'network';
        if (message.includes('auth') || code === '401')
            return 'authentication';
        if (message.includes('forbidden') || code === '403')
            return 'authorization';
        if (message.includes('validation') || code === '400')
            return 'validation';
        if (code === '429')
            return 'rate_limit';
        if (code.startsWith('5'))
            return 'system';
        return 'unknown';
    }
    inferRecoverability(error) {
        const code = String(error.code || error.status || '');
        const message = String(error.message || '').toLowerCase();
        // Network and timeout errors are usually transient
        if (message.includes('timeout') || message.includes('network'))
            return 'transient';
        // 4xx client errors are often permanent
        if (code.startsWith('4')) {
            if (code === '408' || code === '429')
                return 'transient'; // Timeout or rate limit
            return 'permanent';
        }
        // 5xx server errors are usually transient
        if (code.startsWith('5'))
            return 'transient';
        return 'unknown';
    }
    generateCorrelationId() {
        return `retry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    updateSuccessMetrics(attempts, totalTime) {
        this.metrics.totalRetries++;
        this.metrics.successfulRetries++;
        // Update average retry count
        this.metrics.averageRetryCount =
            (this.metrics.averageRetryCount * (this.metrics.totalRetries - 1) + attempts) / this.metrics.totalRetries;
        // Update average success delay
        this.metrics.averageSuccessDelay =
            (this.metrics.averageSuccessDelay * (this.metrics.successfulRetries - 1) + totalTime) / this.metrics.successfulRetries;
        // Update success rate
        this.metrics.retrySuccessRate = this.metrics.successfulRetries / this.metrics.totalRetries;
    }
    updateFailureMetrics(error, totalTime) {
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
    getRetryState() {
        return this.currentState ? { ...this.currentState } : null;
    }
    abort() {
        if (this.abortController) {
            this.abortController.abort();
            this.events.onRetryAborted?.('Manual abort requested');
        }
        if (this.currentState) {
            this.currentState.canRetry = false;
            this.currentState.isRetrying = false;
        }
    }
    reset() {
        this.abort();
        this.currentState = null;
        this.abortController = null;
    }
    getMetrics() {
        return { ...this.metrics };
    }
    setDefaultConfig(config) {
        this.defaultConfig = { ...this.defaultConfig, ...config };
    }
    getDefaultConfig() {
        return { ...this.defaultConfig };
    }
    // Utility methods for common retry scenarios
    static exponentialBackoff(maxAttempts = 3) {
        return {
            maxAttempts,
            initialDelay: 1000,
            backoffMultiplier: 2,
            jitterType: 'equal',
            jitterAmount: 0.1
        };
    }
    static linearBackoff(maxAttempts = 3, delay = 1000) {
        return {
            maxAttempts,
            initialDelay: delay,
            backoffMultiplier: 1,
            jitterType: 'equal',
            jitterAmount: 0.1
        };
    }
    static fixedDelay(maxAttempts = 3, delay = 1000) {
        return {
            maxAttempts,
            initialDelay: delay,
            backoffMultiplier: 1,
            jitterType: 'none',
            jitterAmount: 0
        };
    }
    static immediateRetry(maxAttempts = 3) {
        return {
            maxAttempts,
            initialDelay: 0,
            backoffMultiplier: 1,
            jitterType: 'none',
            jitterAmount: 0
        };
    }
    static networkRetry() {
        return {
            maxAttempts: 5,
            initialDelay: 500,
            maxDelay: 10000,
            backoffMultiplier: 1.5,
            jitterType: 'decorrelated',
            jitterAmount: 0.2,
            retryCondition: (error) => error.type === 'network' ||
                error.type === 'timeout' ||
                error.recoverability === 'transient'
        };
    }
    static authRetry() {
        return {
            maxAttempts: 2,
            initialDelay: 1000,
            backoffMultiplier: 2,
            jitterType: 'none',
            retryCondition: (error) => error.type === 'authentication' &&
                error.recoverability === 'recoverable'
        };
    }
    static rateLimitRetry() {
        return {
            maxAttempts: 4,
            initialDelay: 5000,
            maxDelay: 60000,
            backoffMultiplier: 2,
            jitterType: 'full',
            retryCondition: (error) => error.type === 'rate_limit'
        };
    }
    resetMetrics() {
        this.metrics = {
            totalRetries: 0,
            successfulRetries: 0,
            failedRetries: 0,
            averageRetryCount: 0,
            averageSuccessDelay: 0,
            retrySuccessRate: 0,
            errorTypeBreakdown: {}
        };
    }
    isRetrying() {
        return this.currentState?.isRetrying ?? false;
    }
    getCurrentAttempt() {
        return this.currentState?.attempt ?? 0;
    }
    getNextRetryDelay() {
        return this.currentState?.nextRetryDelay ?? 0;
    }
    getTotalDelay() {
        return this.currentState?.totalDelay ?? 0;
    }
    getRetryHistory() {
        return this.currentState?.errors ? [...this.currentState.errors] : [];
    }
}
//# sourceMappingURL=RetryManager.js.map