/**
 * Performance Monitor
 * Handles bundle size tracking and performance regression detection
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { gzipSync, brotliCompressSync } from 'zlib';

export interface IPerformanceConfig {
  projectPath: string;
  thresholds: {
    bundleSize: number;
    gzippedSize: number;
    buildTime: number;
    regressionPercent: number;
  };
  historyPath?: string;
  alertWebhook?: string;
}

export interface IBundleMetrics {
  version: string;
  timestamp: Date;
  bundleSize: number;
  gzippedSize: number;
  brotliSize: number;
  buildTime: number;
  formats: {
    umd: number;
    esm: number;
    iife: number;
  };
  dependencies: number;
  treeShakeEffectiveness: number;
}

export interface IPerformanceRegression {
  metric: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  threshold: number;
}

export interface IPerformanceReport {
  version: string;
  timestamp: Date;
  metrics: IBundleMetrics;
  regressions: IPerformanceRegression[];
  improvements: IPerformanceRegression[];
  recommendations: string[];
  overallScore: number;
}

export interface IPerformanceTrend {
  metric: string;
  values: { version: string; value: number; timestamp: Date }[];
  trend: 'improving' | 'stable' | 'degrading';
  changeRate: number;
}

export class PerformanceMonitor {
  private config: IPerformanceConfig;
  private history: IBundleMetrics[] = [];
  private historyPath: string;

  constructor(config: IPerformanceConfig) {
    this.config = config;
    this.historyPath = config.historyPath || resolve(config.projectPath, '.performance-history.json');
    this.loadHistory();
  }

  /**
   * Record performance metrics for a build
   */
  async recordMetrics(version: string, buildResults: any): Promise<IBundleMetrics> {
    console.log(`📊 Recording performance metrics for version ${version}...`);

    const metrics: IBundleMetrics = {
      version,
      timestamp: new Date(),
      bundleSize: this.calculateTotalBundleSize(buildResults),
      gzippedSize: this.calculateGzippedSize(buildResults),
      brotliSize: this.calculateBrotliSize(buildResults),
      buildTime: buildResults.buildTime || 0,
      formats: this.calculateFormatSizes(buildResults),
      dependencies: this.getDependencyCount(),
      treeShakeEffectiveness: buildResults.treeShakeEffectiveness || 0
    };

    // Add to history
    this.history.push(metrics);
    this.saveHistory();

    console.log(`📊 Recorded metrics: ${this.formatSize(metrics.bundleSize)} total, ${this.formatSize(metrics.gzippedSize)} gzipped`);
    return metrics;
  }

  /**
   * Analyze performance and detect regressions
   */
  async analyzePerformance(currentVersion: string): Promise<IPerformanceReport> {
    console.log(`🔍 Analyzing performance for version ${currentVersion}...`);

    const currentMetrics = this.history.find(m => m.version === currentVersion);
    if (!currentMetrics) {
      throw new Error(`Metrics not found for version ${currentVersion}`);
    }

    const previousMetrics = this.getPreviousMetrics(currentVersion);
    const regressions = this.detectRegressions(currentMetrics, previousMetrics);
    const improvements = this.detectImprovements(currentMetrics, previousMetrics);
    const recommendations = this.generateRecommendations(currentMetrics, regressions);
    const overallScore = this.calculateOverallScore(currentMetrics, regressions);

    const report: IPerformanceReport = {
      version: currentVersion,
      timestamp: new Date(),
      metrics: currentMetrics,
      regressions,
      improvements,
      recommendations,
      overallScore
    };

    // Send alerts if critical regressions detected
    await this.sendAlertsIfNeeded(report);

    console.log(`🔍 Performance analysis complete: ${regressions.length} regressions, ${improvements.length} improvements`);
    return report;
  }

  /**
   * Get performance trends over time
   */
  getPerformanceTrends(metricNames: string[] = ['bundleSize', 'gzippedSize', 'buildTime']): IPerformanceTrend[] {
    const trends: IPerformanceTrend[] = [];

    for (const metricName of metricNames) {
      const values = this.history.map(m => ({
        version: m.version,
        value: this.getMetricValue(m, metricName),
        timestamp: m.timestamp
      })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      if (values.length < 2) continue;

      const trend = this.calculateTrend(values);
      const changeRate = this.calculateChangeRate(values);

      trends.push({
        metric: metricName,
        values,
        trend,
        changeRate
      });
    }

    return trends;
  }

  /**
   * Generate performance dashboard data
   */
  generateDashboardData(): any {
    const recentMetrics = this.history.slice(-10);
    const trends = this.getPerformanceTrends();
    
    return {
      summary: {
        totalBuilds: this.history.length,
        averageBundleSize: this.calculateAverage(this.history, 'bundleSize'),
        averageBuildTime: this.calculateAverage(this.history, 'buildTime'),
        lastUpdated: new Date()
      },
      recentMetrics,
      trends,
      thresholds: this.config.thresholds
    };
  }

  /**
   * Export performance history
   */
  exportHistory(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      return this.exportToCSV();
    }
    
    return JSON.stringify(this.history, null, 2);
  }

  /**
   * Import performance history
   */
  importHistory(data: string, format: 'json' | 'csv' = 'json'): void {
    if (format === 'csv') {
      this.importFromCSV(data);
    } else {
      this.history = JSON.parse(data);
      this.saveHistory();
    }
  }

  /**
   * Clear performance history
   */
  clearHistory(): void {
    this.history = [];
    this.saveHistory();
    console.log('🗑️ Performance history cleared');
  }

  /**
   * Detect performance regressions
   */
  private detectRegressions(current: IBundleMetrics, previous?: IBundleMetrics): IPerformanceRegression[] {
    if (!previous) return [];

    const regressions: IPerformanceRegression[] = [];
    const checks = [
      { metric: 'bundleSize', current: current.bundleSize, previous: previous.bundleSize, threshold: this.config.thresholds.bundleSize },
      { metric: 'gzippedSize', current: current.gzippedSize, previous: previous.gzippedSize, threshold: this.config.thresholds.gzippedSize },
      { metric: 'buildTime', current: current.buildTime, previous: previous.buildTime, threshold: this.config.thresholds.buildTime }
    ];

    for (const check of checks) {
      const change = check.current - check.previous;
      const changePercent = (change / check.previous) * 100;

      if (change > 0 && changePercent > this.config.thresholds.regressionPercent) {
        regressions.push({
          metric: check.metric,
          current: check.current,
          previous: check.previous,
          change,
          changePercent,
          severity: this.calculateSeverity(changePercent),
          threshold: check.threshold
        });
      }
    }

    return regressions;
  }

  /**
   * Detect performance improvements
   */
  private detectImprovements(current: IBundleMetrics, previous?: IBundleMetrics): IPerformanceRegression[] {
    if (!previous) return [];

    const improvements: IPerformanceRegression[] = [];
    const checks = [
      { metric: 'bundleSize', current: current.bundleSize, previous: previous.bundleSize, threshold: this.config.thresholds.bundleSize },
      { metric: 'gzippedSize', current: current.gzippedSize, previous: previous.gzippedSize, threshold: this.config.thresholds.gzippedSize },
      { metric: 'buildTime', current: current.buildTime, previous: previous.buildTime, threshold: this.config.thresholds.buildTime }
    ];

    for (const check of checks) {
      const change = check.previous - check.current;
      const changePercent = (change / check.previous) * 100;

      if (change > 0 && changePercent > 5) { // 5% improvement threshold
        improvements.push({
          metric: check.metric,
          current: check.current,
          previous: check.previous,
          change: -change,
          changePercent: -changePercent,
          severity: 'low',
          threshold: check.threshold
        });
      }
    }

    return improvements;
  }

  /**
   * Calculate severity of regression
   */
  private calculateSeverity(changePercent: number): 'low' | 'medium' | 'high' | 'critical' {
    if (changePercent > 50) return 'critical';
    if (changePercent > 25) return 'high';
    if (changePercent > 10) return 'medium';
    return 'low';
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: IBundleMetrics, regressions: IPerformanceRegression[]): string[] {
    const recommendations: string[] = [];

    // Bundle size recommendations
    if (metrics.bundleSize > this.config.thresholds.bundleSize) {
      recommendations.push('Bundle size exceeds threshold - consider code splitting or tree shaking');
    }

    // Build time recommendations
    if (metrics.buildTime > this.config.thresholds.buildTime) {
      recommendations.push('Build time is slow - consider optimizing build configuration');
    }

    // Tree shaking recommendations
    if (metrics.treeShakeEffectiveness < 0.8) {
      recommendations.push('Tree shaking effectiveness is low - review unused exports');
    }

    // Regression-specific recommendations
    for (const regression of regressions) {
      if (regression.metric === 'bundleSize' && regression.severity === 'high') {
        recommendations.push('Critical bundle size regression detected - investigate recent changes');
      }
    }

    return recommendations;
  }

  /**
   * Calculate overall performance score
   */
  private calculateOverallScore(metrics: IBundleMetrics, regressions: IPerformanceRegression[]): number {
    let score = 100;

    // Deduct points for threshold violations
    if (metrics.bundleSize > this.config.thresholds.bundleSize) {
      score -= 20;
    }
    if (metrics.gzippedSize > this.config.thresholds.gzippedSize) {
      score -= 15;
    }
    if (metrics.buildTime > this.config.thresholds.buildTime) {
      score -= 10;
    }

    // Deduct points for regressions
    for (const regression of regressions) {
      switch (regression.severity) {
        case 'critical': score -= 25; break;
        case 'high': score -= 15; break;
        case 'medium': score -= 10; break;
        case 'low': score -= 5; break;
      }
    }

    return Math.max(0, score);
  }

  /**
   * Send alerts for critical regressions
   */
  private async sendAlertsIfNeeded(report: IPerformanceReport): Promise<void> {
    const criticalRegressions = report.regressions.filter(r => r.severity === 'critical' || r.severity === 'high');
    
    if (criticalRegressions.length > 0 && this.config.alertWebhook) {
      console.log(`🚨 Sending alert for ${criticalRegressions.length} critical regressions`);
      
      const alertData = {
        version: report.version,
        regressions: criticalRegressions,
        overallScore: report.overallScore,
        timestamp: report.timestamp
      };

      // In real implementation, would send HTTP request to webhook
      console.log('Alert data:', JSON.stringify(alertData, null, 2));
    }
  }

  /**
   * Get previous metrics for comparison
   */
  private getPreviousMetrics(currentVersion: string): IBundleMetrics | undefined {
    const currentIndex = this.history.findIndex(m => m.version === currentVersion);
    return currentIndex > 0 ? this.history[currentIndex - 1] : undefined;
  }

  /**
   * Calculate total bundle size
   */
  private calculateTotalBundleSize(buildResults: any): number {
    if (buildResults.formats) {
      return buildResults.formats.reduce((total: number, format: any) => total + format.size, 0);
    }
    return buildResults.totalSize || 0;
  }

  /**
   * Calculate gzipped size
   */
  private calculateGzippedSize(buildResults: any): number {
    if (buildResults.formats) {
      return buildResults.formats.reduce((total: number, format: any) => total + format.gzippedSize, 0);
    }
    return buildResults.totalGzippedSize || 0;
  }

  /**
   * Calculate brotli size
   */
  private calculateBrotliSize(buildResults: any): number {
    // Estimate brotli size as ~85% of gzipped size
    return Math.floor(this.calculateGzippedSize(buildResults) * 0.85);
  }

  /**
   * Calculate format-specific sizes
   */
  private calculateFormatSizes(buildResults: any): { umd: number; esm: number; iife: number } {
    const formats = { umd: 0, esm: 0, iife: 0 };
    
    if (buildResults.formats) {
      for (const format of buildResults.formats) {
        if (format.format in formats) {
          formats[format.format as keyof typeof formats] = format.size;
        }
      }
    }
    
    return formats;
  }

  /**
   * Get dependency count
   */
  private getDependencyCount(): number {
    try {
      const packageJsonPath = resolve(this.config.projectPath, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      
      const deps = Object.keys(packageJson.dependencies || {});
      const devDeps = Object.keys(packageJson.devDependencies || {});
      
      return deps.length + devDeps.length;
    } catch {
      return 0;
    }
  }

  /**
   * Get metric value by name
   */
  private getMetricValue(metrics: IBundleMetrics, metricName: string): number {
    switch (metricName) {
      case 'bundleSize': return metrics.bundleSize;
      case 'gzippedSize': return metrics.gzippedSize;
      case 'brotliSize': return metrics.brotliSize;
      case 'buildTime': return metrics.buildTime;
      case 'dependencies': return metrics.dependencies;
      case 'treeShakeEffectiveness': return metrics.treeShakeEffectiveness;
      default: return 0;
    }
  }

  /**
   * Calculate trend direction
   */
  private calculateTrend(values: { version: string; value: number; timestamp: Date }[]): 'improving' | 'stable' | 'degrading' {
    if (values.length < 3) return 'stable';

    const recent = values.slice(-3);
    const trend = recent[2].value - recent[0].value;
    const changePercent = Math.abs(trend / recent[0].value) * 100;

    if (changePercent < 5) return 'stable';
    return trend < 0 ? 'improving' : 'degrading';
  }

  /**
   * Calculate change rate
   */
  private calculateChangeRate(values: { version: string; value: number; timestamp: Date }[]): number {
    if (values.length < 2) return 0;

    const first = values[0];
    const last = values[values.length - 1];
    
    return ((last.value - first.value) / first.value) * 100;
  }

  /**
   * Calculate average for metric
   */
  private calculateAverage(metrics: IBundleMetrics[], metricName: string): number {
    if (metrics.length === 0) return 0;
    
    const sum = metrics.reduce((acc, m) => acc + this.getMetricValue(m, metricName), 0);
    return sum / metrics.length;
  }

  /**
   * Load performance history
   */
  private loadHistory(): void {
    try {
      if (existsSync(this.historyPath)) {
        const data = readFileSync(this.historyPath, 'utf8');
        this.history = JSON.parse(data).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      }
    } catch (error) {
      console.warn('Failed to load performance history:', error);
      this.history = [];
    }
  }

  /**
   * Save performance history
   */
  private saveHistory(): void {
    try {
      writeFileSync(this.historyPath, JSON.stringify(this.history, null, 2));
    } catch (error) {
      console.warn('Failed to save performance history:', error);
    }
  }

  /**
   * Export to CSV format
   */
  private exportToCSV(): string {
    const headers = ['version', 'timestamp', 'bundleSize', 'gzippedSize', 'buildTime', 'dependencies'];
    const rows = this.history.map(m => [
      m.version,
      m.timestamp.toISOString(),
      m.bundleSize,
      m.gzippedSize,
      m.buildTime,
      m.dependencies
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Import from CSV format
   */
  private importFromCSV(csvData: string): void {
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',');
    
    this.history = lines.slice(1).map(line => {
      const values = line.split(',');
      return {
        version: values[0],
        timestamp: new Date(values[1]),
        bundleSize: parseInt(values[2]),
        gzippedSize: parseInt(values[3]),
        brotliSize: parseInt(values[3]) * 0.85,
        buildTime: parseInt(values[4]),
        formats: { umd: 0, esm: 0, iife: 0 },
        dependencies: parseInt(values[5]),
        treeShakeEffectiveness: 0.8
      };
    });
    
    this.saveHistory();
  }

  /**
   * Format file size for display
   */
  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)}${units[unitIndex]}`;
  }
}
