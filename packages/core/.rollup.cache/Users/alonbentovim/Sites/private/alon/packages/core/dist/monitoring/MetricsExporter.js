export class MetricsExporter {
    constructor(performanceTracker, analyticsCollector, browserProfiler, experimentManager, privacyManager) {
        this.performanceTracker = performanceTracker;
        this.analyticsCollector = analyticsCollector;
        this.browserProfiler = browserProfiler;
        this.experimentManager = experimentManager;
        this.privacyManager = privacyManager;
        this.exportJobs = new Map();
        this.streamingConnections = new Map();
        this.alertRules = new Map();
        this.metricsBuffer = [];
    }
    async exportMetrics(options) {
        const metrics = await this.collectDashboardMetrics(options.filter);
        const formatted = await this.formatMetrics(metrics, options.format);
        await this.deliverMetrics(formatted, options.destination);
    }
    async scheduleExport(id, options) {
        if (!options.schedule) {
            throw new Error('Schedule configuration required for scheduled exports');
        }
        this.cancelScheduledExport(id);
        const scheduleMs = this.parseCronExpression(options.schedule.cron);
        const job = setInterval(async () => {
            try {
                await this.exportMetrics(options);
            }
            catch (error) {
                console.error(`Scheduled export ${id} failed:`, error);
                await this.handleExportError(id, error);
            }
        }, scheduleMs);
        this.exportJobs.set(id, job);
    }
    cancelScheduledExport(id) {
        const job = this.exportJobs.get(id);
        if (job) {
            clearInterval(job);
            this.exportJobs.delete(id);
        }
    }
    async startStreaming(id, options) {
        if (!options.streaming?.enabled) {
            throw new Error('Streaming configuration required');
        }
        const ws = new WebSocket(options.destination.endpoint);
        this.streamingConnections.set(id, ws);
        const streamInterval = setInterval(async () => {
            if (this.metricsBuffer.length >= (options.streaming?.bufferSize ?? 100)) {
                const metrics = [...this.metricsBuffer];
                this.metricsBuffer = [];
                const formatted = await this.formatMetrics(metrics, options.format);
                ws.send(JSON.stringify(formatted));
            }
        }, options.streaming.flushInterval);
        ws.on('close', () => {
            clearInterval(streamInterval);
            this.streamingConnections.delete(id);
        });
    }
    stopStreaming(id) {
        const ws = this.streamingConnections.get(id);
        if (ws) {
            ws.close();
            this.streamingConnections.delete(id);
        }
    }
    addAlertRule(rule) {
        this.alertRules.set(rule.id, rule);
    }
    removeAlertRule(id) {
        this.alertRules.delete(id);
    }
    async checkAlerts(metrics) {
        const notifications = [];
        for (const rule of Array.from(this.alertRules.values())) {
            if (!rule.enabled)
                continue;
            const currentValue = this.getMetricValue(metrics, rule.metric);
            if (currentValue === undefined)
                continue;
            const triggered = this.evaluateCondition(currentValue, rule.condition);
            if (triggered) {
                const notification = {
                    ruleId: rule.id,
                    timestamp: new Date(),
                    severity: rule.severity,
                    message: `${rule.name}: ${rule.metric} is ${currentValue} (threshold: ${rule.condition.threshold})`,
                    currentValue,
                    threshold: rule.condition.threshold,
                    context: { rule, metrics }
                };
                notifications.push(notification);
                await this.sendAlert(notification, rule.channels);
            }
        }
        return notifications;
    }
    async collectDashboardMetrics(filter) {
        const now = new Date();
        const timeRange = filter?.timeRange ?? {
            start: new Date(now.getTime() - 3600000), // 1 hour ago
            end: now
        };
        const performanceMetrics = await this.performanceTracker.getMetricsSummary();
        const analyticsMetrics = await this.analyticsCollector.getAnalyticsSummary();
        const browserProfile = await this.browserProfiler.getCurrentProfile();
        const experimentSummary = await this.experimentManager.getExperimentSummary();
        const privacyMetrics = await this.privacyManager.getPrivacyMetrics();
        const metrics = {
            timestamp: now,
            performance: {
                responseTime: performanceMetrics.responseTime.avg,
                renderTime: performanceMetrics.renderTime.avg,
                interactionLatency: performanceMetrics.interactionLatency.avg,
                fps: performanceMetrics.renderTime.targetFps,
                memoryUsage: performanceMetrics.memoryUsage || 0,
                cacheHitRate: performanceMetrics.cachePerformance.hitRate
            },
            usage: {
                activeUsers: analyticsMetrics.activeUsers,
                pageViews: analyticsMetrics.pageViews,
                searchQueries: analyticsMetrics.searchQueries,
                conversionRate: analyticsMetrics.conversionRate,
                bounceRate: analyticsMetrics.bounceRate,
                sessionDuration: analyticsMetrics.averageSessionDuration
            },
            browser: {
                compatibilityScore: browserProfile.compatibilityScore,
                performanceScore: browserProfile.performanceScore,
                recommendations: browserProfile.recommendations || []
            },
            experiments: {
                activeExperiments: experimentSummary.activeCount,
                completedTests: experimentSummary.completedCount,
                significantResults: experimentSummary.significantResults
            },
            privacy: {
                consentRate: privacyMetrics.consentRate || 0,
                dataProcessed: privacyMetrics.dataProcessed || 0,
                complianceScore: privacyMetrics.compliance?.score || 0
            }
        };
        const filtered = this.applyFilter([metrics], filter);
        this.metricsBuffer.push(...filtered);
        return filtered;
    }
    async formatMetrics(metrics, format) {
        switch (format.format) {
            case 'json':
                return JSON.stringify(metrics, null, 2);
            case 'csv':
                return this.formatCsv(metrics);
            case 'prometheus':
                return this.formatPrometheus(metrics);
            case 'elasticsearch':
                return this.formatElasticsearch(metrics);
            default:
                throw new Error(`Unsupported export format: ${format.format}`);
        }
    }
    formatCsv(metrics) {
        if (metrics.length === 0)
            return '';
        const headers = [
            'timestamp',
            'response_time', 'render_time', 'interaction_latency', 'fps', 'memory_usage', 'cache_hit_rate',
            'active_users', 'page_views', 'search_queries', 'conversion_rate', 'bounce_rate', 'session_duration',
            'compatibility_score', 'performance_score',
            'active_experiments', 'completed_tests', 'significant_results',
            'consent_rate', 'data_processed', 'compliance_score'
        ];
        const rows = metrics.map(m => [
            m.timestamp.toISOString(),
            m.performance.responseTime, m.performance.renderTime, m.performance.interactionLatency,
            m.performance.fps, m.performance.memoryUsage, m.performance.cacheHitRate,
            m.usage.activeUsers, m.usage.pageViews, m.usage.searchQueries,
            m.usage.conversionRate, m.usage.bounceRate, m.usage.sessionDuration,
            m.browser.compatibilityScore, m.browser.performanceScore,
            m.experiments.activeExperiments, m.experiments.completedTests, m.experiments.significantResults,
            m.privacy.consentRate, m.privacy.dataProcessed, m.privacy.complianceScore
        ]);
        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
    formatPrometheus(metrics) {
        const latest = metrics[metrics.length - 1];
        if (!latest)
            return '';
        const timestamp = latest.timestamp.getTime();
        return [
            `# HELP performance_response_time Average response time in milliseconds`,
            `# TYPE performance_response_time gauge`,
            `performance_response_time ${latest.performance.responseTime} ${timestamp}`,
            ``,
            `# HELP usage_active_users Number of active users`,
            `# TYPE usage_active_users gauge`,
            `usage_active_users ${latest.usage.activeUsers} ${timestamp}`,
            ``,
            `# HELP browser_compatibility_score Browser compatibility score (0-100)`,
            `# TYPE browser_compatibility_score gauge`,
            `browser_compatibility_score ${latest.browser.compatibilityScore} ${timestamp}`,
            ``,
            `# HELP experiments_active_count Number of active experiments`,
            `# TYPE experiments_active_count gauge`,
            `experiments_active_count ${latest.experiments.activeExperiments} ${timestamp}`,
            ``,
            `# HELP privacy_compliance_score Privacy compliance score (0-100)`,
            `# TYPE privacy_compliance_score gauge`,
            `privacy_compliance_score ${latest.privacy.complianceScore} ${timestamp}`
        ].join('\n');
    }
    formatElasticsearch(metrics) {
        const docs = metrics.map(m => ({
            '@timestamp': m.timestamp.toISOString(),
            performance: m.performance,
            usage: m.usage,
            browser: m.browser,
            experiments: m.experiments,
            privacy: m.privacy
        }));
        return docs.map(doc => JSON.stringify({ index: {} }) + '\n' + JSON.stringify(doc)).join('\n') + '\n';
    }
    async deliverMetrics(data, destination) {
        switch (destination.type) {
            case 'file':
                await this.writeToFile(data, destination.endpoint);
                break;
            case 'http':
            case 'webhook':
                await this.sendToEndpoint(data, destination);
                break;
            case 'stream':
                await this.sendToStream(data, destination.endpoint);
                break;
            default:
                throw new Error(`Unsupported destination type: ${destination.type}`);
        }
    }
    async writeToFile(data, filePath) {
        // File system operations would go here
        console.log(`Writing metrics to ${filePath}`);
    }
    async sendToEndpoint(data, destination) {
        const headers = {
            'Content-Type': 'application/json',
            ...destination.authentication && this.getAuthHeaders(destination.authentication)
        };
        const response = await fetch(destination.endpoint, {
            method: 'POST',
            headers,
            body: data
        });
        if (!response.ok) {
            throw new Error(`HTTP export failed: ${response.status} ${response.statusText}`);
        }
    }
    async sendToStream(data, endpoint) {
        // WebSocket or Server-Sent Events implementation would go here
        console.log(`Streaming metrics to ${endpoint}`);
    }
    getAuthHeaders(auth) {
        if (!auth)
            return {};
        switch (auth.type) {
            case 'bearer':
                return { Authorization: `Bearer ${auth.credentials.token}` };
            case 'basic':
                const encoded = btoa(`${auth.credentials.username}:${auth.credentials.password}`);
                return { Authorization: `Basic ${encoded}` };
            case 'api-key':
                return { 'X-API-Key': auth.credentials.key };
            default:
                return {};
        }
    }
    applyFilter(metrics, filter) {
        if (!filter)
            return metrics;
        let filtered = metrics;
        if (filter.timeRange) {
            filtered = filtered.filter(m => m.timestamp >= filter.timeRange.start && m.timestamp <= filter.timeRange.end);
        }
        if (filter.threshold) {
            filtered = filtered.filter(m => {
                const value = this.getMetricValue(m, filter.threshold.metric);
                return value !== undefined && this.evaluateCondition(value, filter.threshold);
            });
        }
        if (filter.sampling && filter.sampling.rate < 1) {
            const sampleSize = Math.ceil(filtered.length * filter.sampling.rate);
            switch (filter.sampling.strategy) {
                case 'random':
                    filtered = this.randomSample(filtered, sampleSize);
                    break;
                case 'systematic':
                    filtered = this.systematicSample(filtered, sampleSize);
                    break;
                case 'stratified':
                    filtered = this.stratifiedSample(filtered, sampleSize);
                    break;
            }
        }
        return filtered;
    }
    getMetricValue(metrics, path) {
        const parts = path.split('.');
        let value = metrics;
        for (const part of parts) {
            value = value?.[part];
        }
        return typeof value === 'number' ? value : undefined;
    }
    evaluateCondition(value, condition) {
        switch (condition.operator) {
            case '>': return value > condition.threshold;
            case '<': return value < condition.threshold;
            case '=': return value === condition.threshold;
            case '>=': return value >= condition.threshold;
            case '<=': return value <= condition.threshold;
            default: return false;
        }
    }
    randomSample(array, size) {
        const shuffled = [...array].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, size);
    }
    systematicSample(array, size) {
        if (size >= array.length)
            return array;
        const interval = Math.floor(array.length / size);
        const sample = [];
        for (let i = 0; i < array.length; i += interval) {
            sample.push(array[i]);
            if (sample.length >= size)
                break;
        }
        return sample;
    }
    stratifiedSample(array, size) {
        // Simplified stratified sampling - would need domain-specific stratification logic
        return this.systematicSample(array, size);
    }
    parseCronExpression(cron) {
        // Simplified cron parsing - would need proper cron library in production
        const parts = cron.split(' ');
        if (parts.length >= 2) {
            const minutes = parseInt(parts[0]) || 0;
            const hours = parseInt(parts[1]) || 0;
            return (hours * 60 + minutes) * 60 * 1000;
        }
        return 3600000; // Default to 1 hour
    }
    async sendAlert(notification, channels) {
        for (const channel of channels) {
            try {
                // Alert delivery implementation would go here
                console.log(`Alert sent to ${channel}:`, notification.message);
            }
            catch (error) {
                console.error(`Failed to send alert to ${channel}:`, error);
            }
        }
    }
    async handleExportError(exportId, error) {
        console.error(`Export ${exportId} error:`, error);
        // Error handling and recovery logic would go here
    }
    dispose() {
        for (const job of Array.from(this.exportJobs.values())) {
            clearInterval(job);
        }
        this.exportJobs.clear();
        for (const ws of Array.from(this.streamingConnections.values())) {
            ws.close();
        }
        this.streamingConnections.clear();
    }
}
//# sourceMappingURL=MetricsExporter.js.map