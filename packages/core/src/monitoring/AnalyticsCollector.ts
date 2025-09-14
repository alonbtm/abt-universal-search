/**
 * Analytics Collector - Usage analytics and behavior tracking
 * @description Monitors search frequency, result selection rates, error patterns, and user journey analytics
 */

/**
 * Analytics event types
 */
export type AnalyticsEventType =
  | 'search_initiated'
  | 'search_completed'
  | 'result_selected'
  | 'result_viewed'
  | 'search_refined'
  | 'search_abandoned'
  | 'error_occurred'
  | 'feature_used'
  | 'session_started'
  | 'session_ended';

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
    viewport?: { width: number; height: number };
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
    popularTerms: Array<{ term: string; count: number; anonymized?: boolean }>;
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
 * Default analytics configuration
 */
const DEFAULT_CONFIG: AnalyticsConfig = {
  enabled: true,
  sampleRate: 1.0,
  sessionTimeout: 30, // 30 minutes
  bufferSize: 100,
  flushInterval: 30, // 30 seconds
  privacyMode: 'balanced',
  collectSearchTerms: true,
  anonymizeIPs: true,
  retentionPeriod: 90, // 90 days
};

/**
 * Analytics Collector Implementation
 */
export class AnalyticsCollector {
  private config: AnalyticsConfig;
  private eventBuffer: AnalyticsEvent[];
  private sessions: Map<string, UserSession>;
  private currentSession: UserSession | null = null;
  private flushTimer: any = null;
  private eventHandlers: Array<(events: AnalyticsEvent[]) => void> = [];
  private sessionCounter: number = 0;
  private eventCounter: number = 0;
  private metricsCache: AnalyticsMetrics | null = null;
  private metricsCacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 60000; // 1 minute

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventBuffer = [];
    this.sessions = new Map();
    this.initialize();
  }

  /**
   * Track an analytics event
   */
  trackEvent(
    type: AnalyticsEventType,
    properties: Record<string, any> = {},
    context?: Partial<AnalyticsEvent['context']>
  ): void {
    if (!this.config.enabled || Math.random() > this.config.sampleRate) {
      return;
    }

    const session = this.getCurrentSession();
    const eventId = `event_${++this.eventCounter}_${Date.now()}`;

    // Determine privacy settings based on configuration and consent
    const privacy = {
      consent: this.hasUserConsent(),
      anonymized: this.config.privacyMode === 'strict' || this.shouldAnonymize(type),
      region: this.getUserRegion(),
    };

    // Create the analytics event
    const event: AnalyticsEvent = {
      id: eventId,
      type,
      timestamp: Date.now(),
      sessionId: session.id,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      properties: this.sanitizeProperties(properties, privacy.anonymized),
      context: {
        url: typeof location !== 'undefined' ? location.href : undefined,
        referrer: typeof document !== 'undefined' ? document.referrer : undefined,
        viewport: this.getViewportSize(),
        deviceType: this.getDeviceType(),
        ...context,
      },
      privacy,
    };

    // Add event to buffer
    this.eventBuffer.push(event);

    // Update session
    this.updateSession(session, event);

    // Trigger flush if buffer is full
    if (this.eventBuffer.length >= this.config.bufferSize) {
      this.flush();
    }
  }

  /**
   * Track search initiated
   */
  trackSearchInitiated(query: string, filters?: Record<string, any>): void {
    this.trackEvent('search_initiated', {
      query: this.config.collectSearchTerms ? query : '[REDACTED]',
      queryLength: query.length,
      hasFilters: Boolean(filters && Object.keys(filters).length > 0),
      filterCount: filters ? Object.keys(filters).length : 0,
      filters: this.config.privacyMode !== 'strict' ? filters : undefined,
    });
  }

  /**
   * Track search completed
   */
  trackSearchCompleted(
    query: string,
    resultCount: number,
    responseTime: number,
    dataSource?: string
  ): void {
    this.trackEvent('search_completed', {
      query: this.config.collectSearchTerms ? query : '[REDACTED]',
      queryLength: query.length,
      resultCount,
      responseTime,
      dataSource,
      hasResults: resultCount > 0,
    });
  }

  /**
   * Track result selection
   */
  trackResultSelection(
    query: string,
    resultPosition: number,
    resultId?: string,
    resultType?: string
  ): void {
    this.trackEvent('result_selected', {
      query: this.config.collectSearchTerms ? query : '[REDACTED]',
      queryLength: query.length,
      resultPosition,
      resultId: resultId || '[ANONYMOUS]',
      resultType,
      isFirstResult: resultPosition === 0,
    });
  }

  /**
   * Track error occurrence
   */
  trackError(
    errorType: string,
    errorMessage: string,
    query?: string,
    context?: Record<string, any>
  ): void {
    this.trackEvent('error_occurred', {
      errorType,
      errorMessage: this.sanitizeErrorMessage(errorMessage),
      query: query && this.config.collectSearchTerms ? query : '[REDACTED]',
      queryLength: query ? query.length : 0,
      timestamp: Date.now(),
      ...context,
    });
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(feature: string, properties?: Record<string, any>): void {
    this.trackEvent('feature_used', {
      feature,
      ...properties,
    });
  }

  /**
   * Get current analytics metrics
   */
  getMetrics(timeWindow?: number): AnalyticsMetrics {
    // Return cached metrics if still valid
    const now = Date.now();
    if (this.metricsCache && now - this.metricsCacheTimestamp < this.CACHE_DURATION) {
      return this.metricsCache;
    }

    const windowStart = timeWindow ? now - timeWindow : now - 24 * 60 * 60 * 1000; // Default 24 hours
    const relevantEvents = this.eventBuffer.filter(e => e.timestamp >= windowStart);
    const relevantSessions = Array.from(this.sessions.values()).filter(
      s => s.startTime >= windowStart
    );

    const metrics = this.calculateMetrics(relevantEvents, relevantSessions, windowStart, now);

    // Cache the metrics
    this.metricsCache = metrics;
    this.metricsCacheTimestamp = now;

    return metrics;
  }

  /**
   * Analyze user journey funnel
   */
  analyzeFunnel(funnelName: string = 'default'): SearchFunnel {
    const funnelSteps = [
      { name: 'Search Initiated', eventType: 'search_initiated' as const },
      { name: 'Search Completed', eventType: 'search_completed' as const },
      { name: 'Result Viewed', eventType: 'result_viewed' as const },
      { name: 'Result Selected', eventType: 'result_selected' as const },
    ];

    const sessions = Array.from(this.sessions.values());
    const stepCounts = new Map<AnalyticsEventType, number>();
    const stepTimes = new Map<AnalyticsEventType, number[]>();
    const totalUsers = sessions.length;

    // Count events for each step
    for (const session of sessions) {
      const allEvents = [
        ...session.searchEvents,
        ...session.selectionEvents,
        ...session.errorEvents,
      ].sort((a, b) => a.timestamp - b.timestamp);

      const seenSteps = new Set<AnalyticsEventType>();

      for (const event of allEvents) {
        if (!seenSteps.has(event.type) && funnelSteps.some(step => step.eventType === event.type)) {
          stepCounts.set(event.type, (stepCounts.get(event.type) || 0) + 1);
          seenSteps.add(event.type);

          // Track time to reach this step
          const timeToStep = event.timestamp - session.startTime;
          if (!stepTimes.has(event.type)) {
            stepTimes.set(event.type, []);
          }
          stepTimes.get(event.type)!.push(timeToStep);
        }
      }
    }

    // Calculate funnel steps with conversion rates
    const steps = funnelSteps.map((step, index) => {
      const count = stepCounts.get(step.eventType) || 0;
      const previousCount =
        index === 0 ? totalUsers : stepCounts.get(funnelSteps[index - 1].eventType) || 0;
      const conversionRate = previousCount > 0 ? count / previousCount : 0;
      const dropoffRate = 1 - conversionRate;
      const times = stepTimes.get(step.eventType) || [];
      const averageTime =
        times.length > 0 ? times.reduce((sum, t) => sum + t, 0) / times.length : 0;

      return {
        name: step.name,
        eventType: step.eventType,
        count,
        conversionRate,
        dropoffRate,
        averageTime,
      };
    });

    // Calculate overall metrics
    const firstStepCount = steps[0]?.count || 0;
    const lastStepCount = steps[steps.length - 1]?.count || 0;
    const overallConversionRate = firstStepCount > 0 ? lastStepCount / firstStepCount : 0;
    const completionRate = totalUsers > 0 ? lastStepCount / totalUsers : 0;

    // Identify bottlenecks
    const bottlenecks = steps
      .filter(step => step.dropoffRate > 0.3) // More than 30% dropoff
      .map(step => ({
        step: step.name,
        dropoffRate: step.dropoffRate,
        severity: (step.dropoffRate > 0.6 ? 'high' : step.dropoffRate > 0.4 ? 'medium' : 'low') as
          | 'low'
          | 'medium'
          | 'high',
      }));

    return {
      name: funnelName,
      steps,
      overallConversionRate,
      totalUsers,
      completionRate,
      bottlenecks,
    };
  }

  /**
   * Register event handler
   */
  onEvent(handler: (events: AnalyticsEvent[]) => void): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Flush events to handlers
   */
  flush(): void {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    // Notify handlers
    for (const handler of this.eventHandlers) {
      try {
        handler(events);
      } catch (error) {
        console.error('Analytics event handler error:', error);
      }
    }
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.eventBuffer = [];
    this.sessions.clear();
    this.currentSession = null;
    this.metricsCache = null;
    this.metricsCacheTimestamp = 0;
  }

  /**
   * Destroy analytics collector
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
    this.clear();
  }

  // Private implementation methods

  private initialize(): void {
    if (this.config.enabled) {
      // Set up periodic flush
      this.flushTimer = setInterval(() => {
        this.flush();
      }, this.config.flushInterval * 1000);

      // Start initial session
      this.startSession();

      // Clean up old sessions periodically
      setInterval(() => {
        this.cleanupOldSessions();
      }, 300000); // Every 5 minutes
    }
  }

  private getCurrentSession(): UserSession {
    if (!this.currentSession || this.isSessionExpired(this.currentSession)) {
      this.startSession();
    }

    this.currentSession!.lastActivity = Date.now();
    return this.currentSession!;
  }

  private startSession(): void {
    const sessionId = `session_${++this.sessionCounter}_${Date.now()}`;
    const now = Date.now();

    // End previous session
    if (this.currentSession && !this.currentSession.ended) {
      this.endSession(this.currentSession);
    }

    this.currentSession = {
      id: sessionId,
      startTime: now,
      lastActivity: now,
      duration: 0,
      searchEvents: [],
      selectionEvents: [],
      errorEvents: [],
      totalSearches: 0,
      totalSelections: 0,
      totalErrors: 0,
      ended: false,
    };

    this.sessions.set(sessionId, this.currentSession);
    this.trackEvent('session_started');
  }

  private endSession(session: UserSession): void {
    if (session.ended) return;

    session.ended = true;
    session.duration = session.lastActivity - session.startTime;

    // Track session end event
    const tempCurrentSession = this.currentSession;
    this.currentSession = session;
    this.trackEvent('session_ended', {
      sessionDuration: session.duration,
      totalSearches: session.totalSearches,
      totalSelections: session.totalSelections,
      totalErrors: session.totalErrors,
      selectionRate:
        session.totalSearches > 0 ? session.totalSelections / session.totalSearches : 0,
    });
    this.currentSession = tempCurrentSession;
  }

  private updateSession(session: UserSession, event: AnalyticsEvent): void {
    session.lastActivity = event.timestamp;

    switch (event.type) {
      case 'search_initiated':
      case 'search_completed':
        session.searchEvents.push(event);
        if (event.type === 'search_initiated') {
          session.totalSearches++;
        }
        break;
      case 'result_selected':
        session.selectionEvents.push(event);
        session.totalSelections++;
        break;
      case 'error_occurred':
        session.errorEvents.push(event);
        session.totalErrors++;
        break;
    }
  }

  private isSessionExpired(session: UserSession): boolean {
    const inactiveTime = Date.now() - session.lastActivity;
    return inactiveTime > this.config.sessionTimeout * 60 * 1000;
  }

  private cleanupOldSessions(): void {
    const cutoff = Date.now() - this.config.sessionTimeout * 60 * 1000;

    for (const [sessionId, session] of Array.from(this.sessions.entries())) {
      if (session.lastActivity < cutoff && !session.ended) {
        this.endSession(session);
      }

      // Remove very old sessions to free memory
      if (session.startTime < Date.now() - this.config.retentionPeriod * 24 * 60 * 60 * 1000) {
        this.sessions.delete(sessionId);
      }
    }
  }

  private calculateMetrics(
    events: AnalyticsEvent[],
    sessions: UserSession[],
    startTime: number,
    endTime: number
  ): AnalyticsMetrics {
    // Group events by type
    const eventsByType = new Map<AnalyticsEventType, AnalyticsEvent[]>();
    for (const event of events) {
      if (!eventsByType.has(event.type)) {
        eventsByType.set(event.type, []);
      }
      eventsByType.get(event.type)!.push(event);
    }

    const searchEvents = eventsByType.get('search_initiated') || [];
    const completedEvents = eventsByType.get('search_completed') || [];
    const selectionEvents = eventsByType.get('result_selected') || [];
    const errorEvents = eventsByType.get('error_occurred') || [];

    // Calculate search frequency metrics
    const totalSearches = searchEvents.length;
    const averagePerSession = sessions.length > 0 ? totalSearches / sessions.length : 0;

    // Group searches by hour for pattern analysis
    const hourlySearches: Record<string, number> = {};
    for (const event of searchEvents) {
      const hour = new Date(event.timestamp).getHours().toString();
      hourlySearches[hour] = (hourlySearches[hour] || 0) + 1;
    }

    const peakPerHour = Math.max(...Object.values(hourlySearches), 0);

    // Popular search terms (if collection is enabled)
    const termCounts: Record<string, number> = {};
    for (const event of searchEvents) {
      const query = event.properties.query;
      if (query && typeof query === 'string' && query !== '[REDACTED]') {
        termCounts[query] = (termCounts[query] || 0) + 1;
      }
    }

    const popularTerms = Object.entries(termCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([term, count]) => ({ term, count, anonymized: this.config.privacyMode === 'strict' }));

    // Calculate selection metrics
    const totalSelections = selectionEvents.length;
    const selectionRate = totalSearches > 0 ? totalSelections / totalSearches : 0;

    const positions = selectionEvents
      .map(e => e.properties.resultPosition)
      .filter(p => typeof p === 'number');
    const averagePosition =
      positions.length > 0 ? positions.reduce((sum, pos) => sum + pos, 0) / positions.length : 0;

    const positionDistribution: Record<string, number> = {};
    for (const pos of positions) {
      const key = pos.toString();
      positionDistribution[key] = (positionDistribution[key] || 0) + 1;
    }

    const zeroResultQueries = completedEvents.filter(e => e.properties.resultCount === 0).length;

    // Calculate error patterns
    const totalErrors = errorEvents.length;
    const errorRate = totalSearches > 0 ? totalErrors / totalSearches : 0;

    const errorsByType: Record<string, number> = {};
    const errorsBySource: Record<string, number> = {};
    for (const event of errorEvents) {
      const errorType = event.properties.errorType || 'unknown';
      const errorSource = event.properties.dataSource || 'unknown';
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
      errorsBySource[errorSource] = (errorsBySource[errorSource] || 0) + 1;
    }

    // Calculate error recovery rate (subsequent successful searches after error)
    let recoveredErrors = 0;
    for (const session of sessions) {
      const sessionEvents = [...session.searchEvents, ...session.errorEvents].sort(
        (a, b) => a.timestamp - b.timestamp
      );

      for (let i = 0; i < sessionEvents.length - 1; i++) {
        if (
          sessionEvents[i].type === 'error_occurred' &&
          sessionEvents[i + 1].type === 'search_completed'
        ) {
          recoveredErrors++;
        }
      }
    }
    const recoveryRate = totalErrors > 0 ? recoveredErrors / totalErrors : 0;

    // Calculate engagement metrics
    const totalSessions = sessions.length;
    const sessionDurations = sessions.map(s => (s.ended ? s.duration : Date.now() - s.startTime));
    const averageSessionDuration =
      sessionDurations.length > 0
        ? sessionDurations.reduce((sum, d) => sum + d, 0) / sessionDurations.length
        : 0;

    const singleSearchSessions = sessions.filter(s => s.totalSearches === 1).length;
    const bounceRate = totalSessions > 0 ? singleSearchSessions / totalSessions : 0;

    // Feature usage (simplified)
    const featureEvents = eventsByType.get('feature_used') || [];
    const featureUsage: Record<string, number> = {};
    for (const event of featureEvents) {
      const feature = event.properties.feature;
      if (feature) {
        featureUsage[feature] = (featureUsage[feature] || 0) + 1;
      }
    }

    // Performance correlation (simplified correlation analysis)
    const responseTimeSelectionCorr = this.calculateCorrelation(
      completedEvents.map(e => e.properties.responseTime).filter(t => typeof t === 'number'),
      selectionEvents.map((_, i) => (i < completedEvents.length ? 1 : 0))
    );

    return {
      period: {
        start: startTime,
        end: endTime,
        duration: endTime - startTime,
      },
      searchFrequency: {
        total: totalSearches,
        averagePerSession,
        peakPerHour,
        hourlyPattern: hourlySearches,
        popularTerms,
      },
      resultSelection: {
        total: totalSelections,
        selectionRate,
        averagePosition,
        positionDistribution,
        zeroResultQueries,
      },
      errorPatterns: {
        total: totalErrors,
        errorRate,
        byType: errorsByType,
        bySource: errorsBySource,
        recoveryRate,
      },
      engagement: {
        totalSessions,
        averageSessionDuration,
        bounceRate,
        returnUserRate: 0, // Would need persistent user identification
        featureUsage,
      },
      performanceCorrelation: {
        responseTimeCorrelation: responseTimeSelectionCorr,
        errorAbandonmentCorrelation: 0, // Simplified
        loadTimeImpact: 0, // Simplified
      },
    };
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const meanX = x.reduce((sum, val) => sum + val, 0) / x.length;
    const meanY = y.reduce((sum, val) => sum + val, 0) / y.length;

    let numerator = 0;
    let sumSqX = 0;
    let sumSqY = 0;

    for (let i = 0; i < x.length; i++) {
      numerator += (x[i] - meanX) * (y[i] - meanY);
      sumSqX += (x[i] - meanX) ** 2;
      sumSqY += (y[i] - meanY) ** 2;
    }

    const denominator = Math.sqrt(sumSqX * sumSqY);
    return denominator !== 0 ? numerator / denominator : 0;
  }

  private sanitizeProperties(
    properties: Record<string, any>,
    anonymized: boolean
  ): Record<string, any> {
    if (!anonymized) return properties;

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(properties)) {
      if (key === 'query' || key === 'resultId') {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 100) {
        sanitized[key] = '[TRUNCATED]';
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private sanitizeErrorMessage(message: string): string {
    // Remove potentially sensitive information from error messages
    return message
      .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '[DATE]')
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]')
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
  }

  private hasUserConsent(): boolean {
    // Check for user consent (implementation would depend on consent management)
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('analytics-consent') === 'true';
    }
    return this.config.privacyMode !== 'strict';
  }

  private shouldAnonymize(eventType: AnalyticsEventType): boolean {
    const sensitiveEvents: AnalyticsEventType[] = [
      'search_initiated',
      'search_completed',
      'error_occurred',
    ];
    return this.config.privacyMode === 'strict' || sensitiveEvents.includes(eventType);
  }

  private getUserRegion(): string | undefined {
    // Simplified region detection (in practice would use IP geolocation or user settings)
    if (typeof navigator !== 'undefined' && navigator.language) {
      return navigator.language.split('-')[1] || 'US';
    }
    return undefined;
  }

  private getViewportSize(): { width: number; height: number } | undefined {
    if (typeof window !== 'undefined') {
      return {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }
    return undefined;
  }

  private getDeviceType(): 'desktop' | 'mobile' | 'tablet' | undefined {
    if (typeof window === 'undefined') return undefined;

    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }
}

/**
 * Global analytics collector instance
 */
export const analyticsCollector = new AnalyticsCollector();
