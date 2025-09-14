export interface MetricsExportFormat {
  readonly format: 'json' | 'csv' | 'prometheus' | 'elasticsearch';
  readonly compression?: 'gzip' | 'deflate';
  readonly batchSize?: number;
  readonly headers?: Record<string, string>;
}

export interface ExportDestination {
  readonly type: 'file' | 'http' | 'webhook' | 'stream';
  readonly endpoint: string;
  readonly authentication?: {
    readonly type: 'bearer' | 'basic' | 'api-key';
    readonly credentials: Record<string, string>;
  };
  readonly retryPolicy?: {
    readonly maxRetries: number;
    readonly backoffMs: number;
    readonly exponential: boolean;
  };
}

export interface MetricsFilter {
  readonly categories?: readonly string[];
  readonly timeRange?: {
    readonly start: Date;
    readonly end: Date;
  };
  readonly threshold?: {
    readonly metric: string;
    readonly operator: '>' | '<' | '=' | '>=' | '<=';
    readonly value: number;
  };
  readonly sampling?: {
    readonly rate: number;
    readonly strategy: 'random' | 'systematic' | 'stratified';
  };
}

export interface DashboardMetrics {
  readonly timestamp: Date;
  readonly performance: {
    readonly responseTime: number;
    readonly renderTime: number;
    readonly interactionLatency: number;
    readonly fps: number;
    readonly memoryUsage: number;
    readonly cacheHitRate: number;
  };
  readonly usage: {
    readonly activeUsers: number;
    readonly pageViews: number;
    readonly searchQueries: number;
    readonly conversionRate: number;
    readonly bounceRate: number;
    readonly sessionDuration: number;
  };
  readonly browser: {
    readonly compatibilityScore: number;
    readonly performanceScore: number;
    readonly recommendations: readonly string[];
  };
  readonly experiments: {
    readonly activeExperiments: number;
    readonly completedTests: number;
    readonly significantResults: number;
  };
  readonly privacy: {
    readonly consentRate: number;
    readonly dataProcessed: number;
    readonly complianceScore: number;
  };
}

export interface AlertRule {
  readonly id: string;
  readonly name: string;
  readonly metric: string;
  readonly condition: {
    readonly operator: '>' | '<' | '=' | '>=' | '<=';
    readonly threshold: number;
    readonly duration?: number;
  };
  readonly severity: 'info' | 'warning' | 'error' | 'critical';
  readonly channels: readonly string[];
  readonly enabled: boolean;
}

export interface AlertNotification {
  readonly ruleId: string;
  readonly timestamp: Date;
  readonly severity: AlertRule['severity'];
  readonly message: string;
  readonly currentValue: number;
  readonly threshold: number;
  readonly context: Record<string, unknown>;
}

export interface StreamingConfig {
  readonly enabled: boolean;
  readonly bufferSize: number;
  readonly flushInterval: number;
  readonly backpressure: {
    readonly enabled: boolean;
    readonly maxBuffer: number;
    readonly dropStrategy: 'oldest' | 'newest' | 'reject';
  };
}

export interface MetricsExportOptions {
  readonly format: MetricsExportFormat;
  readonly destination: ExportDestination;
  readonly filter?: MetricsFilter;
  readonly schedule?: {
    readonly cron: string;
    readonly timezone: string;
  };
  readonly streaming?: StreamingConfig;
}

export class MetricsExporter {
  private readonly exportJobs = new Map<string, NodeJS.Timeout>();
  private readonly streamingConnections = new Map<string, WebSocket>();
  private readonly alertRules = new Map<string, AlertRule>();
  private metricsBuffer: DashboardMetrics[] = [];

  constructor(
    private readonly performanceTracker: import('./PerformanceTracker').PerformanceTracker,
    private readonly analyticsCollector: import('./AnalyticsCollector').AnalyticsCollector,
    private readonly browserProfiler: import('./BrowserProfiler').BrowserProfiler,
    private readonly experimentManager: import('./ExperimentManager').ExperimentManager,
    private readonly privacyManager: import('./PrivacyManager').PrivacyManager
  ) {}

  async exportMetrics(options: MetricsExportOptions): Promise<void> {
    const metrics = await this.collectDashboardMetrics(options.filter);
    const formatted = await this.formatMetrics(metrics, options.format);
    await this.deliverMetrics(formatted, options.destination);
  }

  async scheduleExport(id: string, options: MetricsExportOptions): Promise<void> {
    if (!options.schedule) {
      throw new Error('Schedule configuration required for scheduled exports');
    }

    this.cancelScheduledExport(id);

    const scheduleMs = this.parseCronExpression(options.schedule.cron);
    const job = setInterval(async () => {
      try {
        await this.exportMetrics(options);
      } catch (error) {
        console.error(`Scheduled export ${id} failed:`, error);
        await this.handleExportError(id, error as Error);
      }
    }, scheduleMs);

    this.exportJobs.set(id, job);
  }

  cancelScheduledExport(id: string): void {
    const job = this.exportJobs.get(id);
    if (job) {
      clearInterval(job);
      this.exportJobs.delete(id);
    }
  }

  async startStreaming(id: string, options: MetricsExportOptions): Promise<void> {
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

    (ws as any).on('close', () => {
      clearInterval(streamInterval);
      this.streamingConnections.delete(id);
    });
  }

  stopStreaming(id: string): void {
    const ws = this.streamingConnections.get(id);
    if (ws) {
      ws.close();
      this.streamingConnections.delete(id);
    }
  }

  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
  }

  removeAlertRule(id: string): void {
    this.alertRules.delete(id);
  }

  async checkAlerts(metrics: DashboardMetrics): Promise<AlertNotification[]> {
    const notifications: AlertNotification[] = [];

    for (const rule of Array.from(this.alertRules.values())) {
      if (!rule.enabled) continue;

      const currentValue = this.getMetricValue(metrics, rule.metric);
      if (currentValue === undefined) continue;

      const triggered = this.evaluateCondition(currentValue, rule.condition);
      
      if (triggered) {
        const notification: AlertNotification = {
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

  private async collectDashboardMetrics(filter?: MetricsFilter): Promise<DashboardMetrics[]> {
    const now = new Date();
    const timeRange = filter?.timeRange ?? {
      start: new Date(now.getTime() - 3600000), // 1 hour ago
      end: now
    };

    const performanceMetrics = await this.performanceTracker.getMetricsSummary();
    const analyticsMetrics = await (this.analyticsCollector as any).getAnalyticsSummary();
    const browserProfile = await this.browserProfiler.getCurrentProfile();
    const experimentSummary = await (this.experimentManager as any).getExperimentSummary();
    const privacyMetrics = await this.privacyManager.getPrivacyMetrics();

    const metrics: DashboardMetrics = {
      timestamp: now,
      performance: {
        responseTime: performanceMetrics.responseTime.avg,
        renderTime: performanceMetrics.renderTime.avg,
        interactionLatency: performanceMetrics.interactionLatency.avg,
        fps: performanceMetrics.renderTime.targetFps,
        memoryUsage: (performanceMetrics as any).memoryUsage || 0,
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
        recommendations: (browserProfile as any).recommendations || []
      },
      experiments: {
        activeExperiments: experimentSummary.activeCount,
        completedTests: experimentSummary.completedCount,
        significantResults: experimentSummary.significantResults
      },
      privacy: {
        consentRate: (privacyMetrics as any).consentRate || 0,
        dataProcessed: (privacyMetrics as any).dataProcessed || 0,
        complianceScore: privacyMetrics.compliance?.score || 0
      }
    };

    const filtered = this.applyFilter([metrics], filter);
    this.metricsBuffer.push(...filtered);

    return filtered;
  }

  private async formatMetrics(metrics: DashboardMetrics[], format: MetricsExportFormat): Promise<string> {
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

  private formatCsv(metrics: DashboardMetrics[]): string {
    if (metrics.length === 0) return '';

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

  private formatPrometheus(metrics: DashboardMetrics[]): string {
    const latest = metrics[metrics.length - 1];
    if (!latest) return '';

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

  private formatElasticsearch(metrics: DashboardMetrics[]): string {
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

  private async deliverMetrics(data: string, destination: ExportDestination): Promise<void> {
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

  private async writeToFile(data: string, filePath: string): Promise<void> {
    // File system operations would go here
    console.log(`Writing metrics to ${filePath}`);
  }

  private async sendToEndpoint(data: string, destination: ExportDestination): Promise<void> {
    const headers: Record<string, string> = {
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

  private async sendToStream(data: string, endpoint: string): Promise<void> {
    // WebSocket or Server-Sent Events implementation would go here
    console.log(`Streaming metrics to ${endpoint}`);
  }

  private getAuthHeaders(auth: ExportDestination['authentication']): Record<string, string> {
    if (!auth) return {};

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

  private applyFilter(metrics: DashboardMetrics[], filter?: MetricsFilter): DashboardMetrics[] {
    if (!filter) return metrics;

    let filtered = metrics;

    if (filter.timeRange) {
      filtered = filtered.filter(m => 
        m.timestamp >= filter.timeRange!.start && m.timestamp <= filter.timeRange!.end
      );
    }

    if (filter.threshold) {
      filtered = filtered.filter(m => {
        const value = this.getMetricValue(m, filter.threshold!.metric);
        return value !== undefined && this.evaluateCondition(value, (filter.threshold as any));
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

  private getMetricValue(metrics: DashboardMetrics, path: string): number | undefined {
    const parts = path.split('.');
    let value: any = metrics;
    
    for (const part of parts) {
      value = value?.[part];
    }
    
    return typeof value === 'number' ? value : undefined;
  }

  private evaluateCondition(value: number, condition: { operator: string; threshold: number }): boolean {
    switch (condition.operator) {
      case '>': return value > condition.threshold;
      case '<': return value < condition.threshold;
      case '=': return value === condition.threshold;
      case '>=': return value >= condition.threshold;
      case '<=': return value <= condition.threshold;
      default: return false;
    }
  }

  private randomSample<T>(array: T[], size: number): T[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, size);
  }

  private systematicSample<T>(array: T[], size: number): T[] {
    if (size >= array.length) return array;
    
    const interval = Math.floor(array.length / size);
    const sample: T[] = [];
    
    for (let i = 0; i < array.length; i += interval) {
      sample.push(array[i]);
      if (sample.length >= size) break;
    }
    
    return sample;
  }

  private stratifiedSample<T>(array: T[], size: number): T[] {
    // Simplified stratified sampling - would need domain-specific stratification logic
    return this.systematicSample(array, size);
  }

  private parseCronExpression(cron: string): number {
    // Simplified cron parsing - would need proper cron library in production
    const parts = cron.split(' ');
    if (parts.length >= 2) {
      const minutes = parseInt(parts[0]) || 0;
      const hours = parseInt(parts[1]) || 0;
      return (hours * 60 + minutes) * 60 * 1000;
    }
    return 3600000; // Default to 1 hour
  }

  private async sendAlert(notification: AlertNotification, channels: readonly string[]): Promise<void> {
    for (const channel of channels) {
      try {
        // Alert delivery implementation would go here
        console.log(`Alert sent to ${channel}:`, notification.message);
      } catch (error) {
        console.error(`Failed to send alert to ${channel}:`, error);
      }
    }
  }

  private async handleExportError(exportId: string, error: Error): Promise<void> {
    console.error(`Export ${exportId} error:`, error);
    // Error handling and recovery logic would go here
  }

  dispose(): void {
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