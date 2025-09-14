/**
 * Analytics Types - Type definitions for analytics and monitoring
 * @description TypeScript interfaces for performance monitoring, usage analytics, and behavioral tracking
 */

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  /** Enable analytics collection */
  enabled: boolean;
  /** Analytics sample rate (0-1) */
  sampleRate: number;
  /** Privacy mode */
  privacyMode: 'strict' | 'balanced' | 'minimal';
  /** Data retention period in days */
  retentionDays: number;
  /** Collection intervals */
  intervals: {
    /** Metrics collection interval in ms */
    metrics: number;
    /** Usage analytics interval in ms */
    usage: number;
    /** Performance monitoring interval in ms */
    performance: number;
  };
  /** Export configuration */
  export: {
    /** Enable automatic export */
    enabled: boolean;
    /** Export interval in ms */
    interval: number;
    /** Export formats */
    formats: Array<'json' | 'csv' | 'prometheus'>;
    /** Export destinations */
    destinations: string[];
  };
  /** Privacy compliance */
  privacy: {
    /** Require user consent */
    requireConsent: boolean;
    /** Enable data anonymization */
    anonymize: boolean;
    /** IP address anonymization */
    anonymizeIp: boolean;
    /** User ID hashing */
    hashUserId: boolean;
  };
}

/**
 * Connection metrics for data sources
 */
export interface ConnectionMetrics {
  /** Connection establishment time in ms */
  connectionTime: number;
  /** Query execution time in ms */
  queryTime: number;
  /** Total request time in ms */
  totalTime: number;
  /** Request success status */
  success: boolean;
  /** Result count returned */
  resultCount: number;
  /** Error information if failed */
  error?: string;
  /** Data source identifier */
  sourceId: string;
  /** Cache hit/miss status */
  cacheStatus?: 'hit' | 'miss' | 'partial';
}

/**
 * Performance metrics for search operations
 */
export interface PerformanceMetrics {
  /** Query response time in ms */
  responseTime: number;
  /** Result rendering time in ms */
  renderTime: number;
  /** User interaction latency in ms */
  interactionLatency: number;
  /** Cache hit rate (0-1) */
  cacheHitRate: number;
  /** Memory usage in bytes */
  memoryUsage?: number;
  /** Frame rate (FPS) */
  frameRate?: number;
  /** CPU usage percentage */
  cpuUsage?: number;
}

/**
 * Usage metrics for behavioral tracking
 */
export interface UsageMetrics {
  /** Search frequency per session */
  searchFrequency: number;
  /** Result selection rate (0-1) */
  selectionRate: number;
  /** Error occurrence rate (0-1) */
  errorRate: number;
  /** Average session duration in ms */
  sessionDuration: number;
  /** Bounce rate (0-1) */
  bounceRate: number;
  /** Query refinement rate (0-1) */
  refinementRate: number;
  /** Feature usage statistics */
  featureUsage: Record<string, number>;
}

/**
 * Analytics event context
 */
export interface AnalyticsContext {
  /** Session identifier */
  sessionId: string;
  /** User identifier (anonymized) */
  userId?: string;
  /** Timestamp */
  timestamp: number;
  /** Browser information */
  browser?: {
    name: string;
    version: string;
    userAgent: string;
  };
  /** Device information */
  device?: {
    type: 'desktop' | 'mobile' | 'tablet';
    os: string;
    screen: { width: number; height: number };
  };
  /** Location context */
  location?: {
    url: string;
    referrer?: string;
    pathname: string;
  };
}

/**
 * Analytics event
 */
export interface AnalyticsEvent {
  /** Event identifier */
  id: string;
  /** Event type */
  type: string;
  /** Event properties */
  properties: Record<string, any>;
  /** Event context */
  context: AnalyticsContext;
  /** Event timestamp */
  timestamp: number;
  /** Privacy flags */
  privacy: {
    anonymized: boolean;
    consented: boolean;
  };
}

/**
 * Time range for analytics queries
 */
export interface TimeRange {
  /** Start timestamp */
  start: number;
  /** End timestamp */
  end: number;
  /** Time zone offset */
  timezone?: string;
}

/**
 * Analytics manager interface
 */
export interface IAnalyticsManager {
  /** Initialize analytics */
  init(config: AnalyticsConfig): Promise<void>;
  
  /** Collect analytics event */
  collect(event: AnalyticsEvent): void;
  
  /** Get aggregated metrics */
  aggregate(timeRange: TimeRange): Promise<{
    performance: PerformanceMetrics;
    usage: UsageMetrics;
    connections: ConnectionMetrics[];
  }>;
  
  /** Export metrics */
  export(format: 'json' | 'csv' | 'prometheus', timeRange: TimeRange): Promise<string>;
  
  /** Clear collected data */
  clear(timeRange?: TimeRange): void;
  
  /** Enable/disable collection */
  setEnabled(enabled: boolean): void;
  
  /** Update configuration */
  updateConfig(config: Partial<AnalyticsConfig>): void;
}

/**
 * Performance trend data
 */
export interface PerformanceTrendData {
  /** Metric name */
  metric: string;
  /** Time series data points */
  dataPoints: Array<{
    timestamp: number;
    value: number;
  }>;
  /** Trend direction */
  trend: 'improving' | 'stable' | 'degrading';
  /** Statistical summary */
  summary: {
    mean: number;
    median: number;
    standardDeviation: number;
    min: number;
    max: number;
  };
}

/**
 * Analytics dashboard data
 */
export interface AnalyticsDashboardData {
  /** Current performance metrics */
  performance: PerformanceMetrics;
  /** Current usage metrics */
  usage: UsageMetrics;
  /** Performance trends */
  trends: PerformanceTrendData[];
  /** Real-time statistics */
  realTime: {
    activeUsers: number;
    queriesPerMinute: number;
    errorRate: number;
    averageResponseTime: number;
  };
  /** Top queries */
  topQueries: Array<{
    query: string;
    count: number;
    avgResponseTime: number;
  }>;
  /** Error breakdown */
  errors: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
}

/**
 * A/B testing experiment data
 */
export interface ExperimentData {
  /** Experiment identifier */
  experimentId: string;
  /** Variation identifier */
  variationId: string;
  /** User identifier */
  userId: string;
  /** Performance metrics for this variation */
  metrics: PerformanceMetrics;
  /** Conversion events */
  conversions: Array<{
    event: string;
    timestamp: number;
    value?: number;
  }>;
}

/**
 * Analytics aggregation options
 */
export interface AggregationOptions {
  /** Time bucket size */
  bucketSize: '1m' | '5m' | '1h' | '1d';
  /** Aggregation functions */
  functions: Array<'sum' | 'avg' | 'min' | 'max' | 'count' | 'p50' | 'p95' | 'p99'>;
  /** Group by dimensions */
  groupBy?: string[];
  /** Filter conditions */
  filters?: Record<string, any>;
}

/**
 * Real-time analytics stream
 */
export interface AnalyticsStream {
  /** Stream identifier */
  streamId: string;
  /** Stream type */
  type: 'performance' | 'usage' | 'errors' | 'events';
  /** Subscribe to stream */
  subscribe(callback: (data: any) => void): () => void;
  /** Start streaming */
  start(): void;
  /** Stop streaming */
  stop(): void;
  /** Check if streaming is active */
  isActive(): boolean;
}