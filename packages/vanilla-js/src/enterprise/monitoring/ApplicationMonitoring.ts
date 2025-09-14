interface PerformanceMetrics {
    timestamp: Date;
    responseTime: number;
    throughput: number;
    errorRate: number;
    cpuUsage?: number;
    memoryUsage?: number;
    activeConnections?: number;
    queueLength?: number;
}

interface ErrorEvent {
    id: string;
    timestamp: Date;
    type: string;
    message: string;
    stack?: string;
    userAgent?: string;
    url?: string;
    userId?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    tags: string[];
    context: Record<string, any>;
}

interface HealthCheck {
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    details: Record<string, any>;
    timestamp: Date;
}

interface MonitoringConfig {
    metrics: {
        interval: number; // milliseconds
        retention: number; // days
        aggregation: 'avg' | 'sum' | 'max' | 'min' | 'p95' | 'p99';
    };
    alerts: {
        responseTimeThreshold: number;
        errorRateThreshold: number;
        cpuThreshold: number;
        memoryThreshold: number;
    };
    healthChecks: {
        interval: number;
        timeout: number;
        endpoints: string[];
    };
    errorTracking: {
        sampleRate: number;
        maxStackDepth: number;
        ignorePatterns: string[];
    };
}

export class ApplicationMonitoring {
    private config: MonitoringConfig;
    private metrics: PerformanceMetrics[] = [];
    private errors: ErrorEvent[] = [];
    private healthChecks: HealthCheck[] = [];
    private metricsInterval: number | null = null;
    private healthCheckInterval: number | null = null;
    private observers: PerformanceObserver[] = [];

    constructor(config: MonitoringConfig) {
        this.config = config;
        this.initializeMonitoring();
    }

    private initializeMonitoring(): void {
        this.setupPerformanceTracking();
        this.setupErrorTracking();
        this.setupHealthChecks();
        this.setupWebVitals();
        this.startMetricsCollection();
    }

    private setupPerformanceTracking(): void {
        if (typeof PerformanceObserver !== 'undefined') {
            // Navigation timing
            const navObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'navigation') {
                        const navEntry = entry as PerformanceNavigationTiming;
                        this.recordMetric({
                            timestamp: new Date(),
                            responseTime: navEntry.loadEventEnd - navEntry.navigationStart,
                            throughput: 1,
                            errorRate: 0
                        });
                    }
                }
            });

            navObserver.observe({ entryTypes: ['navigation'] });
            this.observers.push(navObserver);

            // Resource timing
            const resourceObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'resource') {
                        const resourceEntry = entry as PerformanceResourceTiming;
                        this.recordResourceMetric(resourceEntry);
                    }
                }
            });

            resourceObserver.observe({ entryTypes: ['resource'] });
            this.observers.push(resourceObserver);

            // Measure timing
            const measureObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'measure') {
                        this.recordCustomMetric(entry.name, entry.duration);
                    }
                }
            });

            measureObserver.observe({ entryTypes: ['measure'] });
            this.observers.push(measureObserver);
        }
    }

    private setupErrorTracking(): void {
        if (typeof window !== 'undefined') {
            window.addEventListener('error', (event) => {
                this.recordError({
                    type: 'javascript_error',
                    message: event.message,
                    stack: event.error?.stack,
                    url: event.filename,
                    severity: 'high',
                    tags: ['unhandled'],
                    context: {
                        line: event.lineno,
                        column: event.colno
                    }
                });
            });

            window.addEventListener('unhandledrejection', (event) => {
                this.recordError({
                    type: 'unhandled_promise_rejection',
                    message: event.reason?.message || String(event.reason),
                    stack: event.reason?.stack,
                    severity: 'high',
                    tags: ['promise', 'unhandled'],
                    context: {
                        reason: event.reason
                    }
                });
            });
        }
    }

    private setupHealthChecks(): void {
        this.healthCheckInterval = setInterval(async () => {
            await this.performHealthChecks();
        }, this.config.healthChecks.interval);
    }

    private setupWebVitals(): void {
        if (typeof PerformanceObserver !== 'undefined') {
            // Largest Contentful Paint (LCP)
            const lcpObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    const lcpEntry = entry as any; // LCP entry type
                    this.recordWebVital('LCP', lcpEntry.startTime);
                }
            });

            try {
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
                this.observers.push(lcpObserver);
            } catch (e) {
                // LCP not supported in this browser
            }

            // First Input Delay (FID)
            const fidObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    const fidEntry = entry as any; // FID entry type
                    this.recordWebVital('FID', fidEntry.processingStart - fidEntry.startTime);
                }
            });

            try {
                fidObserver.observe({ entryTypes: ['first-input'] });
                this.observers.push(fidObserver);
            } catch (e) {
                // FID not supported in this browser
            }

            // Cumulative Layout Shift (CLS)
            let clsValue = 0;
            let clsEntries: any[] = [];

            const clsObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (!(entry as any).hadRecentInput) {
                        clsValue += (entry as any).value;
                        clsEntries.push(entry);
                    }
                }
            });

            try {
                clsObserver.observe({ entryTypes: ['layout-shift'] });
                this.observers.push(clsObserver);

                // Report CLS when the page lifecycle changes to hidden
                if (typeof document !== 'undefined') {
                    document.addEventListener('visibilitychange', () => {
                        if (document.visibilityState === 'hidden') {
                            this.recordWebVital('CLS', clsValue);
                        }
                    });
                }
            } catch (e) {
                // CLS not supported in this browser
            }
        }
    }

    private startMetricsCollection(): void {
        this.metricsInterval = setInterval(() => {
            this.collectSystemMetrics();
        }, this.config.metrics.interval);
    }

    private collectSystemMetrics(): void {
        const now = new Date();
        let cpuUsage: number | undefined;
        let memoryUsage: number | undefined;

        // Memory usage
        if (typeof performance !== 'undefined' && 'memory' in performance) {
            const memory = (performance as any).memory;
            memoryUsage = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;
        }

        // Calculate throughput and error rate from recent activity
        const recentWindow = 60000; // 1 minute
        const recentMetrics = this.metrics.filter(m =>
            now.getTime() - m.timestamp.getTime() < recentWindow
        );

        const throughput = recentMetrics.length > 0
            ? recentMetrics.reduce((sum, m) => sum + m.throughput, 0) / recentMetrics.length
            : 0;

        const recentErrors = this.errors.filter(e =>
            now.getTime() - e.timestamp.getTime() < recentWindow
        );

        const errorRate = recentErrors.length / Math.max(throughput, 1) * 100;

        const metrics: PerformanceMetrics = {
            timestamp: now,
            responseTime: this.getAverageResponseTime(),
            throughput,
            errorRate,
            cpuUsage,
            memoryUsage
        };

        this.recordMetric(metrics);
    }

    private getAverageResponseTime(): number {
        const recentMetrics = this.metrics.slice(-10);
        if (recentMetrics.length === 0) return 0;

        return recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length;
    }

    recordMetric(metrics: PerformanceMetrics): void {
        this.metrics.push(metrics);
        this.enforceRetention();
        this.checkAlerts(metrics);
    }

    private recordResourceMetric(entry: PerformanceResourceTiming): void {
        const responseTime = entry.responseEnd - entry.requestStart;

        this.recordMetric({
            timestamp: new Date(),
            responseTime,
            throughput: 1,
            errorRate: entry.name.includes('error') ? 100 : 0
        });
    }

    recordCustomMetric(name: string, value: number, tags?: string[]): void {
        const metrics: PerformanceMetrics = {
            timestamp: new Date(),
            responseTime: value,
            throughput: 1,
            errorRate: 0
        };

        this.recordMetric(metrics);
    }

    private recordWebVital(name: string, value: number): void {
        this.recordCustomMetric(`web_vital_${name.toLowerCase()}`, value, ['web-vital', name.toLowerCase()]);
    }

    recordError(error: Omit<ErrorEvent, 'id' | 'timestamp'>): void {
        if (this.shouldIgnoreError(error.message)) {
            return;
        }

        if (Math.random() > this.config.errorTracking.sampleRate) {
            return;
        }

        const errorEvent: ErrorEvent = {
            ...error,
            id: this.generateErrorId(),
            timestamp: new Date()
        };

        this.errors.push(errorEvent);
        this.enforceErrorRetention();

        if (error.severity === 'critical') {
            this.escalateError(errorEvent);
        }
    }

    private shouldIgnoreError(message: string): boolean {
        return this.config.errorTracking.ignorePatterns.some(pattern =>
            message.toLowerCase().includes(pattern.toLowerCase())
        );
    }

    private generateErrorId(): string {
        return Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    private escalateError(error: ErrorEvent): void {
        console.error('Critical error detected:', error);

        if (typeof window !== 'undefined' && 'navigator' in window && 'sendBeacon' in navigator) {
            navigator.sendBeacon('/api/monitoring/critical-errors', JSON.stringify(error));
        }
    }

    private async performHealthChecks(): Promise<void> {
        const healthChecks: HealthCheck[] = [];

        for (const endpoint of this.config.healthChecks.endpoints) {
            const startTime = performance.now();

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.config.healthChecks.timeout);

                const response = await fetch(endpoint, {
                    signal: controller.signal,
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                clearTimeout(timeoutId);
                const responseTime = performance.now() - startTime;

                const healthCheck: HealthCheck = {
                    name: endpoint,
                    status: response.ok ? 'healthy' : 'unhealthy',
                    responseTime,
                    details: {
                        statusCode: response.status,
                        headers: Object.fromEntries(response.headers.entries())
                    },
                    timestamp: new Date()
                };

                if (response.ok) {
                    try {
                        const body = await response.json();
                        healthCheck.details.body = body;
                    } catch (e) {
                        // Response might not be JSON
                    }
                }

                healthChecks.push(healthCheck);
            } catch (error) {
                const responseTime = performance.now() - startTime;

                healthChecks.push({
                    name: endpoint,
                    status: 'unhealthy',
                    responseTime,
                    details: {
                        error: error instanceof Error ? error.message : String(error)
                    },
                    timestamp: new Date()
                });
            }
        }

        this.healthChecks.push(...healthChecks);
        this.enforceHealthCheckRetention();
    }

    private checkAlerts(metrics: PerformanceMetrics): void {
        const alerts: string[] = [];

        if (metrics.responseTime > this.config.alerts.responseTimeThreshold) {
            alerts.push(`High response time: ${metrics.responseTime.toFixed(2)}ms`);
        }

        if (metrics.errorRate > this.config.alerts.errorRateThreshold) {
            alerts.push(`High error rate: ${metrics.errorRate.toFixed(2)}%`);
        }

        if (metrics.cpuUsage && metrics.cpuUsage > this.config.alerts.cpuThreshold) {
            alerts.push(`High CPU usage: ${metrics.cpuUsage.toFixed(2)}%`);
        }

        if (metrics.memoryUsage && metrics.memoryUsage > this.config.alerts.memoryThreshold) {
            alerts.push(`High memory usage: ${metrics.memoryUsage.toFixed(2)}%`);
        }

        if (alerts.length > 0) {
            this.triggerAlert(alerts, metrics);
        }
    }

    private triggerAlert(alerts: string[], metrics: PerformanceMetrics): void {
        const alertData = {
            timestamp: new Date().toISOString(),
            alerts,
            metrics,
            severity: 'warning'
        };

        console.warn('Performance alert triggered:', alertData);

        if (typeof window !== 'undefined' && 'navigator' in window && 'sendBeacon' in navigator) {
            navigator.sendBeacon('/api/monitoring/alerts', JSON.stringify(alertData));
        }
    }

    private enforceRetention(): void {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.config.metrics.retention);

        this.metrics = this.metrics.filter(m => m.timestamp > cutoffDate);
    }

    private enforceErrorRetention(): void {
        const maxErrors = 10000;
        if (this.errors.length > maxErrors) {
            this.errors = this.errors.slice(-maxErrors);
        }
    }

    private enforceHealthCheckRetention(): void {
        const maxHealthChecks = 1000;
        if (this.healthChecks.length > maxHealthChecks) {
            this.healthChecks = this.healthChecks.slice(-maxHealthChecks);
        }
    }

    getMetrics(startDate?: Date, endDate?: Date): PerformanceMetrics[] {
        let filtered = this.metrics;

        if (startDate) {
            filtered = filtered.filter(m => m.timestamp >= startDate);
        }

        if (endDate) {
            filtered = filtered.filter(m => m.timestamp <= endDate);
        }

        return filtered;
    }

    getErrors(startDate?: Date, endDate?: Date, severity?: ErrorEvent['severity']): ErrorEvent[] {
        let filtered = this.errors;

        if (startDate) {
            filtered = filtered.filter(e => e.timestamp >= startDate);
        }

        if (endDate) {
            filtered = filtered.filter(e => e.timestamp <= endDate);
        }

        if (severity) {
            filtered = filtered.filter(e => e.severity === severity);
        }

        return filtered;
    }

    getHealthStatus(): {
        overall: 'healthy' | 'degraded' | 'unhealthy';
        endpoints: HealthCheck[];
        lastCheck: Date | null;
    } {
        if (this.healthChecks.length === 0) {
            return {
                overall: 'unhealthy',
                endpoints: [],
                lastCheck: null
            };
        }

        const recentChecks = this.healthChecks.filter(hc => {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            return hc.timestamp > fiveMinutesAgo;
        });

        if (recentChecks.length === 0) {
            return {
                overall: 'unhealthy',
                endpoints: [],
                lastCheck: null
            };
        }

        const healthyCount = recentChecks.filter(hc => hc.status === 'healthy').length;
        const totalCount = recentChecks.length;

        let overall: 'healthy' | 'degraded' | 'unhealthy';
        if (healthyCount === totalCount) {
            overall = 'healthy';
        } else if (healthyCount >= totalCount * 0.5) {
            overall = 'degraded';
        } else {
            overall = 'unhealthy';
        }

        return {
            overall,
            endpoints: recentChecks,
            lastCheck: recentChecks.reduce((latest, hc) =>
                hc.timestamp > latest ? hc.timestamp : latest,
                recentChecks[0].timestamp
            )
        };
    }

    generateReport(startDate: Date, endDate: Date): {
        summary: {
            totalRequests: number;
            averageResponseTime: number;
            errorRate: number;
            uptime: number;
        };
        metrics: PerformanceMetrics[];
        errors: ErrorEvent[];
        healthChecks: HealthCheck[];
        webVitals: Record<string, number>;
    } {
        const metrics = this.getMetrics(startDate, endDate);
        const errors = this.getErrors(startDate, endDate);
        const healthChecks = this.healthChecks.filter(hc =>
            hc.timestamp >= startDate && hc.timestamp <= endDate
        );

        const totalRequests = metrics.reduce((sum, m) => sum + m.throughput, 0);
        const averageResponseTime = metrics.length > 0
            ? metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length
            : 0;

        const errorRate = totalRequests > 0 ? (errors.length / totalRequests) * 100 : 0;

        const healthyChecks = healthChecks.filter(hc => hc.status === 'healthy').length;
        const uptime = healthChecks.length > 0 ? (healthyChecks / healthChecks.length) * 100 : 0;

        // Extract Web Vitals from metrics
        const webVitals: Record<string, number> = {};
        metrics.forEach(metric => {
            // This would be enhanced based on how web vitals are stored
            // For now, we'll calculate some basic vitals
        });

        return {
            summary: {
                totalRequests,
                averageResponseTime,
                errorRate,
                uptime
            },
            metrics,
            errors,
            healthChecks,
            webVitals
        };
    }

    startTransaction(name: string): string {
        const transactionId = this.generateErrorId();
        const startTime = performance.now();

        performance.mark(`transaction_${transactionId}_start`);

        return transactionId;
    }

    endTransaction(transactionId: string, success = true, metadata?: Record<string, any>): void {
        const endTime = performance.now();
        performance.mark(`transaction_${transactionId}_end`);

        performance.measure(
            `transaction_${transactionId}`,
            `transaction_${transactionId}_start`,
            `transaction_${transactionId}_end`
        );

        if (!success) {
            this.recordError({
                type: 'transaction_failure',
                message: `Transaction ${transactionId} failed`,
                severity: 'medium',
                tags: ['transaction'],
                context: metadata || {}
            });
        }
    }

    destroy(): void {
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
        }

        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }

        this.observers.forEach(observer => {
            observer.disconnect();
        });

        this.observers = [];
    }
}