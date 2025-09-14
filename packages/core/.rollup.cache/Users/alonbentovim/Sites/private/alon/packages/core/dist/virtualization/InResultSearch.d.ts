import { IInResultSearch, SearchWithinConfig, SearchIndex, SearchResult, SearchHighlight } from '../types/Virtualization';
export interface SearchIndexConfig {
    fields: string[];
    caseSensitive: boolean;
    stemming: boolean;
    stopWords: string[];
    minLength: number;
    maxResults: number;
}
export interface SearchPerformanceMetrics {
    totalSearches: number;
    averageSearchTime: number;
    indexSize: number;
    cacheHitRate: number;
    lastRebuildTime: number;
}
export interface InResultSearchEvents<T = any> {
    onSearchStart?: (query: string) => void;
    onSearchComplete?: (query: string, results: SearchResult<T>[], timeMs: number) => void;
    onIndexUpdate?: (itemCount: number) => void;
    onHighlight?: (text: string, highlights: SearchHighlight[]) => void;
}
export declare class FastSearchIndex<T = any> implements SearchIndex<T> {
    private items;
    private invertedIndex;
    private fieldCache;
    private config;
    constructor(config?: Partial<SearchIndexConfig>);
    add(item: T, index: number): void;
    remove(index: number): void;
    update(item: T, index: number): void;
    search(query: string): SearchResult<T>[];
    private calculateDetailedScore;
    private scoreFieldMatch;
    private findTokenMatches;
    private calculateTokenScore;
    private extractTextFromField;
    private indexText;
    private tokenize;
    private stem;
    clear(): void;
    getSize(): number;
    getIndexStats(): {
        itemCount: number;
        indexSize: number;
        averageTermsPerItem: number;
        memoryEstimate: number;
    };
    private estimateMemoryUsage;
}
export declare class InResultSearch<T = any> implements IInResultSearch<T> {
    private config;
    private index;
    private events;
    private performanceMetrics;
    private searchCache;
    constructor(config?: Partial<SearchWithinConfig>, events?: InResultSearchEvents<T>);
    search(query: string, items: T[]): SearchResult<T>[];
    private getCacheKey;
    private shouldRebuildIndex;
    private fallbackSearch;
    private scoreItemMatch;
    private extractFieldText;
    private extractHighlights;
    private updatePerformanceMetrics;
    private trimCache;
    highlight(text: string, query: string): string;
    setConfig(config: SearchWithinConfig): void;
    getIndex(): SearchIndex<T> | null;
    updateIndex(items: T[]): void;
    clearIndex(): void;
    getPerformanceMetrics(): SearchPerformanceMetrics;
    preWarmCache(queries: string[], items: T[]): void;
    dispose(): void;
}
//# sourceMappingURL=InResultSearch.d.ts.map