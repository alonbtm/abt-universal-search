import { IPerformanceOptimizer, PerformanceBudget, FrameMetrics, PerformanceMetrics, PerformanceAlert, AdaptiveConfig, QualityLevel } from '../types/Virtualization';
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
export declare class PerformanceOptimizer implements IPerformanceOptimizer {
    private config;
    private budget;
    private adaptiveConfig;
    private events;
    private isMonitoring;
    private frameCallbacks;
    private nextCallbackId;
    private metrics;
    private frameHistory;
    private lastFrameTime;
    private frameStartTime;
    private renderStartTime;
    private currentQualityLevel;
    private qualityLevels;
    private memoryObserver;
    private paintObserver;
    private layoutObserver;
    constructor(config?: Partial<UIPerformanceConfig>, events?: UIPerformanceEvents, budget?: Partial<PerformanceBudget>, adaptiveConfig?: Partial<AdaptiveConfig>);
    private getDefaultQualityLevels;
    private initializeObservers;
    startMonitoring(): void;
    stopMonitoring(): void;
    private scheduleFrameMonitoring;
    private measureFrame;
    private updateMetrics;
    private updatePercentileMetrics;
    private checkPerformanceThresholds;
    private emitAlert;
    private shouldAdaptQuality;
    private calculatePerformanceScore;
    private adaptQuality;
    private setQualityLevel;
    getCurrentQualityLevel(): QualityLevel;
    private startMemoryMonitoring;
    private getCurrentMemoryUsage;
    private triggerGarbageCollection;
    private handleMemoryMeasurement;
    private handlePaintMeasurement;
    private handleLayoutMeasurement;
    getMetrics(): PerformanceMetrics;
    setBudget(budget: PerformanceBudget): void;
    shouldReduceQuality(): boolean;
    optimizeForPerformance(): void;
    requestFrame(callback: FrameRequestCallback): number;
    cancelFrame(handle: number): void;
    setAdaptiveConfig(config: Partial<AdaptiveConfig>): void;
    addQualityLevel(level: QualityLevel): void;
    removeQualityLevel(name: string): void;
    getBudget(): PerformanceBudget;
    isMonitoringActive(): boolean;
    getFrameHistory(): FrameMetrics[];
    dispose(): void;
}
//# sourceMappingURL=PerformanceOptimizer.d.ts.map