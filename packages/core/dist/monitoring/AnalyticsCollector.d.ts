/**
 * Analytics Collector - Usage analytics and behavior tracking
 * @description Monitors search frequency, result selection rates, error patterns, and user journey analytics
 */
/**
 * Analytics event types
 */
export type AnalyticsEventType = 'search_initiated' | 'search_completed' | 'result_selected' | 'result_viewed' | 'search_refined' | 'search_abandoned' | 'error_occurred' | 'feature_used' | 'session_started' | 'session_ended';
/**
 * Analytics event
 */
export interface AnalyticsEvent {
    /** Event ID */
    id: string;
    /** Event type */
    type: AnalyticsEventType;
    /** Event timestamp */
    timestamp: number;
    /** Session ID */
    sessionId: string;
    /** User agent/browser information */
    userAgent?: string;
    /** Event properties */
    properties: Record<string, any>;
    /** Event context */
    context: {
        /** Current URL/page */
        url?: string;
        /** Referrer */
        referrer?: string;
        /** Viewport size */
        viewport?: {
            width: number;
            height: number;
        };
        /** Device type */
        deviceType?: 'desktop' | 'mobile' | 'tablet';
    };
    /** Privacy compliance flags */
    privacy: {
        /** User consented to tracking */
        consent: boolean;
        /** Data should be anonymized */
        anonymized: boolean;
        /** Geographic region for compliance */
        region?: string;
    };
}
/**
 * User session data
 */
export interface UserSession {
    /** Session ID */
    id: string;
    /** Session start time */
    startTime: number;
    /** Last activity time */
    lastActivity: number;
    /** Session duration */
    duration: number;
    /** Search events in session */
    searchEvents: AnalyticsEvent[];
    /** Selection events in session */
    selectionEvents: AnalyticsEvent[];
    /** Error events in session */
    errorEvents: AnalyticsEvent[];
    /** Total searches performed */
    totalSearches: number;
    /** Total results selected */
    totalSelections: number;
    /** Total errors encountered */
    totalErrors: number;
    /** Session ended */
    ended: boolean;
}
/**
 * Analytics metrics aggregation
 */
export interface AnalyticsMetrics {
    /** Time period */
    period: {
        start: number;
        end: number;
        duration: number;
    };
    /** Search frequency metrics */
    searchFrequency: {
        /** Total searches */
        total: number;
        /** Average per session */
        averagePerSession: number;
        /** Peak searches per hour */
        peakPerHour: number;
        /** Search patterns by hour */
        hourlyPattern: Record<string, number>;
        /** Popular search terms */
        popularTerms: Array<{
            term: string;
            count: number;
            anonymized?: boolean;
        }>;
    };
    /** Result selection metrics */
    resultSelection: {
        /** Total selections */
        total: number;
        /** Selection rate (selections / searches) */
        selectionRate: number;
        /** Average position of selected results */
        averagePosition: number;
        /** Selection patterns */
        positionDistribution: Record<string, number>;
        /** Zero-result searches */
        zeroResultQueries: number;
    };
    /** Error occurrence patterns */
    errorPatterns: {
        /** Total errors */
        total: number;
        /** Error rate (errors / searches) */
        errorRate: number;
        /** Errors by type */
        byType: Record<string, number>;
        /** Errors by source */
        bySource: Record<string, number>;
        /** Error recovery rate */
        recoveryRate: number;
    };
    /** User engagement metrics */
    engagement: {
        /** Total sessions */
        totalSessions: number;
        /** Average session duration */
        averageSessionDuration: number;
        /** Bounce rate (single-search sessions) */
        bounceRate: number;
        /** Return user rate */
        returnUserRate: number;
        /** Feature usage distribution */
        featureUsage: Record<string, number>;
    };
    /** Performance correlation */
    performanceCorrelation: {
        /** Response time vs selection rate */
        responseTimeCorrelation: number;
        /** Error rate vs abandonment */
        errorAbandonmentCorrelation: number;
        /** Load time impact on usage */
        loadTimeImpact: number;
    };
}
/**
 * Funnel analysis for search workflows
 */
export interface SearchFunnel {
    /** Funnel name */
    name: string;
    /** Funnel steps */
    steps: Array<{
        name: string;
        eventType: AnalyticsEventType;
        count: number;
        conversionRate: number;
        dropoffRate: number;
        averageTime: number;
    }>;
    /** Overall conversion rate */
    overallConversionRate: number;
    /** Total users in funnel */
    totalUsers: number;
    /** Funnel completion rate */
    completionRate: number;
    /** Bottleneck identification */
    bottlenecks: Array<{
        step: string;
        dropoffRate: number;
        severity: 'low' | 'medium' | 'high';
    }>;
}
/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
    /** Enable analytics collection */
    enabled: boolean;
    /** Sample rate (0-1) */
    sampleRate: number;
    /** Session timeout in minutes */
    sessionTimeout: number;
    /** Buffer size for events */
    bufferSize: number;
    /** Flush interval in seconds */
    flushInterval: number;
    /** Privacy mode */
    privacyMode: 'strict' | 'balanced' | 'minimal';
    /** Enable search term collection */
    collectSearchTerms: boolean;
    /** Anonymize IP addresses */
    anonymizeIPs: boolean;
    /** Data retention period in days */
    retentionPeriod: number;
}
/**
 * Analytics Collector Implementation
 */
export declare class AnalyticsCollector {
    private config;
    private eventBuffer;
    private sessions;
    private currentSession;
    private flushTimer;
    private eventHandlers;
    private sessionCounter;
    private eventCounter;
    private metricsCache;
    private metricsCacheTimestamp;
    private readonly CACHE_DURATION;
    constructor(config?: Partial<AnalyticsConfig>);
    /**
     * Track an analytics event
     */
    trackEvent(type: AnalyticsEventType, properties?: Record<string, any>, context?: Partial<AnalyticsEvent['context']>): void;
    /**
     * Track search initiated
     */
    trackSearchInitiated(query: string, filters?: Record<string, any>): void;
    /**
     * Track search completed
     */
    trackSearchCompleted(query: string, resultCount: number, responseTime: number, dataSource?: string): void;
    /**
     * Track result selection
     */
    trackResultSelection(query: string, resultPosition: number, resultId?: string, resultType?: string): void;
    /**
     * Track error occurrence
     */
    trackError(errorType: string, errorMessage: string, query?: string, context?: Record<string, any>): void;
    /**
     * Track feature usage
     */
    trackFeatureUsage(feature: string, properties?: Record<string, any>): void;
    /**
     * Get current analytics metrics
     */
    getMetrics(timeWindow?: number): AnalyticsMetrics;
    /**
     * Analyze user journey funnel
     */
    analyzeFunnel(funnelName?: string): SearchFunnel;
    /**
     * Register event handler
     */
    onEvent(handler: (events: AnalyticsEvent[]) => void): void;
    /**
     * Flush events to handlers
     */
    flush(): void;
    /**
     * Clear all data
     */
    clear(): void;
    /**
     * Destroy analytics collector
     */
    destroy(): void;
    private initialize;
    private getCurrentSession;
    private startSession;
    private endSession;
    private updateSession;
    private isSessionExpired;
    private cleanupOldSessions;
    private calculateMetrics;
    private calculateCorrelation;
    private sanitizeProperties;
    private sanitizeErrorMessage;
    private hasUserConsent;
    private shouldAnonymize;
    private getUserRegion;
    private getViewportSize;
    private getDeviceType;
}
/**
 * Global analytics collector instance
 */
export declare const analyticsCollector: AnalyticsCollector;
//# sourceMappingURL=AnalyticsCollector.d.ts.map