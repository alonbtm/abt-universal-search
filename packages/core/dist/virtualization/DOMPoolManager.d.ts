import { IDOMPoolManager, DOMPoolConfig, DOMPoolStats, ViewportCullingConfig } from '../types/Virtualization';
export interface DOMPoolEvents {
    onElementCreated?: (element: HTMLElement, tagName: string) => void;
    onElementReused?: (element: HTMLElement, reuseCount: number) => void;
    onElementReleased?: (element: HTMLElement) => void;
    onPoolCleanup?: (removedCount: number) => void;
    onMemoryPressure?: (stats: DOMPoolStats) => void;
}
export interface ElementFactory {
    createElement: (tagName: string, className?: string) => HTMLElement;
    resetElement: (element: HTMLElement) => void;
    validateElement: (element: HTMLElement) => boolean;
}
export declare class DOMPoolManager implements IDOMPoolManager {
    private config;
    private cullingConfig;
    private events;
    private factory;
    private pools;
    private inUseElements;
    private elementMetadata;
    private cleanupTimer;
    private memoryMonitorTimer;
    private stats;
    private performanceMetrics;
    constructor(config?: Partial<DOMPoolConfig>, cullingConfig?: Partial<ViewportCullingConfig>, events?: DOMPoolEvents, factory?: ElementFactory);
    private createDefaultFactory;
    private initializePools;
    private createInitialPool;
    private getPoolKey;
    acquireElement(tagName: string, className?: string): HTMLElement;
    releaseElement(element: HTMLElement): void;
    private destroyElement;
    private setElementMetadata;
    getPoolStats(): DOMPoolStats;
    private updateStats;
    private estimateMemoryUsage;
    cleanup(): void;
    reset(): void;
    setMaxPoolSize(size: number): void;
    cullInvisibleElements(viewport: {
        top: number;
        bottom: number;
    }): void;
    private shouldCullElement;
    private startCleanupTimer;
    private startMemoryMonitoring;
    getPerformanceMetrics(): {
        elementsCreated: number;
        elementsReused: number;
        elementsDestroyed: number;
        cleanupCycles: number;
        memoryReclaimed: number;
    };
    getElementMetadata(element: HTMLElement): ElementMetadata | null;
    preWarmPool(tagName: string, className?: string, count?: number): void;
    dispose(): void;
}
interface ElementMetadata {
    tagName: string;
    poolKey: string;
    created: number;
    totalReuseTime: number;
}
export {};
//# sourceMappingURL=DOMPoolManager.d.ts.map