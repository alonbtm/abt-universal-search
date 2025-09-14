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
export declare class MetricsExporter {
    private readonly performanceTracker;
    private readonly analyticsCollector;
    private readonly browserProfiler;
    private readonly experimentManager;
    private readonly privacyManager;
    private readonly exportJobs;
    private readonly streamingConnections;
    private readonly alertRules;
    private metricsBuffer;
    constructor(performanceTracker: import('./PerformanceTracker').PerformanceTracker, analyticsCollector: import('./AnalyticsCollector').AnalyticsCollector, browserProfiler: import('./BrowserProfiler').BrowserProfiler, experimentManager: import('./ExperimentManager').ExperimentManager, privacyManager: import('./PrivacyManager').PrivacyManager);
    exportMetrics(options: MetricsExportOptions): Promise<void>;
    scheduleExport(id: string, options: MetricsExportOptions): Promise<void>;
    cancelScheduledExport(id: string): void;
    startStreaming(id: string, options: MetricsExportOptions): Promise<void>;
    stopStreaming(id: string): void;
    addAlertRule(rule: AlertRule): void;
    removeAlertRule(id: string): void;
    checkAlerts(metrics: DashboardMetrics): Promise<AlertNotification[]>;
    private collectDashboardMetrics;
    private formatMetrics;
    private formatCsv;
    private formatPrometheus;
    private formatElasticsearch;
    private deliverMetrics;
    private writeToFile;
    private sendToEndpoint;
    private sendToStream;
    private getAuthHeaders;
    private applyFilter;
    private getMetricValue;
    private evaluateCondition;
    private randomSample;
    private systematicSample;
    private stratifiedSample;
    private parseCronExpression;
    private sendAlert;
    private handleExportError;
    dispose(): void;
}
//# sourceMappingURL=MetricsExporter.d.ts.map