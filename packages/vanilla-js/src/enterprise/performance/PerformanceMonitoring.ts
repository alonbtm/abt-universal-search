/**
 * PerformanceMonitoring - Real-time performance monitoring with anomaly detection
 * Provides comprehensive performance tracking, alerting, and optimization insights
 */

export interface PerformanceConfig {
  monitoring?: {
    enabled: boolean;
    sampleRate: number; // 0-1
    bufferSize: number;
    flushInterval: number; // ms
  };
  metrics?: {
    core: boolean;
    detailed: boolean;
    custom: boolean;
    userTiming: boolean;
  };
  anomalyDetection?: {
    enabled: boolean;
    thresholds: {
      responseTime: number; // ms
      errorRate: number; // percentage
      memoryGrowth: number; // bytes/minute
      cpuUsage: number; // percentage
    };
    windowSize: number; // number of samples
  };
  alerting?: {
    enabled: boolean;
    channels: ('console' | 'callback' | 'beacon' | 'websocket')[];
    aggregation: boolean;
    cooldown: number; // ms between same alerts
  };
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
  context?: {
    userAgent?: string;
    sessionId?: string;
    userId?: string;
    operation?: string;
  };
}

export interface PerformanceSnapshot {
  timestamp: number;
  metrics: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    memoryUsage: number;
    cacheHitRatio: number;
    activeConnections: number;
  };
  vitals: {
    fcp: number; // First Contentful Paint
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
  };
  resources: {
    jsHeapSize: number;
    domNodes: number;
    eventListeners: number;
    networkRequests: number;
  };
}

export interface PerformanceAnomaly {
  type: 'spike' | 'degradation' | 'outage' | 'memory_leak';
  metric: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detected: number;
  value: number;
  threshold: number;
  context: any;
  resolved?: number;
}

export interface PerformanceAlert {
  id: string;
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  context: any;
  acknowledged: boolean;
}

export class PerformanceMonitoring {
  private config: Required<PerformanceConfig>;
  private metrics: PerformanceMetric[] = [];
  private snapshots: PerformanceSnapshot[] = [];
  private anomalies: PerformanceAnomaly[] = [];
  private alerts: PerformanceAlert[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();
  private timers: Map<string, number> = new Map();
  private counters: Map<string, number> = new Map();
  private flushTimer: number | null = null;
  private alertCallbacks: ((alert: PerformanceAlert) => void)[] = [];
  private alertCooldowns: Map<string, number> = new Map();

  constructor(config: PerformanceConfig = {}) {
    this.config = {
      monitoring: {
        enabled: true,
        sampleRate: 1.0,
        bufferSize: 1000,
        flushInterval: 30000, // 30 seconds
        ...config.monitoring
      },
      metrics: {
        core: true,
        detailed: true,
        custom: true,
        userTiming: true,
        ...config.metrics
      },
      anomalyDetection: {
        enabled: true,
        thresholds: {
          responseTime: 1000, // 1 second
          errorRate: 5, // 5%
          memoryGrowth: 10 * 1024 * 1024, // 10MB/minute
          cpuUsage: 80 // 80%
        },
        windowSize: 50,
        ...config.anomalyDetection
      },
      alerting: {
        enabled: true,
        channels: ['console', 'callback'],
        aggregation: true,
        cooldown: 300000, // 5 minutes
        ...config.alerting
      },
      ...config
    };

    this.init();
  }

  /**
   * Initialize performance monitoring
   */
  private init(): void {
    if (!this.config.monitoring.enabled) return;

    this.setupCoreMetrics();
    this.setupWebVitals();
    this.setupUserTiming();
    this.setupResourceTiming();
    this.setupFlushTimer();
    this.setupAnomalyDetection();

    console.log('[PerformanceMonitoring] Initialized with config:', this.config);
  }

  /**
   * Start timing a specific operation
   */
  startTiming(name: string, context?: any): void {
    const key = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.timers.set(key, performance.now());

    if (this.config.metrics.userTiming) {
      performance.mark(`${name}-start`);
    }

    return key as any; // Type hack for external API
  }

  /**
   * End timing and record metric
   */
  endTiming(name: string, context?: any): number;
  endTiming(key: any): number;
  endTiming(nameOrKey: string | any, context?: any): number {
    let name: string;
    let startTime: number | undefined;

    if (typeof nameOrKey === 'string') {
      name = nameOrKey;
      // Find most recent timer for this name
      for (const [key, time] of this.timers.entries()) {
        if (key.startsWith(name)) {
          startTime = time;
          this.timers.delete(key);
          break;
        }
      }
    } else {
      const key = nameOrKey;
      startTime = this.timers.get(key);
      if (startTime) {
        name = key.split('_')[0];
        this.timers.delete(key);
      } else {
        console.warn('[PerformanceMonitoring] Timer not found:', key);
        return 0;
      }
    }

    if (startTime === undefined) {
      console.warn('[PerformanceMonitoring] No start time found for:', name);
      return 0;
    }

    const duration = performance.now() - startTime;

    if (this.config.metrics.userTiming) {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
    }

    this.recordMetric({
      name: `${name}.duration`,
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      context
    });

    return duration;
  }

  /**
   * Record custom metric
   */
  recordMetric(metric: Omit<PerformanceMetric, 'timestamp'> & { timestamp?: number }): void {
    if (!this.shouldSample()) return;

    const fullMetric: PerformanceMetric = {
      timestamp: Date.now(),
      ...metric
    };

    this.metrics.push(fullMetric);

    // Check for anomalies
    if (this.config.anomalyDetection.enabled) {
      this.checkForAnomalies(fullMetric);
    }

    // Trim buffer if necessary
    if (this.metrics.length > this.config.monitoring.bufferSize) {
      this.metrics = this.metrics.slice(-this.config.monitoring.bufferSize);
    }
  }

  /**
   * Increment counter metric
   */
  incrementCounter(name: string, value = 1, tags?: Record<string, string>): void {
    const current = this.counters.get(name) || 0;
    const newValue = current + value;
    this.counters.set(name, newValue);

    this.recordMetric({
      name: `${name}.count`,
      value: newValue,
      unit: 'count',
      tags
    });
  }

  /**
   * Record gauge metric (current value)
   */
  recordGauge(name: string, value: number, unit = 'units', tags?: Record<string, string>): void {
    this.recordMetric({
      name: `${name}.gauge`,
      value,
      unit,
      tags
    });
  }

  /**
   * Record histogram metric
   */
  recordHistogram(name: string, value: number, buckets?: number[], tags?: Record<string, string>): void {
    this.recordMetric({
      name: `${name}.histogram`,
      value,
      unit: 'units',
      tags: { ...tags, type: 'histogram' }
    });

    // Record in buckets if provided
    if (buckets) {
      for (const bucket of buckets) {
        if (value <= bucket) {
          this.incrementCounter(`${name}.bucket.${bucket}`, 1, tags);
          break;
        }
      }
    }
  }

  /**
   * Take performance snapshot
   */
  takeSnapshot(): PerformanceSnapshot {
    const snapshot: PerformanceSnapshot = {
      timestamp: Date.now(),
      metrics: this.calculateCurrentMetrics(),
      vitals: this.getWebVitals(),
      resources: this.getResourceMetrics()
    };

    this.snapshots.push(snapshot);

    // Keep only last 100 snapshots
    if (this.snapshots.length > 100) {
      this.snapshots = this.snapshots.slice(-100);
    }

    return snapshot;
  }

  /**
   * Get performance summary
   */
  getSummary(timeWindow = 300000): { // 5 minutes
    metrics: Record<string, { avg: number; min: number; max: number; p95: number; p99: number }>;
    anomalies: PerformanceAnomaly[];
    alerts: PerformanceAlert[];
  } {
    const cutoff = Date.now() - timeWindow;
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff);

    const metricGroups = recentMetrics.reduce((groups, metric) => {
      if (!groups[metric.name]) {
        groups[metric.name] = [];
      }
      groups[metric.name].push(metric.value);
      return groups;
    }, {} as Record<string, number[]>);

    const metrics: Record<string, any> = {};
    for (const [name, values] of Object.entries(metricGroups)) {
      if (values.length === 0) continue;

      const sorted = [...values].sort((a, b) => a - b);
      metrics[name] = {
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        p95: sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1],
        p99: sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1]
      };
    }

    return {
      metrics,
      anomalies: this.anomalies.filter(a => a.detected >= cutoff),
      alerts: this.alerts.filter(a => a.timestamp >= cutoff)
    };
  }

  /**
   * Add alert callback
   */
  onAlert(callback: (alert: PerformanceAlert) => void): () => void {
    this.alertCallbacks.push(callback);
    return () => {
      const index = this.alertCallbacks.indexOf(callback);
      if (index > -1) {
        this.alertCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Export metrics data
   */
  exportMetrics(format: 'json' | 'csv' | 'prometheus' = 'json', timeWindow?: number): string {
    const cutoff = timeWindow ? Date.now() - timeWindow : 0;
    const exportData = this.metrics.filter(m => m.timestamp >= cutoff);

    switch (format) {
      case 'json':
        return JSON.stringify({
          metrics: exportData,
          snapshots: this.snapshots.filter(s => s.timestamp >= cutoff),
          anomalies: this.anomalies.filter(a => a.detected >= cutoff)
        }, null, 2);

      case 'csv':
        return this.exportToCSV(exportData);

      case 'prometheus':
        return this.exportToPrometheusFormat(exportData);

      default:
        return JSON.stringify(exportData);
    }
  }

  /**
   * Private implementation methods
   */
  private setupCoreMetrics(): void {
    if (!this.config.metrics.core) return;

    // Monitor key performance indicators
    setInterval(() => {
      this.recordMemoryMetrics();
      this.recordNetworkMetrics();
      this.recordDOMMetrics();
    }, 5000);
  }

  private setupWebVitals(): void {
    if (!this.config.metrics.core) return;

    // First Contentful Paint
    this.observePerformanceEntry('paint', (entries) => {
      entries.forEach(entry => {
        if (entry.name === 'first-contentful-paint') {
          this.recordMetric({
            name: 'vitals.fcp',
            value: entry.startTime,
            unit: 'ms'
          });
        }
      });
    });

    // Largest Contentful Paint
    this.observePerformanceEntry('largest-contentful-paint', (entries) => {
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        this.recordMetric({
          name: 'vitals.lcp',
          value: lastEntry.startTime,
          unit: 'ms'
        });
      }
    });

    // First Input Delay
    this.observePerformanceEntry('first-input', (entries) => {
      entries.forEach(entry => {
        this.recordMetric({
          name: 'vitals.fid',
          value: entry.processingStart - entry.startTime,
          unit: 'ms'
        });
      });
    });

    // Cumulative Layout Shift
    this.observePerformanceEntry('layout-shift', (entries) => {
      let clsValue = 0;
      entries.forEach(entry => {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      });

      if (clsValue > 0) {
        this.recordMetric({
          name: 'vitals.cls',
          value: clsValue,
          unit: 'score'
        });
      }
    });
  }

  private setupUserTiming(): void {
    if (!this.config.metrics.userTiming) return;

    this.observePerformanceEntry('measure', (entries) => {
      entries.forEach(entry => {
        this.recordMetric({
          name: `timing.${entry.name}`,
          value: entry.duration,
          unit: 'ms'
        });
      });
    });
  }

  private setupResourceTiming(): void {
    if (!this.config.metrics.detailed) return;

    this.observePerformanceEntry('resource', (entries) => {
      entries.forEach(entry => {
        const resource = entry as PerformanceResourceTiming;
        this.recordMetric({
          name: 'resource.duration',
          value: resource.duration,
          unit: 'ms',
          tags: {
            type: this.getResourceType(resource.name),
            size: resource.transferSize ? resource.transferSize.toString() : 'unknown'
          }
        });
      });
    });
  }

  private observePerformanceEntry(
    entryType: string,
    callback: (entries: PerformanceEntry[]) => void
  ): void {
    if (!window.PerformanceObserver) return;

    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });

      observer.observe({ entryTypes: [entryType] });
      this.observers.set(entryType, observer);
    } catch (error) {
      console.warn(`[PerformanceMonitoring] Cannot observe ${entryType}:`, error);
    }
  }

  private recordMemoryMetrics(): void {
    const memory = (performance as any).memory;
    if (memory) {
      this.recordGauge('memory.heap.used', memory.usedJSHeapSize, 'bytes');
      this.recordGauge('memory.heap.total', memory.totalJSHeapSize, 'bytes');
      this.recordGauge('memory.heap.limit', memory.jsHeapSizeLimit, 'bytes');
    }
  }

  private recordNetworkMetrics(): void {
    const connection = (navigator as any).connection;
    if (connection) {
      this.recordGauge('network.downlink', connection.downlink, 'mbps');
      this.recordGauge('network.rtt', connection.rtt, 'ms');
      this.recordMetric({
        name: 'network.type',
        value: connection.effectiveType === '4g' ? 4 : connection.effectiveType === '3g' ? 3 : 2,
        unit: 'generation'
      });
    }
  }

  private recordDOMMetrics(): void {
    this.recordGauge('dom.nodes', document.querySelectorAll('*').length, 'count');
    this.recordGauge('dom.scripts', document.scripts.length, 'count');
    this.recordGauge('dom.stylesheets', document.styleSheets.length, 'count');
  }

  private checkForAnomalies(metric: PerformanceMetric): void {
    const recentMetrics = this.getRecentMetrics(metric.name, this.config.anomalyDetection.windowSize);
    if (recentMetrics.length < 10) return; // Need enough data

    const values = recentMetrics.map(m => m.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / values.length);

    // Detect spikes (value > avg + 3*stdDev)
    if (metric.value > avg + 3 * stdDev && stdDev > 0) {
      this.recordAnomaly({
        type: 'spike',
        metric: metric.name,
        severity: this.calculateSeverity(metric.value, avg + 3 * stdDev),
        detected: Date.now(),
        value: metric.value,
        threshold: avg + 3 * stdDev,
        context: metric.context || {}
      });
    }

    // Detect degradation (sustained poor performance)
    const recentAvg = values.slice(-5).reduce((a, b) => a + b, 0) / 5;
    if (recentAvg > avg * 1.5) {
      this.recordAnomaly({
        type: 'degradation',
        metric: metric.name,
        severity: this.calculateSeverity(recentAvg, avg * 1.5),
        detected: Date.now(),
        value: recentAvg,
        threshold: avg * 1.5,
        context: metric.context || {}
      });
    }

    // Check specific thresholds
    this.checkThresholds(metric);
  }

  private checkThresholds(metric: PerformanceMetric): void {
    const thresholds = this.config.anomalyDetection.thresholds;

    if (metric.name.includes('duration') || metric.name.includes('responseTime')) {
      if (metric.value > thresholds.responseTime) {
        this.triggerAlert({
          type: 'response_time_threshold',
          message: `Response time exceeded threshold: ${metric.value}ms > ${thresholds.responseTime}ms`,
          severity: metric.value > thresholds.responseTime * 2 ? 'critical' : 'high',
          context: { metric, threshold: thresholds.responseTime }
        });
      }
    }

    if (metric.name.includes('error')) {
      if (metric.value > thresholds.errorRate) {
        this.triggerAlert({
          type: 'error_rate_threshold',
          message: `Error rate exceeded threshold: ${metric.value}% > ${thresholds.errorRate}%`,
          severity: metric.value > thresholds.errorRate * 2 ? 'critical' : 'high',
          context: { metric, threshold: thresholds.errorRate }
        });
      }
    }
  }

  private recordAnomaly(anomaly: Omit<PerformanceAnomaly, 'resolved'>): void {
    const fullAnomaly: PerformanceAnomaly = {
      ...anomaly
    };

    this.anomalies.push(fullAnomaly);

    // Keep only recent anomalies
    const cutoff = Date.now() - 86400000; // 24 hours
    this.anomalies = this.anomalies.filter(a => a.detected >= cutoff);

    // Trigger alert
    this.triggerAlert({
      type: `anomaly_${anomaly.type}`,
      message: `Anomaly detected: ${anomaly.metric} ${anomaly.type}`,
      severity: anomaly.severity,
      context: anomaly
    });
  }

  private triggerAlert(alert: Omit<PerformanceAlert, 'id' | 'timestamp' | 'acknowledged'>): void {
    if (!this.config.alerting.enabled) return;

    const alertKey = `${alert.type}_${alert.context?.metric?.name || 'general'}`;
    const cooldown = this.alertCooldowns.get(alertKey);

    if (cooldown && Date.now() - cooldown < this.config.alerting.cooldown) {
      return; // Still in cooldown
    }

    const fullAlert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      acknowledged: false,
      ...alert
    };

    this.alerts.push(fullAlert);
    this.alertCooldowns.set(alertKey, Date.now());

    // Dispatch through configured channels
    this.dispatchAlert(fullAlert);

    // Keep only recent alerts
    const cutoff = Date.now() - 86400000; // 24 hours
    this.alerts = this.alerts.filter(a => a.timestamp >= cutoff);
  }

  private dispatchAlert(alert: PerformanceAlert): void {
    const channels = this.config.alerting.channels;

    if (channels.includes('console')) {
      const level = alert.severity === 'critical' ? 'error' :
                   alert.severity === 'high' ? 'warn' : 'log';
      console[level](`[PerformanceAlert] ${alert.message}`, alert);
    }

    if (channels.includes('callback')) {
      this.alertCallbacks.forEach(callback => {
        try {
          callback(alert);
        } catch (error) {
          console.error('[PerformanceMonitoring] Alert callback error:', error);
        }
      });
    }

    if (channels.includes('beacon')) {
      this.sendBeacon(alert);
    }
  }

  private sendBeacon(data: any): void {
    if (navigator.sendBeacon) {
      const payload = JSON.stringify(data);
      navigator.sendBeacon('/api/performance/alert', payload);
    }
  }

  private calculateCurrentMetrics(): PerformanceSnapshot['metrics'] {
    const recent = this.metrics.filter(m => m.timestamp > Date.now() - 60000); // Last minute

    const responseTimeMetrics = recent.filter(m => m.name.includes('duration'));
    const errorMetrics = recent.filter(m => m.name.includes('error'));
    const cacheMetrics = recent.filter(m => m.name.includes('cache'));

    return {
      responseTime: responseTimeMetrics.length > 0 ?
        responseTimeMetrics.reduce((a, m) => a + m.value, 0) / responseTimeMetrics.length : 0,
      throughput: recent.length,
      errorRate: errorMetrics.length > 0 ?
        errorMetrics.reduce((a, m) => a + m.value, 0) / errorMetrics.length : 0,
      memoryUsage: this.getLatestMemoryUsage(),
      cacheHitRatio: cacheMetrics.length > 0 ?
        cacheMetrics.reduce((a, m) => a + m.value, 0) / cacheMetrics.length : 0,
      activeConnections: this.countActiveConnections()
    };
  }

  private getWebVitals(): PerformanceSnapshot['vitals'] {
    const getLatestMetric = (name: string) => {
      const metrics = this.metrics.filter(m => m.name === name);
      return metrics.length > 0 ? metrics[metrics.length - 1].value : 0;
    };

    return {
      fcp: getLatestMetric('vitals.fcp'),
      lcp: getLatestMetric('vitals.lcp'),
      fid: getLatestMetric('vitals.fid'),
      cls: getLatestMetric('vitals.cls')
    };
  }

  private getResourceMetrics(): PerformanceSnapshot['resources'] {
    const memory = (performance as any).memory;

    return {
      jsHeapSize: memory?.usedJSHeapSize || 0,
      domNodes: document.querySelectorAll('*').length,
      eventListeners: this.countEventListeners(),
      networkRequests: this.countNetworkRequests()
    };
  }

  private getRecentMetrics(name: string, count: number): PerformanceMetric[] {
    return this.metrics
      .filter(m => m.name === name)
      .slice(-count);
  }

  private calculateSeverity(value: number, threshold: number): PerformanceAnomaly['severity'] {
    const ratio = value / threshold;
    if (ratio >= 3) return 'critical';
    if (ratio >= 2) return 'high';
    if (ratio >= 1.5) return 'medium';
    return 'low';
  }

  private getResourceType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    if (!extension) return 'other';

    if (['js', 'mjs'].includes(extension)) return 'script';
    if (['css'].includes(extension)) return 'stylesheet';
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(extension)) return 'image';
    if (['woff', 'woff2', 'ttf', 'otf'].includes(extension)) return 'font';
    if (['json', 'xml'].includes(extension)) return 'xhr';
    return 'other';
  }

  private getLatestMemoryUsage(): number {
    const memory = (performance as any).memory;
    return memory ? memory.usedJSHeapSize : 0;
  }

  private countActiveConnections(): number {
    // Simplified count - would be more sophisticated in real implementation
    return 1;
  }

  private countEventListeners(): number {
    // Count registered event listeners
    return document.querySelectorAll('*[onclick], *[onload], *[onerror]').length;
  }

  private countNetworkRequests(): number {
    // Count active network requests
    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const recent = entries.filter(e => e.responseEnd > Date.now() - 60000);
    return recent.length;
  }

  private shouldSample(): boolean {
    return Math.random() < this.config.monitoring.sampleRate;
  }

  private setupFlushTimer(): void {
    this.flushTimer = window.setInterval(() => {
      this.flushMetrics();
    }, this.config.monitoring.flushInterval);
  }

  private flushMetrics(): void {
    if (this.metrics.length === 0) return;

    const snapshot = this.takeSnapshot();

    // Would send to analytics service in real implementation
    console.debug('[PerformanceMonitoring] Metrics flushed:', {
      metricCount: this.metrics.length,
      snapshot
    });
  }

  private setupAnomalyDetection(): void {
    if (!this.config.anomalyDetection.enabled) return;

    // Run anomaly detection every 30 seconds
    setInterval(() => {
      this.runAnomalyDetection();
    }, 30000);
  }

  private runAnomalyDetection(): void {
    // Check for memory leaks
    const memoryGrowth = this.calculateMemoryGrowth();
    if (memoryGrowth > this.config.anomalyDetection.thresholds.memoryGrowth) {
      this.recordAnomaly({
        type: 'memory_leak',
        metric: 'memory.growth',
        severity: 'high',
        detected: Date.now(),
        value: memoryGrowth,
        threshold: this.config.anomalyDetection.thresholds.memoryGrowth,
        context: { growthRate: memoryGrowth }
      });
    }
  }

  private calculateMemoryGrowth(): number {
    const memoryMetrics = this.metrics
      .filter(m => m.name === 'memory.heap.used.gauge')
      .slice(-10); // Last 10 measurements

    if (memoryMetrics.length < 2) return 0;

    const oldest = memoryMetrics[0];
    const newest = memoryMetrics[memoryMetrics.length - 1];
    const timeSpan = newest.timestamp - oldest.timestamp;

    return timeSpan > 0 ?
      ((newest.value - oldest.value) / timeSpan) * 60000 : // bytes per minute
      0;
  }

  private exportToCSV(metrics: PerformanceMetric[]): string {
    const headers = ['timestamp', 'name', 'value', 'unit', 'tags'];
    const rows = metrics.map(m => [
      m.timestamp,
      m.name,
      m.value,
      m.unit,
      m.tags ? JSON.stringify(m.tags) : ''
    ]);

    return [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
  }

  private exportToPrometheusFormat(metrics: PerformanceMetric[]): string {
    const lines: string[] = [];
    const grouped = metrics.reduce((groups, metric) => {
      if (!groups[metric.name]) {
        groups[metric.name] = [];
      }
      groups[metric.name].push(metric);
      return groups;
    }, {} as Record<string, PerformanceMetric[]>);

    for (const [name, metricGroup] of Object.entries(grouped)) {
      const prometheusName = name.replace(/[^a-zA-Z0-9_]/g, '_');
      lines.push(`# TYPE ${prometheusName} gauge`);

      for (const metric of metricGroup) {
        const labels = metric.tags ?
          Object.entries(metric.tags).map(([k, v]) => `${k}="${v}"`).join(',') :
          '';
        lines.push(`${prometheusName}{${labels}} ${metric.value} ${metric.timestamp}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers.clear();

    this.metrics = [];
    this.snapshots = [];
    this.anomalies = [];
    this.alerts = [];
    this.timers.clear();
    this.counters.clear();
    this.alertCallbacks = [];
    this.alertCooldowns.clear();
  }
}