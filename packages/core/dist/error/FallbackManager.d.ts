import { IFallbackManager, FallbackConfig, FallbackStrategy, FallbackResult, SearchError, ErrorContext } from '../types/ErrorHandling';
export interface FallbackEvents {
    onFallbackStart?: (strategy: string, error: SearchError) => void;
    onFallbackSuccess?: (result: FallbackResult, strategy: string) => void;
    onFallbackFailure?: (error: SearchError, strategy: string) => void;
    onFallbackSkipped?: (strategy: string, reason: string) => void;
    onOfflineModeEnabled?: () => void;
    onOfflineModeDisabled?: () => void;
}
export interface FallbackMetrics {
    totalFallbacks: number;
    successfulFallbacks: number;
    failedFallbacks: number;
    fallbacksByStrategy: Record<string, number>;
    fallbackSuccessRate: number;
    averageFallbackTime: number;
    cacheHitRate: number;
    offlineModeActivations: number;
}
export declare class FallbackManager implements IFallbackManager {
    private config;
    private strategies;
    private events;
    private metrics;
    private isOffline;
    private cache;
    constructor(config?: Partial<FallbackConfig>, events?: FallbackEvents);
    private initializeDefaultStrategies;
    executeStrategy(error: SearchError, query: string, context: ErrorContext): Promise<FallbackResult>;
    private executeStrategyWithTimeout;
    private executeCachedResults;
    private executeSimplifiedMode;
    private executeOfflineMode;
    private executeEmptyResults;
    private generateEmptyResultsSuggestions;
    private simpleStringMatch;
    private advancedOfflineMatch;
    private removeDuplicates;
    private getCacheKey;
    private hasCachedData;
    private hasOfflineData;
    private shouldEnterOfflineMode;
    private normalizeError;
    private updateSuccessMetrics;
    private updateSuccessRate;
    registerStrategy(strategy: FallbackStrategy): void;
    removeStrategy(name: string): void;
    getAvailableStrategies(error: SearchError, context: ErrorContext): FallbackStrategy[];
    isOfflineMode(): boolean;
    enableOfflineMode(): void;
    disableOfflineMode(): void;
    cacheResults(query: string, context: ErrorContext, data: any[], reliability?: number): void;
    private cleanupCache;
    clearCache(): void;
    getCacheStats(): {
        entries: number;
        totalSize: number;
        hitRate: number;
        averageAge: number;
    };
    getMetrics(): FallbackMetrics;
    resetMetrics(): void;
    setConfig(config: Partial<FallbackConfig>): void;
    getConfig(): FallbackConfig;
    getStrategy(name: string): FallbackStrategy | undefined;
    getAllStrategies(): FallbackStrategy[];
    testStrategy(strategyName: string, query: string, context: ErrorContext): Promise<FallbackResult>;
}
//# sourceMappingURL=FallbackManager.d.ts.map