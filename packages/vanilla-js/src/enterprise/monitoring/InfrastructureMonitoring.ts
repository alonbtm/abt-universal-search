interface CDNMetrics {
    region: string;
    cacheHitRatio: number;
    averageLatency: number;
    bandwidth: number;
    requestCount: number;
    errorCount: number;
    timestamp: Date;
}

interface APIMetrics {
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    responseSize: number;
    requestCount: number;
    errorRate: number;
    timestamp: Date;
}

interface SystemMetrics {
    cpu: {
        usage: number;
        load: number[];
        cores: number;
    };
    memory: {
        used: number;
        total: number;
        percentage: number;
        heap?: {
            used: number;
            total: number;
        };
    };
    disk: {
        used: number;
        total: number;
        percentage: number;
        iops?: number;
    };
    network: {
        bytesIn: number;
        bytesOut: number;
        packetsIn: number;
        packetsOut: number;
        connections: number;
    };
    timestamp: Date;
}

interface DatabaseMetrics {
    connectionPool: {
        active: number;
        idle: number;
        total: number;
        maxWait: number;
    };
    queryPerformance: {
        averageResponseTime: number;
        slowQueries: number;
        totalQueries: number;
        cacheHitRatio: number;
    };
    storage: {
        size: number;
        growth: number;
        indexSize: number;
    };
    timestamp: Date;
}

interface MonitoringAlert {
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: 'threshold' | 'anomaly' | 'outage';
    metric: string;
    currentValue: number;
    threshold: number;
    message: string;
    timestamp: Date;
    acknowledged: boolean;
    resolvedAt?: Date;
}

interface InfrastructureConfig {
    monitoring: {
        interval: number;
        retention: number;
        aggregationWindow: number;
    };
    alerts: {
        cdnLatencyThreshold: number;
        apiErrorRateThreshold: number;
        cpuThreshold: number;
        memoryThreshold: number;
        diskThreshold: number;
        dbConnectionThreshold: number;
    };
    endpoints: {
        healthCheck: string[];
        metrics: string[];
        cdn: string[];
    };
}

export class InfrastructureMonitoring {
    private config: InfrastructureConfig;
    private cdnMetrics: CDNMetrics[] = [];
    private apiMetrics: APIMetrics[] = [];
    private systemMetrics: SystemMetrics[] = [];
    private dbMetrics: DatabaseMetrics[] = [];
    private alerts: MonitoringAlert[] = [];
    private monitoringInterval: number | null = null;

    constructor(config: InfrastructureConfig) {
        this.config = config;
        this.initializeMonitoring();
    }

    private initializeMonitoring(): void {
        this.startMonitoring();
        this.setupPerformanceObserver();
        this.setupNetworkMonitoring();
    }

    private startMonitoring(): void {
        this.monitoringInterval = setInterval(async () => {
            await Promise.all([
                this.collectCDNMetrics(),
                this.collectAPIMetrics(),
                this.collectSystemMetrics(),
                this.collectDatabaseMetrics()
            ]);
        }, this.config.monitoring.interval);
    }

    private setupPerformanceObserver(): void {
        if (typeof PerformanceObserver !== 'undefined') {
            const resourceObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'resource') {
                        this.processResourceTiming(entry as PerformanceResourceTiming);
                    }
                }
            });

            resourceObserver.observe({ entryTypes: ['resource'] });
        }
    }

    private setupNetworkMonitoring(): void {
        if (typeof navigator !== 'undefined' && 'connection' in navigator) {
            const connection = (navigator as any).connection;
            if (connection) {
                const networkInfo = {
                    effectiveType: connection.effectiveType,
                    downlink: connection.downlink,
                    rtt: connection.rtt,
                    saveData: connection.saveData
                };

                this.recordSystemMetric('network_info', networkInfo);
            }
        }
    }

    private processResourceTiming(entry: PerformanceResourceTiming): void {
        const isAPICall = entry.name.includes('/api/');
        const isCDNResource = entry.name.includes('cdn.') || entry.name.includes('.amazonaws.com');

        if (isAPICall) {
            this.recordAPIMetric(entry);
        } else if (isCDNResource) {
            this.recordCDNMetric(entry);
        }
    }

    private recordAPIMetric(entry: PerformanceResourceTiming): void {
        const url = new URL(entry.name);
        const responseTime = entry.responseEnd - entry.requestStart;

        // Estimate status code from timing (this would be better with actual response data)
        let statusCode = 200;
        if (entry.responseStart === 0) statusCode = 0; // Failed request
        else if (responseTime > 10000) statusCode = 500; // Assume server error for very slow responses

        const apiMetric: APIMetrics = {
            endpoint: url.pathname,
            method: 'GET', // Would need to track actual method
            statusCode,
            responseTime,
            responseSize: entry.transferSize || entry.encodedBodySize,
            requestCount: 1,
            errorRate: statusCode >= 400 ? 1 : 0,
            timestamp: new Date(performance.timeOrigin + entry.startTime)
        };

        this.apiMetrics.push(apiMetric);
        this.checkAPIAlerts(apiMetric);
    }

    private recordCDNMetric(entry: PerformanceResourceTiming): void {
        const responseTime = entry.responseEnd - entry.requestStart;
        const cacheHit = entry.transferSize === 0 || entry.transferSize < entry.encodedBodySize;

        const cdnMetric: CDNMetrics = {
            region: this.extractRegionFromURL(entry.name),
            cacheHitRatio: cacheHit ? 1 : 0,
            averageLatency: responseTime,
            bandwidth: entry.transferSize / (responseTime / 1000) || 0,
            requestCount: 1,
            errorCount: entry.responseStart === 0 ? 1 : 0,
            timestamp: new Date(performance.timeOrigin + entry.startTime)
        };

        this.cdnMetrics.push(cdnMetric);
        this.checkCDNAlerts(cdnMetric);
    }

    private extractRegionFromURL(url: string): string {
        // Extract region from CDN URL patterns
        const regionMatch = url.match(/([a-z]{2}-[a-z]+-\d)/);
        return regionMatch ? regionMatch[1] : 'unknown';
    }

    private async collectCDNMetrics(): Promise<void> {
        // In a real implementation, this would fetch metrics from CDN API
        for (const cdnEndpoint of this.config.endpoints.cdn) {
            try {
                const response = await fetch(`${cdnEndpoint}/metrics`);
                if (response.ok) {
                    const data = await response.json();
                    this.processCDNMetricsData(data);
                }
            } catch (error) {
                console.error(`Failed to collect CDN metrics from ${cdnEndpoint}:`, error);
            }
        }
    }

    private processCDNMetricsData(data: any): void {
        if (data.regions) {
            data.regions.forEach((regionData: any) => {
                const metric: CDNMetrics = {
                    region: regionData.region,
                    cacheHitRatio: regionData.cache_hit_ratio,
                    averageLatency: regionData.avg_latency,
                    bandwidth: regionData.bandwidth,
                    requestCount: regionData.request_count,
                    errorCount: regionData.error_count,
                    timestamp: new Date()
                };

                this.cdnMetrics.push(metric);
                this.checkCDNAlerts(metric);
            });
        }
    }

    private async collectAPIMetrics(): Promise<void> {
        // Aggregate recent performance entries for API calls
        if (typeof performance !== 'undefined') {
            const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
            const recentEntries = entries.filter(entry =>
                Date.now() - (performance.timeOrigin + entry.startTime) < this.config.monitoring.interval
            );

            const apiEntries = recentEntries.filter(entry =>
                entry.name.includes('/api/')
            );

            this.aggregateAPIMetrics(apiEntries);
        }
    }

    private aggregateAPIMetrics(entries: PerformanceResourceTiming[]): void {
        const endpointMetrics = entries.reduce((acc, entry) => {
            const url = new URL(entry.name);
            const endpoint = url.pathname;

            if (!acc[endpoint]) {
                acc[endpoint] = {
                    responseTimes: [],
                    sizes: [],
                    errors: 0,
                    total: 0
                };
            }

            acc[endpoint].responseTimes.push(entry.responseEnd - entry.requestStart);
            acc[endpoint].sizes.push(entry.transferSize || entry.encodedBodySize);
            acc[endpoint].total++;

            if (entry.responseStart === 0) {
                acc[endpoint].errors++;
            }

            return acc;
        }, {} as Record<string, any>);

        Object.entries(endpointMetrics).forEach(([endpoint, data]) => {
            const avgResponseTime = data.responseTimes.reduce((a: number, b: number) => a + b, 0) / data.responseTimes.length;
            const avgSize = data.sizes.reduce((a: number, b: number) => a + b, 0) / data.sizes.length;
            const errorRate = (data.errors / data.total) * 100;

            const apiMetric: APIMetrics = {
                endpoint,
                method: 'GET', // Would track actual method
                statusCode: data.errors > 0 ? 500 : 200,
                responseTime: avgResponseTime,
                responseSize: avgSize,
                requestCount: data.total,
                errorRate,
                timestamp: new Date()
            };

            this.apiMetrics.push(apiMetric);
            this.checkAPIAlerts(apiMetric);
        });
    }

    private async collectSystemMetrics(): Promise<void> {
        const systemMetric: SystemMetrics = {
            cpu: await this.getCPUMetrics(),
            memory: this.getMemoryMetrics(),
            disk: this.getDiskMetrics(),
            network: this.getNetworkMetrics(),
            timestamp: new Date()
        };

        this.systemMetrics.push(systemMetric);
        this.checkSystemAlerts(systemMetric);
    }

    private async getCPUMetrics(): Promise<SystemMetrics['cpu']> {
        // In browser environment, we can't get actual CPU metrics
        // This would be implemented differently in Node.js server environment
        return {
            usage: 0,
            load: [0, 0, 0],
            cores: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 1 : 1
        };
    }

    private getMemoryMetrics(): SystemMetrics['memory'] {
        if (typeof performance !== 'undefined' && 'memory' in performance) {
            const memory = (performance as any).memory;
            return {
                used: memory.usedJSHeapSize,
                total: memory.totalJSHeapSize,
                percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
                heap: {
                    used: memory.usedJSHeapSize,
                    total: memory.totalJSHeapSize
                }
            };
        }

        return {
            used: 0,
            total: 0,
            percentage: 0
        };
    }

    private getDiskMetrics(): SystemMetrics['disk'] {
        // Browser can't access disk metrics directly
        // This would be implemented in server environment
        return {
            used: 0,
            total: 0,
            percentage: 0
        };
    }

    private getNetworkMetrics(): SystemMetrics['network'] {
        // Browser has limited network metrics access
        return {
            bytesIn: 0,
            bytesOut: 0,
            packetsIn: 0,
            packetsOut: 0,
            connections: 0
        };
    }

    private async collectDatabaseMetrics(): Promise<void> {
        // This would connect to database monitoring APIs
        const dbMetric: DatabaseMetrics = {
            connectionPool: {
                active: 0,
                idle: 0,
                total: 0,
                maxWait: 0
            },
            queryPerformance: {
                averageResponseTime: 0,
                slowQueries: 0,
                totalQueries: 0,
                cacheHitRatio: 0
            },
            storage: {
                size: 0,
                growth: 0,
                indexSize: 0
            },
            timestamp: new Date()
        };

        this.dbMetrics.push(dbMetric);
    }

    private checkCDNAlerts(metric: CDNMetrics): void {
        if (metric.averageLatency > this.config.alerts.cdnLatencyThreshold) {
            this.createAlert(
                'high',
                'threshold',
                'cdn_latency',
                metric.averageLatency,
                this.config.alerts.cdnLatencyThreshold,
                `High CDN latency detected in ${metric.region}: ${metric.averageLatency.toFixed(2)}ms`
            );
        }

        if (metric.errorCount / metric.requestCount > 0.01) { // 1% error rate threshold
            this.createAlert(
                'medium',
                'threshold',
                'cdn_error_rate',
                metric.errorCount / metric.requestCount * 100,
                1,
                `Elevated CDN error rate in ${metric.region}: ${(metric.errorCount / metric.requestCount * 100).toFixed(2)}%`
            );
        }
    }

    private checkAPIAlerts(metric: APIMetrics): void {
        if (metric.errorRate > this.config.alerts.apiErrorRateThreshold) {
            this.createAlert(
                'high',
                'threshold',
                'api_error_rate',
                metric.errorRate,
                this.config.alerts.apiErrorRateThreshold,
                `High API error rate for ${metric.endpoint}: ${metric.errorRate.toFixed(2)}%`
            );
        }

        if (metric.responseTime > 5000) { // 5 second threshold
            this.createAlert(
                'medium',
                'threshold',
                'api_response_time',
                metric.responseTime,
                5000,
                `Slow API response for ${metric.endpoint}: ${metric.responseTime.toFixed(2)}ms`
            );
        }
    }

    private checkSystemAlerts(metric: SystemMetrics): void {
        if (metric.cpu.usage > this.config.alerts.cpuThreshold) {
            this.createAlert(
                'high',
                'threshold',
                'cpu_usage',
                metric.cpu.usage,
                this.config.alerts.cpuThreshold,
                `High CPU usage: ${metric.cpu.usage.toFixed(2)}%`
            );
        }

        if (metric.memory.percentage > this.config.alerts.memoryThreshold) {
            this.createAlert(
                'high',
                'threshold',
                'memory_usage',
                metric.memory.percentage,
                this.config.alerts.memoryThreshold,
                `High memory usage: ${metric.memory.percentage.toFixed(2)}%`
            );
        }

        if (metric.disk.percentage > this.config.alerts.diskThreshold) {
            this.createAlert(
                'medium',
                'threshold',
                'disk_usage',
                metric.disk.percentage,
                this.config.alerts.diskThreshold,
                `High disk usage: ${metric.disk.percentage.toFixed(2)}%`
            );
        }
    }

    private createAlert(
        severity: MonitoringAlert['severity'],
        type: MonitoringAlert['type'],
        metric: string,
        currentValue: number,
        threshold: number,
        message: string
    ): void {
        const alert: MonitoringAlert = {
            id: this.generateAlertId(),
            severity,
            type,
            metric,
            currentValue,
            threshold,
            message,
            timestamp: new Date(),
            acknowledged: false
        };

        this.alerts.push(alert);
        this.escalateAlert(alert);
    }

    private generateAlertId(): string {
        return Array.from(crypto.getRandomValues(new Uint8Array(8)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    private escalateAlert(alert: MonitoringAlert): void {
        console.warn(`Infrastructure Alert [${alert.severity.toUpperCase()}]:`, alert.message);

        if (alert.severity === 'critical' || alert.severity === 'high') {
            this.sendAlertNotification(alert);
        }
    }

    private sendAlertNotification(alert: MonitoringAlert): void {
        if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
            navigator.sendBeacon('/api/alerts', JSON.stringify(alert));
        }
    }

    acknowledgeAlert(alertId: string): boolean {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            return true;
        }
        return false;
    }

    resolveAlert(alertId: string): boolean {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.resolvedAt = new Date();
            return true;
        }
        return false;
    }

    recordSystemMetric(name: string, value: any): void {
        // Generic method to record custom system metrics
        const customMetric = {
            name,
            value,
            timestamp: new Date()
        };

        console.log('Custom system metric recorded:', customMetric);
    }

    getMetrics(type: 'cdn' | 'api' | 'system' | 'database', startDate?: Date, endDate?: Date): any[] {
        let metrics: any[];

        switch (type) {
            case 'cdn':
                metrics = this.cdnMetrics;
                break;
            case 'api':
                metrics = this.apiMetrics;
                break;
            case 'system':
                metrics = this.systemMetrics;
                break;
            case 'database':
                metrics = this.dbMetrics;
                break;
            default:
                return [];
        }

        if (startDate) {
            metrics = metrics.filter(m => m.timestamp >= startDate);
        }

        if (endDate) {
            metrics = metrics.filter(m => m.timestamp <= endDate);
        }

        return metrics;
    }

    getAlerts(severity?: MonitoringAlert['severity'], acknowledged?: boolean): MonitoringAlert[] {
        let alerts = this.alerts;

        if (severity) {
            alerts = alerts.filter(a => a.severity === severity);
        }

        if (acknowledged !== undefined) {
            alerts = alerts.filter(a => a.acknowledged === acknowledged);
        }

        return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    getDashboardData(): {
        summary: {
            totalAlerts: number;
            activeAlerts: number;
            avgCDNLatency: number;
            apiErrorRate: number;
            systemHealth: 'healthy' | 'degraded' | 'unhealthy';
        };
        recentMetrics: {
            cdn: CDNMetrics[];
            api: APIMetrics[];
            system: SystemMetrics[];
        };
        alerts: MonitoringAlert[];
    } {
        const recentWindow = new Date(Date.now() - 60 * 60 * 1000); // Last hour

        const recentCDN = this.cdnMetrics.filter(m => m.timestamp > recentWindow);
        const recentAPI = this.apiMetrics.filter(m => m.timestamp > recentWindow);
        const recentSystem = this.systemMetrics.filter(m => m.timestamp > recentWindow);

        const activeAlerts = this.alerts.filter(a => !a.resolvedAt);
        const avgCDNLatency = recentCDN.length > 0
            ? recentCDN.reduce((sum, m) => sum + m.averageLatency, 0) / recentCDN.length
            : 0;

        const apiErrorRate = recentAPI.length > 0
            ? recentAPI.reduce((sum, m) => sum + m.errorRate, 0) / recentAPI.length
            : 0;

        let systemHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
        const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical').length;
        const highAlerts = activeAlerts.filter(a => a.severity === 'high').length;

        if (criticalAlerts > 0) {
            systemHealth = 'unhealthy';
        } else if (highAlerts > 2) {
            systemHealth = 'degraded';
        }

        return {
            summary: {
                totalAlerts: this.alerts.length,
                activeAlerts: activeAlerts.length,
                avgCDNLatency,
                apiErrorRate,
                systemHealth
            },
            recentMetrics: {
                cdn: recentCDN.slice(-20),
                api: recentAPI.slice(-20),
                system: recentSystem.slice(-20)
            },
            alerts: activeAlerts.slice(0, 10)
        };
    }

    destroy(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
    }
}