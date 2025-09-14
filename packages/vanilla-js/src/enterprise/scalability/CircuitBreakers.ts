interface CircuitBreakerConfig {
    name: string;
    failureThreshold: number; // number of consecutive failures before opening
    recoveryTimeout: number; // milliseconds to wait before trying again
    successThreshold: number; // number of consecutive successes to close circuit
    timeout: number; // request timeout in milliseconds
    monitoringPeriod: number; // time window for monitoring failures
    volumeThreshold: number; // minimum requests before circuit can trip
    errorThreshold: number; // percentage of errors to trip circuit (0-100)
    slowCallThreshold: number; // milliseconds - calls slower than this count as failures
    maxRetries: number;
    retryDelay: number; // milliseconds between retries
    fallback?: {
        enabled: boolean;
        strategy: 'static' | 'cache' | 'degraded' | 'custom';
        value?: any;
        ttl?: number;
    };
    notifications: {
        onOpen?: (circuitName: string) => void;
        onHalfOpen?: (circuitName: string) => void;
        onClose?: (circuitName: string) => void;
    };
}

interface CircuitBreakerState {
    name: string;
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failures: number;
    successes: number;
    requests: number;
    lastFailureTime: Date | null;
    lastSuccessTime: Date | null;
    nextAttemptTime: Date | null;
    stateChangeTime: Date;
    totalRequests: number;
    totalFailures: number;
    totalSuccesses: number;
    averageResponseTime: number;
    metrics: CircuitBreakerMetrics;
}

interface CircuitBreakerMetrics {
    requestCount: number;
    errorCount: number;
    successCount: number;
    timeoutCount: number;
    slowCallCount: number;
    averageResponseTime: number;
    percentile95ResponseTime: number;
    percentile99ResponseTime: number;
    errorRate: number;
    throughput: number;
    uptime: number;
    responseTimes: number[];
    lastResetTime: Date;
}

interface CircuitBreakerCall {
    id: string;
    circuitName: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    success: boolean;
    error?: string;
    fromCache?: boolean;
    retryAttempt?: number;
}

interface FallbackCache {
    key: string;
    value: any;
    expiresAt: Date;
    hitCount: number;
    createdAt: Date;
}

type CircuitBreakerFunction<T> = () => Promise<T>;
type FallbackFunction<T> = (error?: Error) => Promise<T> | T;

export class CircuitBreaker {
    private config: CircuitBreakerConfig;
    private state: CircuitBreakerState;
    private callHistory: CircuitBreakerCall[] = [];
    private fallbackCache = new Map<string, FallbackCache>();
    private stateChangeCallbacks: ((state: CircuitBreakerState) => void)[] = [];

    constructor(config: CircuitBreakerConfig) {
        this.config = config;
        this.state = this.initializeState();
    }

    private initializeState(): CircuitBreakerState {
        return {
            name: this.config.name,
            state: 'CLOSED',
            failures: 0,
            successes: 0,
            requests: 0,
            lastFailureTime: null,
            lastSuccessTime: null,
            nextAttemptTime: null,
            stateChangeTime: new Date(),
            totalRequests: 0,
            totalFailures: 0,
            totalSuccesses: 0,
            averageResponseTime: 0,
            metrics: {
                requestCount: 0,
                errorCount: 0,
                successCount: 0,
                timeoutCount: 0,
                slowCallCount: 0,
                averageResponseTime: 0,
                percentile95ResponseTime: 0,
                percentile99ResponseTime: 0,
                errorRate: 0,
                throughput: 0,
                uptime: 100,
                responseTimes: [],
                lastResetTime: new Date()
            }
        };
    }

    async call<T>(fn: CircuitBreakerFunction<T>, fallback?: FallbackFunction<T>): Promise<T> {
        const callId = this.generateCallId();
        const call: CircuitBreakerCall = {
            id: callId,
            circuitName: this.config.name,
            startTime: new Date(),
            success: false
        };

        this.callHistory.push(call);
        this.state.requests++;
        this.state.totalRequests++;

        try {
            // Check circuit state
            if (this.state.state === 'OPEN') {
                if (this.shouldAttemptReset()) {
                    this.transitionTo('HALF_OPEN');
                } else {
                    throw new Error(`Circuit breaker is OPEN for ${this.config.name}`);
                }
            }

            // Execute the function with timeout and retry logic
            const result = await this.executeWithRetry(fn, call);

            this.onSuccess(call);
            return result;

        } catch (error) {
            this.onFailure(call, error as Error);

            // Try fallback if available
            if (fallback) {
                try {
                    const fallbackResult = await this.executeFallback(fallback, error as Error, call);
                    return fallbackResult;
                } catch (fallbackError) {
                    throw error; // Return original error if fallback also fails
                }
            }

            throw error;
        } finally {
            call.endTime = new Date();
            call.duration = call.endTime.getTime() - call.startTime.getTime();
            this.updateMetrics(call);
        }
    }

    private async executeWithRetry<T>(fn: CircuitBreakerFunction<T>, call: CircuitBreakerCall): Promise<T> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
                    call.retryAttempt = attempt;
                }

                const result = await this.executeWithTimeout(fn);
                return result;

            } catch (error) {
                lastError = error as Error;

                // Don't retry if circuit is open or for certain error types
                if (this.state.state === 'OPEN' || !this.shouldRetry(error as Error)) {
                    break;
                }
            }
        }

        throw lastError;
    }

    private async executeWithTimeout<T>(fn: CircuitBreakerFunction<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Request timeout after ${this.config.timeout}ms`));
            }, this.config.timeout);

            fn()
                .then(result => {
                    clearTimeout(timeoutId);
                    resolve(result);
                })
                .catch(error => {
                    clearTimeout(timeoutId);
                    reject(error);
                });
        });
    }

    private shouldRetry(error: Error): boolean {
        // Don't retry for certain error types
        const nonRetryableErrors = ['AuthenticationError', 'ValidationError', 'NotFoundError'];
        return !nonRetryableErrors.some(errorType => error.name.includes(errorType));
    }

    private async executeFallback<T>(fallback: FallbackFunction<T>, error: Error, call: CircuitBreakerCall): Promise<T> {
        if (!this.config.fallback?.enabled) {
            throw error;
        }

        const strategy = this.config.fallback.strategy;

        switch (strategy) {
            case 'static':
                return this.config.fallback.value as T;

            case 'cache':
                const cached = this.getFallbackFromCache(call);
                if (cached) {
                    call.fromCache = true;
                    return cached;
                }
                throw new Error('No cached fallback available');

            case 'degraded':
                return this.getDegradedResponse(call) as T;

            case 'custom':
                return await fallback(error);

            default:
                throw error;
        }
    }

    private getFallbackFromCache(call: CircuitBreakerCall): any {
        const cacheKey = `${this.config.name}_fallback`;
        const cached = this.fallbackCache.get(cacheKey);

        if (cached && cached.expiresAt > new Date()) {
            cached.hitCount++;
            return cached.value;
        }

        return null;
    }

    private getDegradedResponse(call: CircuitBreakerCall): any {
        // Return a degraded response based on circuit breaker type
        if (this.config.name.includes('search')) {
            return { results: [], degraded: true, message: 'Service temporarily unavailable' };
        }

        return { success: false, degraded: true, message: 'Service temporarily unavailable' };
    }

    private onSuccess(call: CircuitBreakerCall): void {
        call.success = true;
        this.state.successes++;
        this.state.totalSuccesses++;
        this.state.lastSuccessTime = new Date();

        if (this.state.state === 'HALF_OPEN') {
            if (this.state.successes >= this.config.successThreshold) {
                this.transitionTo('CLOSED');
            }
        } else if (this.state.state === 'CLOSED') {
            this.state.failures = 0; // Reset failure count on success
        }

        // Cache successful response for fallback
        if (this.config.fallback?.enabled && this.config.fallback.strategy === 'cache') {
            this.cacheSuccessfulResponse(call);
        }
    }

    private onFailure(call: CircuitBreakerCall, error: Error): void {
        call.success = false;
        call.error = error.message;

        this.state.failures++;
        this.state.totalFailures++;
        this.state.lastFailureTime = new Date();

        // Check if we should open the circuit
        if (this.shouldOpenCircuit()) {
            this.transitionTo('OPEN');
        }
    }

    private shouldOpenCircuit(): boolean {
        // Check if we have enough volume to make a decision
        if (this.state.requests < this.config.volumeThreshold) {
            return false;
        }

        // Check failure threshold
        if (this.state.failures >= this.config.failureThreshold) {
            return true;
        }

        // Check error rate threshold
        const errorRate = (this.state.failures / this.state.requests) * 100;
        if (errorRate >= this.config.errorThreshold) {
            return true;
        }

        return false;
    }

    private shouldAttemptReset(): boolean {
        if (!this.state.nextAttemptTime) {
            return false;
        }

        return new Date() >= this.state.nextAttemptTime;
    }

    private transitionTo(newState: 'CLOSED' | 'OPEN' | 'HALF_OPEN'): void {
        const previousState = this.state.state;
        this.state.state = newState;
        this.state.stateChangeTime = new Date();

        switch (newState) {
            case 'OPEN':
                this.state.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeout);
                this.config.notifications.onOpen?.(this.config.name);
                break;

            case 'HALF_OPEN':
                this.state.failures = 0;
                this.state.successes = 0;
                this.config.notifications.onHalfOpen?.(this.config.name);
                break;

            case 'CLOSED':
                this.state.failures = 0;
                this.state.successes = 0;
                this.state.requests = 0;
                this.state.nextAttemptTime = null;
                this.config.notifications.onClose?.(this.config.name);
                break;
        }

        console.log(`Circuit breaker ${this.config.name}: ${previousState} -> ${newState}`);

        // Notify state change callbacks
        this.stateChangeCallbacks.forEach(callback => {
            try {
                callback(this.state);
            } catch (error) {
                console.error('Error in state change callback:', error);
            }
        });
    }

    private cacheSuccessfulResponse(call: CircuitBreakerCall): void {
        if (this.config.fallback?.ttl) {
            const cacheKey = `${this.config.name}_fallback`;
            const cache: FallbackCache = {
                key: cacheKey,
                value: { success: true, timestamp: new Date() },
                expiresAt: new Date(Date.now() + this.config.fallback.ttl),
                hitCount: 0,
                createdAt: new Date()
            };

            this.fallbackCache.set(cacheKey, cache);
        }
    }

    private updateMetrics(call: CircuitBreakerCall): void {
        const metrics = this.state.metrics;
        const duration = call.duration || 0;

        metrics.requestCount++;

        if (call.success) {
            metrics.successCount++;
        } else {
            metrics.errorCount++;

            if (call.error?.includes('timeout')) {
                metrics.timeoutCount++;
            }
        }

        // Check for slow calls
        if (duration > this.config.slowCallThreshold) {
            metrics.slowCallCount++;
        }

        // Update response times
        metrics.responseTimes.push(duration);

        // Keep only recent response times (last 100 calls)
        if (metrics.responseTimes.length > 100) {
            metrics.responseTimes = metrics.responseTimes.slice(-100);
        }

        // Calculate statistics
        const responseTimes = metrics.responseTimes.sort((a, b) => a - b);
        metrics.averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;

        if (responseTimes.length > 0) {
            const p95Index = Math.floor(responseTimes.length * 0.95);
            const p99Index = Math.floor(responseTimes.length * 0.99);
            metrics.percentile95ResponseTime = responseTimes[p95Index] || 0;
            metrics.percentile99ResponseTime = responseTimes[p99Index] || 0;
        }

        metrics.errorRate = metrics.requestCount > 0 ? (metrics.errorCount / metrics.requestCount) * 100 : 0;

        // Calculate throughput (requests per second)
        const timeSinceReset = (Date.now() - metrics.lastResetTime.getTime()) / 1000;
        metrics.throughput = timeSinceReset > 0 ? metrics.requestCount / timeSinceReset : 0;

        // Calculate uptime (percentage of time circuit was closed)
        const totalTime = Date.now() - this.state.stateChangeTime.getTime();
        const openTime = this.state.state === 'OPEN' ? totalTime : 0;
        metrics.uptime = totalTime > 0 ? ((totalTime - openTime) / totalTime) * 100 : 100;

        // Update state average
        this.state.averageResponseTime = metrics.averageResponseTime;
    }

    private generateCallId(): string {
        return Array.from(crypto.getRandomValues(new Uint8Array(8)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    // Public methods
    getState(): CircuitBreakerState {
        return { ...this.state };
    }

    getMetrics(): CircuitBreakerMetrics {
        return { ...this.state.metrics };
    }

    getCallHistory(limit = 100): CircuitBreakerCall[] {
        return this.callHistory
            .slice(-limit)
            .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    }

    reset(): void {
        this.transitionTo('CLOSED');
        this.state = this.initializeState();
        this.callHistory = [];
        this.fallbackCache.clear();

        console.log(`Circuit breaker ${this.config.name} has been reset`);
    }

    forceOpen(): void {
        this.transitionTo('OPEN');
        console.log(`Circuit breaker ${this.config.name} has been forced open`);
    }

    forceClose(): void {
        this.transitionTo('CLOSED');
        console.log(`Circuit breaker ${this.config.name} has been forced closed`);
    }

    isOpen(): boolean {
        return this.state.state === 'OPEN';
    }

    isClosed(): boolean {
        return this.state.state === 'CLOSED';
    }

    isHalfOpen(): boolean {
        return this.state.state === 'HALF_OPEN';
    }

    onStateChange(callback: (state: CircuitBreakerState) => void): void {
        this.stateChangeCallbacks.push(callback);
    }

    updateConfig(newConfig: Partial<CircuitBreakerConfig>): void {
        this.config = { ...this.config, ...newConfig };
        console.log(`Circuit breaker ${this.config.name} configuration updated`);
    }

    clearCache(): void {
        this.fallbackCache.clear();
        console.log(`Circuit breaker ${this.config.name} cache cleared`);
    }

    getCacheStats(): { size: number; items: Array<{ key: string; hitCount: number; expiresAt: Date }> } {
        return {
            size: this.fallbackCache.size,
            items: Array.from(this.fallbackCache.values()).map(cache => ({
                key: cache.key,
                hitCount: cache.hitCount,
                expiresAt: cache.expiresAt
            }))
        };
    }
}

export class CircuitBreakerManager {
    private circuitBreakers = new Map<string, CircuitBreaker>();
    private globalMetrics = {
        totalCircuits: 0,
        openCircuits: 0,
        halfOpenCircuits: 0,
        closedCircuits: 0,
        totalRequests: 0,
        totalFailures: 0,
        averageErrorRate: 0
    };

    createCircuitBreaker(config: CircuitBreakerConfig): CircuitBreaker {
        const circuitBreaker = new CircuitBreaker(config);

        // Add global monitoring
        circuitBreaker.onStateChange((state) => {
            this.updateGlobalMetrics();
        });

        this.circuitBreakers.set(config.name, circuitBreaker);
        this.updateGlobalMetrics();

        console.log(`Circuit breaker created: ${config.name}`);
        return circuitBreaker;
    }

    getCircuitBreaker(name: string): CircuitBreaker | undefined {
        return this.circuitBreakers.get(name);
    }

    getAllCircuitBreakers(): Map<string, CircuitBreaker> {
        return new Map(this.circuitBreakers);
    }

    removeCircuitBreaker(name: string): boolean {
        const removed = this.circuitBreakers.delete(name);
        if (removed) {
            this.updateGlobalMetrics();
            console.log(`Circuit breaker removed: ${name}`);
        }
        return removed;
    }

    resetAll(): void {
        this.circuitBreakers.forEach(cb => cb.reset());
        console.log('All circuit breakers have been reset');
    }

    forceOpenAll(): void {
        this.circuitBreakers.forEach(cb => cb.forceOpen());
        console.log('All circuit breakers have been forced open');
    }

    forceCloseAll(): void {
        this.circuitBreakers.forEach(cb => cb.forceClose());
        console.log('All circuit breakers have been forced closed');
    }

    private updateGlobalMetrics(): void {
        const states = Array.from(this.circuitBreakers.values()).map(cb => cb.getState());

        this.globalMetrics.totalCircuits = states.length;
        this.globalMetrics.openCircuits = states.filter(s => s.state === 'OPEN').length;
        this.globalMetrics.halfOpenCircuits = states.filter(s => s.state === 'HALF_OPEN').length;
        this.globalMetrics.closedCircuits = states.filter(s => s.state === 'CLOSED').length;

        this.globalMetrics.totalRequests = states.reduce((sum, s) => sum + s.totalRequests, 0);
        this.globalMetrics.totalFailures = states.reduce((sum, s) => sum + s.totalFailures, 0);

        this.globalMetrics.averageErrorRate = this.globalMetrics.totalRequests > 0
            ? (this.globalMetrics.totalFailures / this.globalMetrics.totalRequests) * 100
            : 0;
    }

    getGlobalMetrics(): typeof this.globalMetrics {
        return { ...this.globalMetrics };
    }

    getHealthReport(): {
        healthy: number;
        degraded: number;
        failed: number;
        total: number;
        details: Array<{ name: string; state: string; errorRate: number; uptime: number }>;
    } {
        const details: Array<{ name: string; state: string; errorRate: number; uptime: number }> = [];
        let healthy = 0;
        let degraded = 0;
        let failed = 0;

        this.circuitBreakers.forEach((cb, name) => {
            const state = cb.getState();
            const metrics = cb.getMetrics();

            details.push({
                name,
                state: state.state,
                errorRate: metrics.errorRate,
                uptime: metrics.uptime
            });

            if (state.state === 'CLOSED' && metrics.errorRate < 5) {
                healthy++;
            } else if (state.state === 'HALF_OPEN' || (state.state === 'CLOSED' && metrics.errorRate >= 5)) {
                degraded++;
            } else {
                failed++;
            }
        });

        return {
            healthy,
            degraded,
            failed,
            total: this.circuitBreakers.size,
            details
        };
    }

    // Factory methods for common circuit breaker patterns
    static createDatabaseCircuitBreaker(name: string, timeout = 5000): CircuitBreaker {
        const config: CircuitBreakerConfig = {
            name: `db-${name}`,
            failureThreshold: 5,
            recoveryTimeout: 30000,
            successThreshold: 3,
            timeout,
            monitoringPeriod: 60000,
            volumeThreshold: 10,
            errorThreshold: 50,
            slowCallThreshold: timeout * 0.8,
            maxRetries: 2,
            retryDelay: 1000,
            fallback: {
                enabled: true,
                strategy: 'cache',
                ttl: 300000 // 5 minutes
            },
            notifications: {
                onOpen: (name) => console.warn(`Database circuit breaker opened: ${name}`),
                onClose: (name) => console.info(`Database circuit breaker closed: ${name}`)
            }
        };

        return new CircuitBreaker(config);
    }

    static createAPICircuitBreaker(name: string, timeout = 3000): CircuitBreaker {
        const config: CircuitBreakerConfig = {
            name: `api-${name}`,
            failureThreshold: 3,
            recoveryTimeout: 15000,
            successThreshold: 2,
            timeout,
            monitoringPeriod: 30000,
            volumeThreshold: 5,
            errorThreshold: 30,
            slowCallThreshold: timeout * 0.7,
            maxRetries: 1,
            retryDelay: 500,
            fallback: {
                enabled: true,
                strategy: 'degraded'
            },
            notifications: {
                onOpen: (name) => console.warn(`API circuit breaker opened: ${name}`),
                onClose: (name) => console.info(`API circuit breaker closed: ${name}`)
            }
        };

        return new CircuitBreaker(config);
    }

    static createSearchCircuitBreaker(name: string, timeout = 2000): CircuitBreaker {
        const config: CircuitBreakerConfig = {
            name: `search-${name}`,
            failureThreshold: 3,
            recoveryTimeout: 10000,
            successThreshold: 2,
            timeout,
            monitoringPeriod: 30000,
            volumeThreshold: 10,
            errorThreshold: 25,
            slowCallThreshold: timeout * 0.8,
            maxRetries: 1,
            retryDelay: 200,
            fallback: {
                enabled: true,
                strategy: 'cache',
                ttl: 600000 // 10 minutes
            },
            notifications: {
                onOpen: (name) => console.warn(`Search circuit breaker opened: ${name}`),
                onClose: (name) => console.info(`Search circuit breaker closed: ${name}`)
            }
        };

        return new CircuitBreaker(config);
    }
}