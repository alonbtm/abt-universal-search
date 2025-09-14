import {
  IPerformanceOptimizer,
  PerformanceBudget,
  FrameMetrics,
  PerformanceMetrics,
  PerformanceAlert,
  AdaptiveConfig,
  QualityLevel
} from '../types/Virtualization';

export interface UIPerformanceConfig {
  targetFrameRate: number;
  maxFrameTime: number;
  enableFrameMonitoring: boolean;
  enableMemoryMonitoring: boolean;
  adaptiveQuality: boolean;
  alertThresholds: {
    frameDrops: number;
    memoryUsage: number;
    renderTime: number;
  };
}

export interface UIPerformanceEvents {
  onFrameDrop?: (metrics: FrameMetrics) => void;
  onMemoryPressure?: (usage: number) => void;
  onPerformanceAlert?: (alert: PerformanceAlert) => void;
  onQualityChange?: (level: QualityLevel) => void;
  onOptimizationApplied?: (optimization: string) => void;
}

export class PerformanceOptimizer implements IPerformanceOptimizer {
  private config: Required<UIPerformanceConfig>;
  private budget: PerformanceBudget;
  private adaptiveConfig: AdaptiveConfig;
  private events: UIPerformanceEvents;
  
  private isMonitoring = false;
  private frameCallbacks: Map<number, FrameRequestCallback> = new Map();
  private nextCallbackId = 1;
  
  private metrics: PerformanceMetrics = {
    currentFrameRate: 60,
    averageFrameRate: 60,
    frameTimeP95: 16.67,
    renderTimeP95: 8,
    memoryUsage: 0,
    totalFrames: 0,
    droppedFrames: 0,
    gcCollections: 0
  };

  private frameHistory: FrameMetrics[] = [];
  private lastFrameTime = 0;
  private frameStartTime = 0;
  private renderStartTime = 0;
  
  private currentQualityLevel = 0;
  private qualityLevels: QualityLevel[] = [];
  
  private memoryObserver: PerformanceObserver | null = null;
  private paintObserver: PerformanceObserver | null = null;
  private layoutObserver: PerformanceObserver | null = null;

  constructor(
    config: Partial<UIPerformanceConfig> = {},
    events: UIPerformanceEvents = {},
    budget: Partial<PerformanceBudget> = {},
    adaptiveConfig: Partial<AdaptiveConfig> = {}
  ) {
    this.config = {
      targetFrameRate: 60,
      maxFrameTime: 16.67,
      enableFrameMonitoring: true,
      enableMemoryMonitoring: true,
      adaptiveQuality: true,
      alertThresholds: {
        frameDrops: 5,
        memoryUsage: 100 * 1024 * 1024, // 100MB
        renderTime: 10
      },
      ...config
    };

    this.budget = {
      targetFrameRate: this.config.targetFrameRate,
      maxFrameTime: this.config.maxFrameTime,
      maxRenderTime: 8,
      memoryThreshold: this.config.alertThresholds.memoryUsage,
      gcThreshold: 50 * 1024 * 1024, // 50MB
      ...budget
    };

    this.adaptiveConfig = {
      enableAdaptive: true,
      performanceThreshold: 0.8,
      qualityLevels: this.getDefaultQualityLevels(),
      adaptationStrategy: 'balanced',
      ...adaptiveConfig
    };

    this.events = events;
    this.qualityLevels = this.adaptiveConfig.qualityLevels;
    this.initializeObservers();
  }

  private getDefaultQualityLevels(): QualityLevel[] {
    return [
      {
        name: 'high',
        itemHeight: 40,
        bufferSize: 10,
        renderBatchSize: 100,
        enableAnimations: true,
        enableShadows: true
      },
      {
        name: 'medium',
        itemHeight: 36,
        bufferSize: 7,
        renderBatchSize: 75,
        enableAnimations: true,
        enableShadows: false
      },
      {
        name: 'low',
        itemHeight: 32,
        bufferSize: 5,
        renderBatchSize: 50,
        enableAnimations: false,
        enableShadows: false
      },
      {
        name: 'minimal',
        itemHeight: 28,
        bufferSize: 3,
        renderBatchSize: 25,
        enableAnimations: false,
        enableShadows: false
      }
    ];
  }

  private initializeObservers(): void {
    if (typeof PerformanceObserver === 'undefined') return;

    // Memory observer
    if (this.config.enableMemoryMonitoring) {
      try {
        this.memoryObserver = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'measure' && entry.name === 'memory') {
              this.handleMemoryMeasurement(entry);
            }
          }
        });
        this.memoryObserver.observe({ entryTypes: ['measure'] });
      } catch (error) {
        console.warn('Memory performance observer not supported:', error);
      }
    }

    // Paint observer
    try {
      this.paintObserver = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          this.handlePaintMeasurement(entry);
        }
      });
      this.paintObserver.observe({ entryTypes: ['paint'] });
    } catch (error) {
      console.warn('Paint performance observer not supported:', error);
    }

    // Layout observer
    try {
      this.layoutObserver = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          this.handleLayoutMeasurement(entry);
        }
      });
      this.layoutObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.warn('Layout performance observer not supported:', error);
    }
  }

  public startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.lastFrameTime = performance.now();
    
    if (this.config.enableFrameMonitoring) {
      this.scheduleFrameMonitoring();
    }
    
    this.startMemoryMonitoring();
  }

  public stopMonitoring(): void {
    this.isMonitoring = false;
    
    if (this.memoryObserver) {
      this.memoryObserver.disconnect();
    }
    if (this.paintObserver) {
      this.paintObserver.disconnect();
    }
    if (this.layoutObserver) {
      this.layoutObserver.disconnect();
    }
  }

  private scheduleFrameMonitoring(): void {
    if (!this.isMonitoring) return;

    this.frameStartTime = performance.now();
    
    requestAnimationFrame((timestamp) => {
      this.measureFrame(timestamp);
      this.scheduleFrameMonitoring();
    });
  }

  private measureFrame(timestamp: number): void {
    const frameTime = timestamp - this.lastFrameTime;
    const renderTime = this.renderStartTime > 0 ? performance.now() - this.renderStartTime : 0;
    
    const frameMetrics: FrameMetrics = {
      frameTime,
      renderTime,
      layoutTime: 0, // Will be updated by layout observer
      paintTime: 0,  // Will be updated by paint observer
      memoryUsage: this.getCurrentMemoryUsage(),
      timestamp
    };

    this.updateMetrics(frameMetrics);
    this.checkPerformanceThresholds(frameMetrics);
    
    this.lastFrameTime = timestamp;
    this.renderStartTime = 0;
  }

  private updateMetrics(frameMetrics: FrameMetrics): void {
    this.metrics.totalFrames++;
    
    // Update frame rate
    if (frameMetrics.frameTime > 0) {
      this.metrics.currentFrameRate = 1000 / frameMetrics.frameTime;
    }
    
    // Track dropped frames (frames that took longer than budget)
    if (frameMetrics.frameTime > this.budget.maxFrameTime) {
      this.metrics.droppedFrames++;
      this.events.onFrameDrop?.(frameMetrics);
    }
    
    // Update averages
    const alpha = 0.1; // Smoothing factor
    this.metrics.averageFrameRate = 
      this.metrics.averageFrameRate * (1 - alpha) + 
      this.metrics.currentFrameRate * alpha;
    
    // Store frame history for P95 calculations
    this.frameHistory.push(frameMetrics);
    if (this.frameHistory.length > 100) {
      this.frameHistory.shift();
    }
    
    // Calculate P95 metrics
    this.updatePercentileMetrics();
    
    // Update memory usage
    this.metrics.memoryUsage = frameMetrics.memoryUsage;
  }

  private updatePercentileMetrics(): void {
    if (this.frameHistory.length < 10) return;
    
    const frameTimes = this.frameHistory.map(f => f.frameTime).sort((a, b) => a - b);
    const renderTimes = this.frameHistory.map(f => f.renderTime).sort((a, b) => a - b);
    
    const p95Index = Math.floor(frameTimes.length * 0.95);
    this.metrics.frameTimeP95 = frameTimes[p95Index];
    this.metrics.renderTimeP95 = renderTimes[p95Index];
  }

  private checkPerformanceThresholds(frameMetrics: FrameMetrics): void {
    // Check frame drop threshold
    const frameDropRate = this.metrics.droppedFrames / this.metrics.totalFrames;
    if (frameDropRate > this.config.alertThresholds.frameDrops / 100) {
      this.emitAlert('frame-drop', 'warning', `High frame drop rate: ${(frameDropRate * 100).toFixed(1)}%`);
    }
    
    // Check memory threshold
    if (frameMetrics.memoryUsage > this.config.alertThresholds.memoryUsage) {
      this.emitAlert('memory-high', 'warning', `High memory usage: ${(frameMetrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`);
      this.events.onMemoryPressure?.(frameMetrics.memoryUsage);
    }
    
    // Check render time threshold
    if (frameMetrics.renderTime > this.config.alertThresholds.renderTime) {
      this.emitAlert('render-slow', 'warning', `Slow render time: ${frameMetrics.renderTime.toFixed(1)}ms`);
    }
    
    // Check if we should adapt quality
    if (this.adaptiveConfig.enableAdaptive && this.shouldAdaptQuality()) {
      this.adaptQuality();
    }
  }

  private emitAlert(type: PerformanceAlert['type'], severity: PerformanceAlert['severity'], message: string): void {
    const alert: PerformanceAlert = {
      type,
      severity,
      message,
      metrics: { ...this.metrics },
      timestamp: Date.now()
    };
    
    this.events.onPerformanceAlert?.(alert);
  }

  private shouldAdaptQuality(): boolean {
    const performanceScore = this.calculatePerformanceScore();
    return performanceScore < this.adaptiveConfig.performanceThreshold;
  }

  private calculatePerformanceScore(): number {
    // Calculate a performance score between 0 and 1
    const frameRateScore = Math.min(this.metrics.currentFrameRate / this.budget.targetFrameRate, 1);
    const memoryScore = Math.max(0, 1 - (this.metrics.memoryUsage / this.budget.memoryThreshold));
    const renderTimeScore = Math.max(0, 1 - (this.metrics.renderTimeP95 / this.budget.maxRenderTime));
    
    return (frameRateScore + memoryScore + renderTimeScore) / 3;
  }

  private adaptQuality(): void {
    const performanceScore = this.calculatePerformanceScore();
    let targetQualityLevel: number;
    
    switch (this.adaptiveConfig.adaptationStrategy) {
      case 'aggressive':
        targetQualityLevel = performanceScore < 0.5 ? this.qualityLevels.length - 1 : 
                           performanceScore < 0.7 ? Math.min(this.currentQualityLevel + 1, this.qualityLevels.length - 1) :
                           Math.max(0, this.currentQualityLevel - 1);
        break;
      
      case 'conservative':
        targetQualityLevel = performanceScore < 0.3 ? Math.min(this.currentQualityLevel + 1, this.qualityLevels.length - 1) :
                           performanceScore > 0.8 ? Math.max(0, this.currentQualityLevel - 1) :
                           this.currentQualityLevel;
        break;
      
      case 'balanced':
      default:
        targetQualityLevel = performanceScore < 0.4 ? Math.min(this.currentQualityLevel + 1, this.qualityLevels.length - 1) :
                           performanceScore > 0.7 ? Math.max(0, this.currentQualityLevel - 1) :
                           this.currentQualityLevel;
        break;
    }
    
    if (targetQualityLevel !== this.currentQualityLevel) {
      this.setQualityLevel(targetQualityLevel);
    }
  }

  private setQualityLevel(level: number): void {
    if (level < 0 || level >= this.qualityLevels.length) return;
    
    this.currentQualityLevel = level;
    const qualityLevel = this.qualityLevels[level];
    
    this.events.onQualityChange?.(qualityLevel);
    this.events.onOptimizationApplied?.(`Quality level changed to: ${qualityLevel.name}`);
  }

  public getCurrentQualityLevel(): QualityLevel {
    return this.qualityLevels[this.currentQualityLevel];
  }

  private startMemoryMonitoring(): void {
    if (!this.config.enableMemoryMonitoring) return;
    
    // Periodic memory measurement
    const measureMemory = () => {
      if (!this.isMonitoring) return;
      
      const memoryUsage = this.getCurrentMemoryUsage();
      if (memoryUsage > this.budget.memoryThreshold) {
        this.triggerGarbageCollection();
      }
      
      setTimeout(measureMemory, 5000); // Check every 5 seconds
    };
    
    measureMemory();
  }

  private getCurrentMemoryUsage(): number {
    if ('memory' in performance && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize || 0;
    }
    return 0;
  }

  private triggerGarbageCollection(): void {
    // Force garbage collection if available (Chrome DevTools)
    if ((window as any).gc) {
      (window as any).gc();
      this.metrics.gcCollections++;
      this.events.onOptimizationApplied?.('Garbage collection triggered');
    }
  }

  private handleMemoryMeasurement(entry: PerformanceEntry): void {
    // Handle memory measurements from PerformanceObserver
    if (entry.duration > this.budget.gcThreshold) {
      this.emitAlert('gc-pressure', 'warning', `Long GC pause: ${entry.duration.toFixed(1)}ms`);
    }
  }

  private handlePaintMeasurement(entry: PerformanceEntry): void {
    // Update paint time in current frame metrics
    const currentFrame = this.frameHistory[this.frameHistory.length - 1];
    if (currentFrame) {
      currentFrame.paintTime = entry.duration;
    }
  }

  private handleLayoutMeasurement(entry: PerformanceEntry): void {
    // Handle layout shift measurements
    if (entry.hadRecentInput) return; // Ignore user-initiated layout shifts
    
    const currentFrame = this.frameHistory[this.frameHistory.length - 1];
    if (currentFrame) {
      currentFrame.layoutTime += entry.duration;
    }
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public setBudget(budget: PerformanceBudget): void {
    this.budget = { ...budget };
  }

  public shouldReduceQuality(): boolean {
    const performanceScore = this.calculatePerformanceScore();
    return performanceScore < this.adaptiveConfig.performanceThreshold;
  }

  public optimizeForPerformance(): void {
    // Apply immediate performance optimizations
    this.triggerGarbageCollection();
    
    // Reduce quality if needed
    if (this.shouldReduceQuality()) {
      this.adaptQuality();
    }
    
    // Additional optimizations
    this.events.onOptimizationApplied?.('Performance optimization applied');
  }

  public requestFrame(callback: FrameRequestCallback): number {
    const id = this.nextCallbackId++;
    this.frameCallbacks.set(id, callback);
    
    const wrappedCallback = (timestamp: number) => {
      this.renderStartTime = performance.now();
      try {
        callback(timestamp);
      } finally {
        this.frameCallbacks.delete(id);
      }
    };
    
    return requestAnimationFrame(wrappedCallback);
  }

  public cancelFrame(handle: number): void {
    this.frameCallbacks.delete(handle);
    cancelAnimationFrame(handle);
  }

  public setAdaptiveConfig(config: Partial<AdaptiveConfig>): void {
    this.adaptiveConfig = { ...this.adaptiveConfig, ...config };
  }

  public addQualityLevel(level: QualityLevel): void {
    this.qualityLevels.push(level);
  }

  public removeQualityLevel(name: string): void {
    const index = this.qualityLevels.findIndex(level => level.name === name);
    if (index > -1 && this.qualityLevels.length > 1) {
      this.qualityLevels.splice(index, 1);
      
      // Adjust current quality level if needed
      if (this.currentQualityLevel >= this.qualityLevels.length) {
        this.currentQualityLevel = this.qualityLevels.length - 1;
      }
    }
  }

  public getBudget(): PerformanceBudget {
    return { ...this.budget };
  }

  public isMonitoringActive(): boolean {
    return this.isMonitoring;
  }

  public getFrameHistory(): FrameMetrics[] {
    return [...this.frameHistory];
  }

  public dispose(): void {
    this.stopMonitoring();
    this.frameCallbacks.clear();
    this.frameHistory = [];
  }
}