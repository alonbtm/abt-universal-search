import {
  IFallbackManager,
  FallbackConfig,
  FallbackStrategy,
  FallbackExecutor,
  FallbackResult,
  SearchError,
  ErrorContext,
} from '../types/ErrorHandling';

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

export class FallbackManager implements IFallbackManager {
  private config: Required<FallbackConfig>;
  private strategies: Map<string, FallbackStrategy> = new Map();
  private events: FallbackEvents;
  private metrics: FallbackMetrics;
  private isOffline = false;
  private cache: Map<string, { data: any[]; timestamp: number; reliability: number }> = new Map();

  constructor(config?: Partial<FallbackConfig>, events: FallbackEvents = {}) {
    this.config = {
      enableCachedResults: true,
      enableSimplifiedMode: true,
      enableOfflineMode: true,
      cacheMaxAge: 300000, // 5 minutes
      priorityOrder: [],
      fallbackTimeout: 10000,
      ...config,
    };

    this.events = events;
    this.metrics = {
      totalFallbacks: 0,
      successfulFallbacks: 0,
      failedFallbacks: 0,
      fallbacksByStrategy: {},
      fallbackSuccessRate: 0,
      averageFallbackTime: 0,
      cacheHitRate: 0,
      offlineModeActivations: 0,
    };

    this.initializeDefaultStrategies();
  }

  private initializeDefaultStrategies(): void {
    // Cached results strategy
    if (this.config.enableCachedResults) {
      this.registerStrategy({
        name: 'cached-results',
        priority: 1,
        enabled: true,
        executor: {
          execute: this.executeCachedResults.bind(this),
          canExecute: (error, context) =>
            this.hasCachedData(
              this.getCacheKey((context.metadata?.query as string) || '', context)
            ),
          description: 'Return cached results from previous successful queries',
        },
        timeout: 1000,
      });
    }

    // Simplified mode strategy
    if (this.config.enableSimplifiedMode) {
      this.registerStrategy({
        name: 'simplified-mode',
        priority: 2,
        enabled: true,
        executor: {
          execute: this.executeSimplifiedMode.bind(this),
          canExecute: () => true,
          description: 'Provide basic functionality with reduced features',
        },
        timeout: 2000,
      });
    }

    // Offline mode strategy
    if (this.config.enableOfflineMode) {
      this.registerStrategy({
        name: 'offline-mode',
        priority: 3,
        enabled: true,
        condition: (error, context) => this.isOffline || this.shouldEnterOfflineMode(error),
        executor: {
          execute: this.executeOfflineMode.bind(this),
          canExecute: (error, context) => this.hasOfflineData(context),
          description: 'Use locally stored data when network is unavailable',
        },
        timeout: 500,
      });
    }

    // Empty results strategy (last resort)
    this.registerStrategy({
      name: 'empty-results',
      priority: 999,
      enabled: true,
      executor: {
        execute: this.executeEmptyResults.bind(this),
        canExecute: () => true,
        description: 'Return empty results with user guidance',
      },
      timeout: 100,
    });
  }

  public async executeStrategy(
    error: SearchError,
    query: string,
    context: ErrorContext
  ): Promise<FallbackResult> {
    const startTime = Date.now();
    this.metrics.totalFallbacks++;

    const availableStrategies = this.getAvailableStrategies(error, context);

    if (availableStrategies.length === 0) {
      throw new Error('No fallback strategies available for this error');
    }

    for (const strategy of availableStrategies) {
      if (!this.metrics.fallbacksByStrategy[strategy.name]) {
        this.metrics.fallbacksByStrategy[strategy.name] = 0;
      }
      this.metrics.fallbacksByStrategy[strategy.name]++;

      this.events.onFallbackStart?.(strategy.name, error);

      try {
        const result = await this.executeStrategyWithTimeout(strategy, query, context);
        const fallbackTime = Date.now() - startTime;

        this.updateSuccessMetrics(fallbackTime);
        this.events.onFallbackSuccess?.(result, strategy.name);

        return result;
      } catch (fallbackError) {
        const fallbackSearchError = this.normalizeError(fallbackError, strategy.name);
        this.events.onFallbackFailure?.(fallbackSearchError, strategy.name);

        // Continue to next strategy
        continue;
      }
    }

    // All strategies failed
    this.metrics.failedFallbacks++;
    this.updateSuccessRate();
    throw new Error('All fallback strategies failed');
  }

  private async executeStrategyWithTimeout(
    strategy: FallbackStrategy,
    query: string,
    context: ErrorContext
  ): Promise<FallbackResult> {
    const timeout = strategy.timeout || this.config.fallbackTimeout;

    return Promise.race([
      strategy.executor.execute(query, context),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Fallback strategy '${strategy.name}' timed out after ${timeout}ms`));
        }, timeout);
      }),
    ]);
  }

  private async executeCachedResults(
    query: string,
    context: ErrorContext
  ): Promise<FallbackResult> {
    const cacheKey = this.getCacheKey(query, context);
    const cached = this.cache.get(cacheKey);

    if (!cached) {
      throw new Error('No cached results available');
    }

    const age = Date.now() - cached.timestamp;
    if (age > this.config.cacheMaxAge) {
      this.cache.delete(cacheKey);
      throw new Error('Cached results have expired');
    }

    this.metrics.cacheHitRate = (this.metrics.cacheHitRate + 1) / 2; // Simple moving average

    return {
      success: true,
      data: cached.data,
      source: 'cache',
      isPartial: false,
      isCached: true,
      age,
      reliability: Math.max(0.5, cached.reliability - (age / this.config.cacheMaxAge) * 0.3),
      fallbackReason: 'Using cached results from previous successful query',
      suggestions: ['Cached results may be outdated', 'Try refreshing when network is available'],
    };
  }

  private async executeSimplifiedMode(
    query: string,
    context: ErrorContext
  ): Promise<FallbackResult> {
    // Simplified search using basic string matching on cached data
    const simplifiedResults: any[] = [];

    // Search through all cached data for basic matches
    for (const [, cached] of Array.from(this.cache)) {
      const matches = cached.data.filter((item: any) => this.simpleStringMatch(item, query));
      simplifiedResults.push(...matches);
    }

    // If no cached data, provide empty results with helpful suggestions
    if (simplifiedResults.length === 0) {
      return {
        success: true,
        data: [],
        source: 'simplified-mode',
        isPartial: true,
        isCached: false,
        reliability: 0.3,
        fallbackReason: 'Operating in simplified mode due to service unavailability',
        suggestions: [
          'Search functionality is limited',
          'Check network connection',
          'Try again later for full functionality',
        ],
      };
    }

    // Remove duplicates and limit results
    const uniqueResults = this.removeDuplicates(simplifiedResults).slice(0, 10);

    return {
      success: true,
      data: uniqueResults,
      source: 'simplified-mode',
      isPartial: true,
      isCached: true,
      reliability: 0.6,
      fallbackReason: 'Simplified search using locally cached data',
      suggestions: [
        'Results may be limited or outdated',
        'Full search will be available when service is restored',
      ],
    };
  }

  private async executeOfflineMode(query: string, context: ErrorContext): Promise<FallbackResult> {
    if (!this.isOffline) {
      this.enableOfflineMode();
    }

    // Use all available cached data for offline search
    const offlineResults: any[] = [];
    let totalReliability = 0;
    let cacheCount = 0;

    for (const [, cached] of Array.from(this.cache)) {
      const matches = cached.data.filter((item: any) => this.advancedOfflineMatch(item, query));

      if (matches.length > 0) {
        offlineResults.push(...matches);
        totalReliability += cached.reliability;
        cacheCount++;
      }
    }

    const averageReliability = cacheCount > 0 ? totalReliability / cacheCount : 0.2;
    const uniqueResults = this.removeDuplicates(offlineResults).slice(0, 20);

    return {
      success: true,
      data: uniqueResults,
      source: 'offline-mode',
      isPartial: true,
      isCached: true,
      reliability: averageReliability,
      fallbackReason: 'Operating in offline mode using stored data',
      suggestions: [
        'You are currently offline',
        'Results are from locally stored data',
        'Connect to network for latest results',
      ],
    };
  }

  private async executeEmptyResults(query: string, context: ErrorContext): Promise<FallbackResult> {
    return {
      success: false,
      data: [],
      source: 'empty-results',
      isPartial: true,
      isCached: false,
      reliability: 0,
      fallbackReason: 'Service unavailable and no cached data available',
      suggestions: this.generateEmptyResultsSuggestions(context),
    };
  }

  private generateEmptyResultsSuggestions(context: ErrorContext): string[] {
    const suggestions = [
      'Check your network connection',
      'Verify the service is operational',
      'Try again in a few moments',
    ];

    if (context.adapter) {
      suggestions.push(`Check ${context.adapter} adapter configuration`);
    }

    if (context.user?.permissions) {
      suggestions.push('Verify you have the necessary permissions');
    }

    return suggestions;
  }

  private simpleStringMatch(item: any, query: string): boolean {
    const searchText = query.toLowerCase();
    const itemText = JSON.stringify(item).toLowerCase();
    return itemText.includes(searchText);
  }

  private advancedOfflineMatch(item: any, query: string): boolean {
    const searchTerms = query.toLowerCase().split(/\s+/);
    const itemText = JSON.stringify(item).toLowerCase();

    // Require at least 50% of search terms to match
    const matchingTerms = searchTerms.filter(term => itemText.includes(term));
    return matchingTerms.length >= Math.ceil(searchTerms.length * 0.5);
  }

  private removeDuplicates(items: any[]): any[] {
    const seen = new Set();
    return items.filter(item => {
      const key = item.id || item.value || JSON.stringify(item);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private getCacheKey(query: string, context: ErrorContext): string {
    const adapter = context.adapter || 'default';
    const user = context.user?.id || 'anonymous';
    return `${adapter}:${user}:${query}`;
  }

  private hasCachedData(cacheKey: string): boolean {
    const cached = this.cache.get(cacheKey);
    if (!cached) return false;

    const age = Date.now() - cached.timestamp;
    return age <= this.config.cacheMaxAge;
  }

  private hasOfflineData(context: ErrorContext): boolean {
    return this.cache.size > 0;
  }

  private shouldEnterOfflineMode(error: SearchError): boolean {
    return (
      error.type === 'network' ||
      error.type === 'timeout' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENOTFOUND'
    );
  }

  private normalizeError(error: any, strategyName: string): SearchError {
    return {
      name: error.name || 'FallbackError',
      message: error.message || `Fallback strategy '${strategyName}' failed`,
      type: 'system',
      code: error.code || 'FALLBACK_FAILED',
      severity: 'medium',
      recoverability: 'transient',
      timestamp: Date.now(),
      correlationId: `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  private updateSuccessMetrics(fallbackTime: number): void {
    this.metrics.successfulFallbacks++;

    // Update average fallback time
    const totalSuccessful = this.metrics.successfulFallbacks;
    this.metrics.averageFallbackTime =
      (this.metrics.averageFallbackTime * (totalSuccessful - 1) + fallbackTime) / totalSuccessful;

    this.updateSuccessRate();
  }

  private updateSuccessRate(): void {
    this.metrics.fallbackSuccessRate =
      this.metrics.totalFallbacks > 0
        ? this.metrics.successfulFallbacks / this.metrics.totalFallbacks
        : 0;
  }

  public registerStrategy(strategy: FallbackStrategy): void {
    this.strategies.set(strategy.name, strategy);

    // Update priority order if not set
    if (!this.config.priorityOrder.find(s => s.name === strategy.name)) {
      this.config.priorityOrder.push(strategy);
      this.config.priorityOrder.sort((a, b) => a.priority - b.priority);
    }
  }

  public removeStrategy(name: string): void {
    this.strategies.delete(name);
    this.config.priorityOrder = this.config.priorityOrder.filter(s => s.name !== name);
  }

  public getAvailableStrategies(error: SearchError, context: ErrorContext): FallbackStrategy[] {
    const available = this.config.priorityOrder.filter(strategy => {
      if (!strategy.enabled) return false;

      const strategyImpl = this.strategies.get(strategy.name);
      if (!strategyImpl) return false;

      // Check strategy-specific condition
      if (strategy.condition && !strategy.condition(error, context)) {
        this.events.onFallbackSkipped?.(strategy.name, 'Strategy condition not met');
        return false;
      }

      // Check if executor can execute
      if (!strategyImpl.executor.canExecute(error, context)) {
        this.events.onFallbackSkipped?.(strategy.name, 'Executor cannot execute');
        return false;
      }

      return true;
    });

    return available;
  }

  public isOfflineMode(): boolean {
    return this.isOffline;
  }

  public enableOfflineMode(): void {
    if (!this.isOffline) {
      this.isOffline = true;
      this.metrics.offlineModeActivations++;
      this.events.onOfflineModeEnabled?.();
    }
  }

  public disableOfflineMode(): void {
    if (this.isOffline) {
      this.isOffline = false;
      this.events.onOfflineModeDisabled?.();
    }
  }

  public cacheResults(
    query: string,
    context: ErrorContext,
    data: any[],
    reliability: number = 1.0
  ): void {
    if (!this.config.enableCachedResults) return;

    const cacheKey = this.getCacheKey(query, context);
    this.cache.set(cacheKey, {
      data: [...data],
      timestamp: Date.now(),
      reliability: Math.max(0, Math.min(1, reliability)),
    });

    // Cleanup old cache entries
    this.cleanupCache();
  }

  private cleanupCache(): void {
    const now = Date.now();
    const maxAge = this.config.cacheMaxAge;

    for (const [key, cached] of Array.from(this.cache)) {
      if (now - cached.timestamp > maxAge) {
        this.cache.delete(key);
      }
    }
  }

  public clearCache(): void {
    this.cache.clear();
  }

  public getCacheStats(): {
    entries: number;
    totalSize: number;
    hitRate: number;
    averageAge: number;
  } {
    const now = Date.now();
    let totalAge = 0;
    let totalSize = 0;

    for (const [, cached] of Array.from(this.cache)) {
      totalAge += now - cached.timestamp;
      totalSize += cached.data.length;
    }

    return {
      entries: this.cache.size,
      totalSize,
      hitRate: this.metrics.cacheHitRate,
      averageAge: this.cache.size > 0 ? totalAge / this.cache.size : 0,
    };
  }

  public getMetrics(): FallbackMetrics {
    return { ...this.metrics };
  }

  public resetMetrics(): void {
    this.metrics = {
      totalFallbacks: 0,
      successfulFallbacks: 0,
      failedFallbacks: 0,
      fallbacksByStrategy: {},
      fallbackSuccessRate: 0,
      averageFallbackTime: 0,
      cacheHitRate: 0,
      offlineModeActivations: 0,
    };
  }

  public setConfig(config: Partial<FallbackConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): FallbackConfig {
    return { ...this.config };
  }

  public getStrategy(name: string): FallbackStrategy | undefined {
    return this.strategies.get(name);
  }

  public getAllStrategies(): FallbackStrategy[] {
    return Array.from(this.strategies.values());
  }

  public testStrategy(
    strategyName: string,
    query: string,
    context: ErrorContext
  ): Promise<FallbackResult> {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Strategy '${strategyName}' not found`);
    }

    return this.executeStrategyWithTimeout(strategy, query, context);
  }
}
