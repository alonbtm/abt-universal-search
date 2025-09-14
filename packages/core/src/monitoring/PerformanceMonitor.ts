/**
 * Performance Monitor - Real-time performance tracking and alerting system
 * @description Monitors response times, cache hit rates, memory usage, and provides alerts
 */

import {
  PerformanceConfig,
  PerformanceMetrics,
  PerformanceMeasurement,
  PerformanceAlert,
  PerformanceBenchmark,
  PerformanceTrend,
  IPerformanceMonitor,
  OptimizationRecommendation
} from '../types/Performance.js';

/**
 * Default performance configuration
 */
const DEFAULT_CONFIG: PerformanceConfig = {
  responseTimeTarget: 100, // 100ms
  memoryThreshold: 100 * 1024 * 1024, // 100MB
  monitoringEnabled: true,
  sampleRate: 1.0,
  metricsInterval: 5000, // 5 seconds
  autoOptimization: false,
  optimizationTriggers: {
    responseTimeThreshold: 500,
    memoryThreshold: 200 * 1024 * 1024,
    errorRateThreshold: 0.05,
    cacheHitRateThreshold: 0.7
  },
  alerting: {
    enabled: true,
    channels: ['console'],
    thresholds: {
      responseTime: 1000,
      memoryUsage: 500 * 1024 * 1024,
      errorRate: 0.1,
      cacheHitRate: 0.5
    }
  }
};

/**
 * Metrics Collector
 */
class MetricsCollector {
  private measurements: Map<string, PerformanceMeasurement[]>;
  private metrics: PerformanceMetrics;
  private sampleRate: number;
  private metricsInterval: number;
  private intervalId: NodeJS.Timeout | null;

  constructor(sampleRate: number, metricsInterval: number) {
    this.measurements = new Map();
    this.sampleRate = sampleRate;
    this.metricsInterval = metricsInterval;
    this.intervalId = null;
    
    // Initialize metrics
    this.metrics = {
      responseTime: {
        average: 0,
        median: 0,
        p95: 0,
        p99: 0,
        min: 0,
        max: 0
      },
      throughput: {
        requestsPerSecond: 0,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0
      },
      memory: {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        rss: 0,
        cacheSize: 0
      },
      cpu: {
        usage: 0,
        loadAverage: []
      },
      cache: {
        hitRate: 0,
        missRate: 0,
        evictionRate: 0,
        averageGetTime: 0,
        averageSetTime: 0
      },
      errors: {
        totalErrors: 0,
        errorRate: 0,
        errorsByType: {}
      },
      timeWindow: {
        start: Date.now(),
        end: Date.now(),
        duration: 0
      }
    };
  }

  startCollection(): void {
    if (this.intervalId) return;
    
    this.intervalId = setInterval(() => {
      this.calculateMetrics();
    }, this.metricsInterval);
  }

  stopCollection(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  recordMeasurement(measurement: PerformanceMeasurement): void {
    if (Math.random() > this.sampleRate) return;
    
    const operation = measurement.operation;
    if (!this.measurements.has(operation)) {
      this.measurements.set(operation, []);
    }
    
    const measurements = this.measurements.get(operation)!;
    measurements.push(measurement);
    
    // Keep only recent measurements (last 1000)
    if (measurements.length > 1000) {
      measurements.shift();
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getRecentMeasurements(operation?: string, timeWindow?: number): PerformanceMeasurement[] {
    const cutoff = timeWindow ? Date.now() - timeWindow : 0;
    const allMeasurements: PerformanceMeasurement[] = [];
    
    if (operation) {
      const measurements = this.measurements.get(operation) || [];
      allMeasurements.push(...measurements.filter(m => m.startTime >= cutoff));
    } else {
      for (const measurements of Array.from(this.measurements.values())) {
        allMeasurements.push(...measurements.filter(m => m.startTime >= cutoff));
      }
    }
    
    return allMeasurements.sort((a, b) => b.startTime - a.startTime);
  }

  private calculateMetrics(): void {
    const now = Date.now();
    const timeWindow = 60000; // 1 minute window
    const recentMeasurements = this.getRecentMeasurements(undefined, timeWindow);
    
    if (recentMeasurements.length === 0) {
      return;
    }

    // Calculate response time metrics
    const responseTimes = recentMeasurements
      .filter(m => m.duration !== undefined && m.duration > 0)
      .map(m => m.duration!)
      .sort((a, b) => a - b);
    
    if (responseTimes.length > 0) {
      this.metrics.responseTime = {
        average: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
        median: this.getPercentile(responseTimes, 0.5),
        p95: this.getPercentile(responseTimes, 0.95),
        p99: this.getPercentile(responseTimes, 0.99),
        min: responseTimes[0],
        max: responseTimes[responseTimes.length - 1]
      };
    }

    // Calculate throughput metrics
    const windowStart = now - timeWindow;
    const requestsInWindow = recentMeasurements.filter(m => m.startTime >= windowStart);
    const successfulRequests = requestsInWindow.filter(m => m.success !== false).length;
    const failedRequests = requestsInWindow.filter(m => m.success === false).length;
    
    this.metrics.throughput = {
      requestsPerSecond: requestsInWindow.length / (timeWindow / 1000),
      totalRequests: requestsInWindow.length,
      successfulRequests,
      failedRequests
    };

    // Update memory metrics
    this.updateMemoryMetrics();
    
    // Update CPU metrics
    this.updateCPUMetrics();
    
    // Calculate cache metrics (if available)
    this.updateCacheMetrics();
    
    // Calculate error metrics
    this.metrics.errors = {
      totalErrors: failedRequests,
      errorRate: requestsInWindow.length > 0 ? failedRequests / requestsInWindow.length : 0,
      errorsByType: this.calculateErrorsByType(recentMeasurements)
    };
    
    // Update time window
    this.metrics.timeWindow = {
      start: windowStart,
      end: now,
      duration: timeWindow
    };
  }

  private getPercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  private updateMemoryMetrics(): void {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const mem = process.memoryUsage();
      this.metrics.memory = {
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        external: mem.external,
        rss: mem.rss,
        cacheSize: 0 // Will be updated from cache manager
      };
    } else if (typeof performance !== 'undefined' && (performance as any).memory) {
      const mem = (performance as any).memory;
      this.metrics.memory = {
        heapUsed: mem.usedJSHeapSize,
        heapTotal: mem.totalJSHeapSize,
        external: 0,
        rss: 0,
        cacheSize: 0
      };
    }
  }

  private updateCPUMetrics(): void {
    if (typeof process !== 'undefined') {
      // Get CPU usage (Node.js)
      const usage = process.cpuUsage();
      this.metrics.cpu = {
        usage: (usage.user + usage.system) / 1000000, // Convert to seconds
        loadAverage: (process as any).loadavg ? (process as any).loadavg() : []
      };
    } else {
      // Browser fallback
      this.metrics.cpu = {
        usage: 0,
        loadAverage: []
      };
    }
  }

  private updateCacheMetrics(): void {
    // Cache metrics will be updated externally by cache managers
    // This is a placeholder for the structure
  }

  private calculateErrorsByType(measurements: PerformanceMeasurement[]): Record<string, number> {
    const errorsByType: Record<string, number> = {};
    
    for (const measurement of measurements) {
      if (measurement.error) {
        const errorType = this.classifyError(measurement.error);
        errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
      }
    }
    
    return errorsByType;
  }

  private classifyError(error: string): string {
    if (error.includes('timeout')) return 'timeout';
    if (error.includes('network')) return 'network';
    if (error.includes('memory')) return 'memory';
    if (error.includes('validation')) return 'validation';
    return 'unknown';
  }
}

/**
 * Alert Manager
 */
class AlertManager {
  private config: PerformanceConfig['alerting'];
  private alertHandlers: Array<(alert: PerformanceAlert) => void>;
  private alertHistory: Map<string, PerformanceAlert[]>;
  private suppressionRules: Map<string, {
    until: number;
    count: number;
  }>;

  constructor(config: PerformanceConfig['alerting']) {
    this.config = config;
    this.alertHandlers = [];
    this.alertHistory = new Map();
    this.suppressionRules = new Map();
  }

  addHandler(handler: (alert: PerformanceAlert) => void): void {
    this.alertHandlers.push(handler);
  }

  checkThresholds(metrics: PerformanceMetrics): void {
    if (!this.config.enabled) return;

    const now = Date.now();
    
    // Check response time threshold
    if (metrics.responseTime.average > this.config.thresholds.responseTime) {
      this.createAlert({
        severity: 'warning',
        title: 'High Response Time',
        message: `Average response time (${metrics.responseTime.average.toFixed(2)}ms) exceeds threshold (${this.config.thresholds.responseTime}ms)`,
        source: 'response_time',
        metric: 'responseTime',
        currentValue: metrics.responseTime.average,
        thresholdValue: this.config.thresholds.responseTime,
        actions: [
          'Check system resources',
          'Review recent deployments',
          'Optimize database queries'
        ]
      });
    }

    // Check memory usage threshold
    if (metrics.memory.heapUsed > this.config.thresholds.memoryUsage) {
      this.createAlert({
        severity: 'error',
        title: 'High Memory Usage',
        message: `Heap usage (${(metrics.memory.heapUsed / 1024 / 1024).toFixed(2)}MB) exceeds threshold (${(this.config.thresholds.memoryUsage / 1024 / 1024).toFixed(2)}MB)`,
        source: 'memory',
        metric: 'memoryUsage',
        currentValue: metrics.memory.heapUsed,
        thresholdValue: this.config.thresholds.memoryUsage,
        actions: [
          'Trigger garbage collection',
          'Check for memory leaks',
          'Scale up resources'
        ]
      });
    }

    // Check error rate threshold
    if (metrics.errors.errorRate > this.config.thresholds.errorRate) {
      this.createAlert({
        severity: 'error',
        title: 'High Error Rate',
        message: `Error rate (${(metrics.errors.errorRate * 100).toFixed(2)}%) exceeds threshold (${(this.config.thresholds.errorRate * 100).toFixed(2)}%)`,
        source: 'errors',
        metric: 'errorRate',
        currentValue: metrics.errors.errorRate,
        thresholdValue: this.config.thresholds.errorRate,
        actions: [
          'Check application logs',
          'Review recent changes',
          'Validate external dependencies'
        ]
      });
    }

    // Check cache hit rate threshold
    if (metrics.cache.hitRate < this.config.thresholds.cacheHitRate) {
      this.createAlert({
        severity: 'warning',
        title: 'Low Cache Hit Rate',
        message: `Cache hit rate (${(metrics.cache.hitRate * 100).toFixed(2)}%) is below threshold (${(this.config.thresholds.cacheHitRate * 100).toFixed(2)}%)`,
        source: 'cache',
        metric: 'cacheHitRate',
        currentValue: metrics.cache.hitRate,
        thresholdValue: this.config.thresholds.cacheHitRate,
        actions: [
          'Review cache configuration',
          'Check cache warming',
          'Optimize cache keys'
        ]
      });
    }
  }

  private createAlert(alertData: Partial<PerformanceAlert>): void {
    const now = Date.now();
    const alertId = `${alertData.source}_${alertData.metric}_${now}`;
    
    // Check suppression rules
    const suppressionKey = `${alertData.source}_${alertData.metric}`;
    const suppression = this.suppressionRules.get(suppressionKey);
    
    if (suppression && now < suppression.until) {
      suppression.count++;
      return;
    }

    const alert: PerformanceAlert = {
      id: alertId,
      severity: alertData.severity || 'warning',
      title: alertData.title || 'Performance Alert',
      message: alertData.message || 'Performance threshold exceeded',
      timestamp: now,
      source: alertData.source || 'unknown',
      metric: alertData.metric || 'unknown',
      currentValue: alertData.currentValue || 0,
      thresholdValue: alertData.thresholdValue || 0,
      duration: 0,
      actions: alertData.actions || [],
      metadata: alertData.metadata || {}
    };

    // Store in history
    if (!this.alertHistory.has(suppressionKey)) {
      this.alertHistory.set(suppressionKey, []);
    }
    
    const history = this.alertHistory.get(suppressionKey)!;
    history.push(alert);
    
    // Keep only recent alerts (last 100)
    if (history.length > 100) {
      history.shift();
    }

    // Set suppression rule (don't repeat same alert for 5 minutes)
    this.suppressionRules.set(suppressionKey, {
      until: now + 300000, // 5 minutes
      count: 0
    });

    // Notify handlers
    this.alertHandlers.forEach(handler => {
      try {
        handler(alert);
      } catch (error) {
        console.error('Alert handler error:', error);
      }
    });
  }

  getAlertHistory(source?: string): PerformanceAlert[] {
    const allAlerts: PerformanceAlert[] = [];
    
    for (const [key, alerts] of Array.from(this.alertHistory.entries())) {
      if (!source || key.startsWith(source)) {
        allAlerts.push(...alerts);
      }
    }
    
    return allAlerts.sort((a, b) => b.timestamp - a.timestamp);
  }
}

/**
 * Trend Analyzer
 */
class TrendAnalyzer {
  private dataPoints: Map<string, Array<{ timestamp: number; value: number }>>;
  private maxDataPoints: number;

  constructor(maxDataPoints: number = 1000) {
    this.dataPoints = new Map();
    this.maxDataPoints = maxDataPoints;
  }

  recordDataPoint(metric: string, value: number, timestamp?: number): void {
    if (!this.dataPoints.has(metric)) {
      this.dataPoints.set(metric, []);
    }
    
    const points = this.dataPoints.get(metric)!;
    points.push({
      timestamp: timestamp || Date.now(),
      value
    });
    
    // Keep only recent data points
    if (points.length > this.maxDataPoints) {
      points.shift();
    }
  }

  analyzeTrend(metric: string, timeWindow?: number): PerformanceTrend | null {
    const points = this.dataPoints.get(metric);
    if (!points || points.length < 10) return null;
    
    const cutoff = timeWindow ? Date.now() - timeWindow : 0;
    const relevantPoints = points.filter(p => p.timestamp >= cutoff);
    
    if (relevantPoints.length < 10) return null;

    // Calculate trend direction using linear regression
    const { slope, correlation } = this.calculateLinearRegression(relevantPoints);
    
    let direction: 'improving' | 'degrading' | 'stable' = 'stable';
    const threshold = 0.1;
    
    if (Math.abs(correlation) > threshold) {
      if (slope > 0) {
        direction = metric.includes('error') || metric.includes('latency') ? 'degrading' : 'improving';
      } else {
        direction = metric.includes('error') || metric.includes('latency') ? 'improving' : 'degrading';
      }
    }

    // Detect seasonality (simple approach)
    const seasonality = this.detectSeasonality(relevantPoints);
    
    // Detect anomalies
    const anomalies = this.detectAnomalies(relevantPoints);
    
    // Generate forecast (simple linear extrapolation)
    const forecast = this.generateForecast(relevantPoints, slope, 10);

    return {
      metric,
      timeSeries: relevantPoints,
      direction,
      strength: Math.abs(correlation),
      seasonality,
      anomalies,
      forecast
    };
  }

  private calculateLinearRegression(points: Array<{ timestamp: number; value: number }>): {
    slope: number;
    intercept: number;
    correlation: number;
  } {
    const n = points.length;
    if (n === 0) return { slope: 0, intercept: 0, correlation: 0 };

    // Normalize timestamps to reduce numerical issues
    const minTimestamp = points[0].timestamp;
    const normalizedPoints = points.map(p => ({
      x: (p.timestamp - minTimestamp) / 1000, // Convert to seconds
      y: p.value
    }));

    const sumX = normalizedPoints.reduce((sum, p) => sum + p.x, 0);
    const sumY = normalizedPoints.reduce((sum, p) => sum + p.y, 0);
    const sumXY = normalizedPoints.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = normalizedPoints.reduce((sum, p) => sum + p.x * p.x, 0);
    const sumY2 = normalizedPoints.reduce((sum, p) => sum + p.y * p.y, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate correlation coefficient
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    const correlation = denominator !== 0 ? numerator / denominator : 0;

    return { slope, intercept, correlation };
  }

  private detectSeasonality(points: Array<{ timestamp: number; value: number }>): {
    detected: boolean;
    period: number;
    amplitude: number;
  } {
    if (points.length < 50) {
      return { detected: false, period: 0, amplitude: 0 };
    }

    // Simple autocorrelation approach for hourly patterns
    const hourlyPattern = this.checkHourlyPattern(points);
    
    return hourlyPattern;
  }

  private checkHourlyPattern(points: Array<{ timestamp: number; value: number }>): {
    detected: boolean;
    period: number;
    amplitude: number;
  } {
    // Group points by hour of day
    const hourlyValues: Record<number, number[]> = {};
    
    for (const point of points) {
      const hour = new Date(point.timestamp).getHours();
      if (!hourlyValues[hour]) hourlyValues[hour] = [];
      hourlyValues[hour].push(point.value);
    }

    // Calculate average for each hour
    const hourlyAverages: number[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const values = hourlyValues[hour] || [];
      const average = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
      hourlyAverages.push(average);
    }

    // Check if there's a significant pattern
    const overallAverage = hourlyAverages.reduce((sum, v) => sum + v, 0) / hourlyAverages.length;
    const variance = hourlyAverages.reduce((sum, v) => sum + Math.pow(v - overallAverage, 2), 0) / hourlyAverages.length;
    const standardDeviation = Math.sqrt(variance);
    
    const amplitude = Math.max(...hourlyAverages) - Math.min(...hourlyAverages);
    const detected = amplitude > standardDeviation * 2; // Pattern exists if amplitude > 2 std dev

    return {
      detected,
      period: 3600000, // 1 hour in ms
      amplitude
    };
  }

  private detectAnomalies(points: Array<{ timestamp: number; value: number }>): Array<{
    timestamp: number;
    value: number;
    severity: 'low' | 'medium' | 'high';
  }> {
    if (points.length < 20) return [];

    // Calculate rolling statistics
    const windowSize = Math.min(20, Math.floor(points.length / 3));
    const anomalies: Array<{ timestamp: number; value: number; severity: 'low' | 'medium' | 'high' }> = [];

    for (let i = windowSize; i < points.length; i++) {
      const window = points.slice(i - windowSize, i);
      const mean = window.reduce((sum, p) => sum + p.value, 0) / window.length;
      const variance = window.reduce((sum, p) => sum + Math.pow(p.value - mean, 2), 0) / window.length;
      const stdDev = Math.sqrt(variance);
      
      const currentPoint = points[i];
      const deviation = Math.abs(currentPoint.value - mean);
      
      if (deviation > stdDev * 3) {
        anomalies.push({
          timestamp: currentPoint.timestamp,
          value: currentPoint.value,
          severity: 'high'
        });
      } else if (deviation > stdDev * 2) {
        anomalies.push({
          timestamp: currentPoint.timestamp,
          value: currentPoint.value,
          severity: 'medium'
        });
      } else if (deviation > stdDev * 1.5) {
        anomalies.push({
          timestamp: currentPoint.timestamp,
          value: currentPoint.value,
          severity: 'low'
        });
      }
    }

    return anomalies;
  }

  private generateForecast(
    points: Array<{ timestamp: number; value: number }>,
    slope: number,
    steps: number
  ): Array<{ timestamp: number; predicted: number; confidence: number }> {
    if (points.length === 0) return [];

    const lastPoint = points[points.length - 1];
    const timeStep = points.length > 1 ? points[1].timestamp - points[0].timestamp : 60000; // Default 1 minute
    const forecast: Array<{ timestamp: number; predicted: number; confidence: number }> = [];
    
    // Calculate prediction confidence based on trend strength
    const { correlation } = this.calculateLinearRegression(points);
    const baseConfidence = Math.abs(correlation);

    for (let i = 1; i <= steps; i++) {
      const timestamp = lastPoint.timestamp + (i * timeStep);
      const predicted = lastPoint.value + (slope * i * timeStep / 1000); // slope is per second
      const confidence = Math.max(0.1, baseConfidence * Math.exp(-i * 0.1)); // Decrease confidence over time
      
      forecast.push({
        timestamp,
        predicted,
        confidence
      });
    }

    return forecast;
  }
}

/**
 * Performance Monitor Implementation
 */
export class PerformanceMonitor implements IPerformanceMonitor {
  private config: PerformanceConfig;
  private collector: MetricsCollector;
  private alertManager: AlertManager;
  private trendAnalyzer: TrendAnalyzer;
  private activeMeasurements: Map<string, PerformanceMeasurement>;
  private measurementId: number;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.collector = new MetricsCollector(this.config.sampleRate, this.config.metricsInterval);
    this.alertManager = new AlertManager(this.config.alerting);
    this.trendAnalyzer = new TrendAnalyzer();
    this.activeMeasurements = new Map();
    this.measurementId = 0;

    this.initialize();
  }

  /**
   * Start measuring operation
   */
  startMeasurement(operation: string, metadata?: Record<string, any>): string {
    if (!this.config.monitoringEnabled) return '';

    const id = `${operation}_${++this.measurementId}_${Date.now()}`;
    const measurement: PerformanceMeasurement = {
      id,
      operation,
      startTime: Date.now(),
      metadata: metadata || {}
    };

    this.activeMeasurements.set(id, measurement);
    return id;
  }

  /**
   * End measurement
   */
  endMeasurement(measurementId: string, success?: boolean, error?: string): PerformanceMeasurement {
    const measurement = this.activeMeasurements.get(measurementId);
    
    if (!measurement) {
      // Return dummy measurement if not found
      return {
        id: measurementId,
        operation: 'unknown',
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 0,
        success: false,
        error: 'Measurement not found'
      };
    }

    const now = Date.now();
    measurement.endTime = now;
    measurement.duration = now - measurement.startTime;
    measurement.success = success;
    measurement.error = error;

    // Record memory usage if available
    if (typeof process !== 'undefined' && process.memoryUsage) {
      measurement.memoryAfter = process.memoryUsage().heapUsed;
    }

    this.activeMeasurements.delete(measurementId);
    this.collector.recordMeasurement(measurement);

    // Update trend data
    this.trendAnalyzer.recordDataPoint(`${measurement.operation}_duration`, measurement.duration);
    if (measurement.memoryAfter) {
      this.trendAnalyzer.recordDataPoint('memory_usage', measurement.memoryAfter);
    }

    return measurement;
  }

  /**
   * Record custom metric
   */
  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    if (!this.config.monitoringEnabled) return;

    // Create a synthetic measurement for the metric
    const measurement: PerformanceMeasurement = {
      id: `metric_${name}_${Date.now()}`,
      operation: name,
      startTime: Date.now(),
      endTime: Date.now(),
      duration: 0,
      success: true,
      metadata: {
        isCustomMetric: true,
        value,
        tags: tags || {}
      }
    };

    this.collector.recordMeasurement(measurement);
    this.trendAnalyzer.recordDataPoint(name, value);
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return this.collector.getMetrics();
  }

  /**
   * Get metric history
   */
  getMetricHistory(metric: string, timeWindow: number): number[] {
    const trend = this.trendAnalyzer.analyzeTrend(metric, timeWindow);
    return trend ? trend.timeSeries.map(p => p.value) : [];
  }

  /**
   * Register alert handler
   */
  onAlert(handler: (alert: PerformanceAlert) => void): void {
    this.alertManager.addHandler(handler);
  }

  /**
   * Get performance recommendations
   */
  getRecommendations(): OptimizationRecommendation[] {
    const metrics = this.collector.getMetrics();
    const recommendations: OptimizationRecommendation[] = [];
    
    // High response time recommendations
    if (metrics.responseTime.average > this.config.responseTimeTarget * 2) {
      recommendations.push({
        id: 'high_response_time',
        type: 'cache',
        title: 'Optimize Response Times',
        description: 'Response times are significantly above target. Consider implementing caching.',
        impact: {
          responseTime: 0.5,
          throughput: 0.3
        },
        effort: 'medium',
        priority: 9,
        confidence: 0.8,
        steps: [
          'Implement result caching',
          'Add database query optimization',
          'Consider CDN for static assets'
        ],
        resources: ['Cache implementation', 'Database optimization'],
        timeline: '1-2 weeks'
      });
    }

    // Memory usage recommendations
    if (metrics.memory.heapUsed > this.config.memoryThreshold) {
      recommendations.push({
        id: 'high_memory_usage',
        type: 'memory',
        title: 'Optimize Memory Usage',
        description: 'Memory usage is high. Implement memory management strategies.',
        impact: {
          memoryUsage: 0.3,
          responseTime: 0.2
        },
        effort: 'high',
        priority: 8,
        confidence: 0.7,
        steps: [
          'Implement object pooling',
          'Add garbage collection optimization',
          'Review memory leaks'
        ],
        resources: ['Memory profiling tools', 'GC tuning'],
        timeline: '2-3 weeks'
      });
    }

    // Cache hit rate recommendations
    if (metrics.cache.hitRate < 0.8) {
      recommendations.push({
        id: 'low_cache_hit_rate',
        type: 'cache',
        title: 'Improve Cache Hit Rate',
        description: 'Cache hit rate is below optimal. Review cache strategy.',
        impact: {
          responseTime: 0.4,
          cacheHitRate: 0.3
        },
        effort: 'medium',
        priority: 7,
        confidence: 0.9,
        steps: [
          'Analyze cache miss patterns',
          'Implement cache warming',
          'Optimize cache TTL values'
        ],
        resources: ['Cache analysis tools', 'Cache warming strategy'],
        timeline: '1 week'
      });
    }

    // Error rate recommendations
    if (metrics.errors.errorRate > 0.05) {
      recommendations.push({
        id: 'high_error_rate',
        type: 'architecture',
        title: 'Reduce Error Rate',
        description: 'Error rate is elevated. Implement error handling improvements.',
        impact: {
          responseTime: 0.2,
          throughput: 0.4
        },
        effort: 'high',
        priority: 10,
        confidence: 0.9,
        steps: [
          'Implement retry mechanisms',
          'Add circuit breaker patterns',
          'Improve error handling'
        ],
        resources: ['Error monitoring', 'Resilience patterns'],
        timeline: '2-4 weeks'
      });
    }

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get performance benchmarks
   */
  getBenchmarks(): PerformanceBenchmark[] {
    const metrics = this.collector.getMetrics();
    
    return [
      {
        name: 'Response Time',
        targets: {
          responseTime: this.config.responseTimeTarget,
          throughput: 100, // requests/sec
          memoryUsage: this.config.memoryThreshold,
          cacheHitRate: 0.8
        },
        current: {
          responseTime: metrics.responseTime.average,
          throughput: metrics.throughput.requestsPerSecond,
          memoryUsage: metrics.memory.heapUsed,
          cacheHitRate: metrics.cache.hitRate
        },
        score: this.calculateBenchmarkScore(metrics),
        status: this.getBenchmarkStatus(metrics),
        timestamp: Date.now(),
        details: [
          `Response time: ${metrics.responseTime.average.toFixed(2)}ms (target: ${this.config.responseTimeTarget}ms)`,
          `Throughput: ${metrics.throughput.requestsPerSecond.toFixed(2)} req/s`,
          `Memory usage: ${(metrics.memory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
          `Cache hit rate: ${(metrics.cache.hitRate * 100).toFixed(2)}%`
        ]
      }
    ];
  }

  /**
   * Get performance trends
   */
  getPerformanceTrends(): PerformanceTrend[] {
    const trends: PerformanceTrend[] = [];
    
    const metrics = ['response_time', 'memory_usage', 'error_rate', 'cache_hit_rate'];
    
    for (const metric of metrics) {
      const trend = this.trendAnalyzer.analyzeTrend(metric);
      if (trend) {
        trends.push(trend);
      }
    }
    
    return trends;
  }

  /**
   * Destroy performance monitor
   */
  destroy(): void {
    this.collector.stopCollection();
    this.activeMeasurements.clear();
  }

  // Private implementation methods

  private initialize(): void {
    if (this.config.monitoringEnabled) {
      this.collector.startCollection();
    }

    // Set up automatic alerting
    setInterval(() => {
      const metrics = this.collector.getMetrics();
      this.alertManager.checkThresholds(metrics);
    }, 10000); // Check every 10 seconds

    // Add default console alert handler
    if (this.config.alerting.enabled && this.config.alerting.channels.includes('console')) {
      this.alertManager.addHandler((alert) => {
        console.warn(`🚨 ${alert.severity.toUpperCase()}: ${alert.title}`, {
          message: alert.message,
          metric: alert.metric,
          current: alert.currentValue,
          threshold: alert.thresholdValue,
          actions: alert.actions
        });
      });
    }
  }

  private calculateBenchmarkScore(metrics: PerformanceMetrics): number {
    let score = 100;
    
    // Response time score (30% weight)
    const responseTimeRatio = metrics.responseTime.average / this.config.responseTimeTarget;
    if (responseTimeRatio > 1) {
      score -= Math.min(30, (responseTimeRatio - 1) * 30);
    }
    
    // Memory usage score (25% weight)
    const memoryRatio = metrics.memory.heapUsed / this.config.memoryThreshold;
    if (memoryRatio > 1) {
      score -= Math.min(25, (memoryRatio - 1) * 25);
    }
    
    // Error rate score (25% weight)
    score -= metrics.errors.errorRate * 250; // 10% error rate = 25 points
    
    // Cache hit rate score (20% weight)
    score -= (1 - metrics.cache.hitRate) * 20; // 0% hit rate = 20 points
    
    return Math.max(0, Math.round(score));
  }

  private getBenchmarkStatus(metrics: PerformanceMetrics): 'pass' | 'fail' | 'warning' {
    const responseTimeOk = metrics.responseTime.average <= this.config.responseTimeTarget * 1.5;
    const memoryOk = metrics.memory.heapUsed <= this.config.memoryThreshold * 1.2;
    const errorRateOk = metrics.errors.errorRate <= 0.05;
    const cacheHitRateOk = metrics.cache.hitRate >= 0.7;
    
    if (responseTimeOk && memoryOk && errorRateOk && cacheHitRateOk) {
      return 'pass';
    } else if (!responseTimeOk || !memoryOk || metrics.errors.errorRate > 0.1) {
      return 'fail';
    } else {
      return 'warning';
    }
  }
}

/**
 * Factory function for creating performance monitor instances
 */
export function createPerformanceMonitor(config?: Partial<PerformanceConfig>): IPerformanceMonitor {
  return new PerformanceMonitor(config);
}

/**
 * Performance monitoring utilities
 */
export function measureFunction<T extends (...args: any[]) => any>(
  fn: T,
  monitor: IPerformanceMonitor,
  operationName?: string
): T {
  return ((...args: any[]) => {
    const name = operationName || fn.name || 'anonymous_function';
    const measurementId = monitor.startMeasurement(name);
    
    try {
      const result = fn(...args);
      
      if (result instanceof Promise) {
        return result
          .then(value => {
            monitor.endMeasurement(measurementId, true);
            return value;
          })
          .catch(error => {
            monitor.endMeasurement(measurementId, false, error.message);
            throw error;
          });
      } else {
        monitor.endMeasurement(measurementId, true);
        return result;
      }
    } catch (error) {
      monitor.endMeasurement(measurementId, false, error.message);
      throw error;
    }
  }) as T;
}

export function createPerformanceMiddleware(monitor: IPerformanceMonitor) {
  return (operationName: string) => {
    return <T extends (...args: any[]) => any>(target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<T>) => {
      const originalMethod = descriptor.value;
      if (!originalMethod) return descriptor;
      
      descriptor.value = measureFunction(originalMethod, monitor, operationName || `${target.constructor.name}.${propertyKey}`) as T;
      
      return descriptor;
    };
  };
}