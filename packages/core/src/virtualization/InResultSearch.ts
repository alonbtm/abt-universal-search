import {
  IInResultSearch,
  SearchWithinConfig,
  SearchIndex,
  SearchResult,
  SearchHighlight
} from '../types/Virtualization';

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

export class FastSearchIndex<T = any> implements SearchIndex<T> {
  private items: Map<number, T> = new Map();
  private invertedIndex: Map<string, Set<number>> = new Map();
  private fieldCache: Map<number, Map<string, string>> = new Map();
  private config: SearchIndexConfig;

  constructor(config: Partial<SearchIndexConfig> = {}) {
    this.config = {
      fields: ['label', 'value', 'text'],
      caseSensitive: false,
      stemming: false,
      stopWords: ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'],
      minLength: 2,
      maxResults: 1000,
      ...config
    };
  }

  public add(item: T, index: number): void {
    this.items.set(index, item);
    
    // Extract and index text from all configured fields
    const fieldData = new Map<string, string>();
    this.config.fields.forEach(field => {
      const text = this.extractTextFromField(item, field);
      if (text) {
        fieldData.set(field, text);
        this.indexText(text, index);
      }
    });
    
    this.fieldCache.set(index, fieldData);
  }

  public remove(index: number): void {
    const item = this.items.get(index);
    if (!item) return;

    // Remove from inverted index
    const fieldData = this.fieldCache.get(index);
    if (fieldData) {
      fieldData.forEach(text => {
        const tokens = this.tokenize(text);
        tokens.forEach(token => {
          const indexSet = this.invertedIndex.get(token);
          if (indexSet) {
            indexSet.delete(index);
            if (indexSet.size === 0) {
              this.invertedIndex.delete(token);
            }
          }
        });
      });
    }

    this.items.delete(index);
    this.fieldCache.delete(index);
  }

  public update(item: T, index: number): void {
    this.remove(index);
    this.add(item, index);
  }

  public search(query: string): SearchResult<T>[] {
    if (!query || query.length < this.config.minLength) {
      return [];
    }

    const tokens = this.tokenize(query);
    if (tokens.length === 0) return [];

    // Find candidate items using inverted index
    const candidateScores = new Map<number, number>();
    
    tokens.forEach((token, tokenIndex) => {
      const indexSet = this.invertedIndex.get(token);
      if (indexSet) {
        indexSet.forEach(itemIndex => {
          const currentScore = candidateScores.get(itemIndex) || 0;
          // Score based on token position (earlier tokens get higher score)
          const positionBoost = 1 / (tokenIndex + 1);
          candidateScores.set(itemIndex, currentScore + positionBoost);
        });
      }
    });

    // Convert to results and calculate detailed scores
    const results: SearchResult<T>[] = [];
    candidateScores.forEach((baseScore, index) => {
      const item = this.items.get(index);
      if (!item) return;

      const fieldData = this.fieldCache.get(index);
      if (!fieldData) return;

      const { score, highlights } = this.calculateDetailedScore(query, tokens, fieldData, baseScore);
      
      if (score > 0) {
        results.push({
          item,
          index,
          score,
          highlights
        });
      }
    });

    // Sort by score (descending) and limit results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.maxResults);
  }

  private calculateDetailedScore(
    query: string, 
    tokens: string[], 
    fieldData: Map<string, string>, 
    baseScore: number
  ): { score: number; highlights: SearchHighlight[] } {
    let totalScore = baseScore;
    const highlights: SearchHighlight[] = [];
    
    fieldData.forEach((text, field) => {
      const fieldScore = this.scoreFieldMatch(query, tokens, text, field);
      totalScore += fieldScore.score;
      highlights.push(...fieldScore.highlights);
    });

    return { score: totalScore, highlights };
  }

  private scoreFieldMatch(
    query: string,
    tokens: string[],
    text: string,
    field: string
  ): { score: number; highlights: SearchHighlight[] } {
    let score = 0;
    const highlights: SearchHighlight[] = [];
    const lowerText = this.config.caseSensitive ? text : text.toLowerCase();
    const lowerQuery = this.config.caseSensitive ? query : query.toLowerCase();

    // Exact match bonus
    if (lowerText.includes(lowerQuery)) {
      score += 10;
      const start = lowerText.indexOf(lowerQuery);
      highlights.push({
        field,
        start,
        end: start + query.length,
        text: text.substring(start, start + query.length)
      });
    }

    // Token-based scoring
    tokens.forEach(token => {
      const tokenMatches = this.findTokenMatches(lowerText, token);
      tokenMatches.forEach(match => {
        score += this.calculateTokenScore(match, text.length, field);
        highlights.push({
          field,
          start: match.start,
          end: match.end,
          text: text.substring(match.start, match.end)
        });
      });
    });

    return { score, highlights };
  }

  private findTokenMatches(text: string, token: string): Array<{ start: number; end: number }> {
    const matches: Array<{ start: number; end: number }> = [];
    let index = 0;

    while ((index = text.indexOf(token, index)) !== -1) {
      matches.push({
        start: index,
        end: index + token.length
      });
      index += token.length;
    }

    return matches;
  }

  private calculateTokenScore(match: { start: number; end: number }, textLength: number, field: string): number {
    let score = 1;

    // Position bonus (matches at the beginning get higher scores)
    if (match.start === 0) {
      score += 2;
    } else if (match.start < textLength * 0.1) {
      score += 1;
    }

    // Field type bonus
    if (field === 'label' || field === 'title') {
      score *= 1.5;
    } else if (field === 'value') {
      score *= 1.2;
    }

    return score;
  }

  private extractTextFromField(item: any, field: string): string | null {
    // Handle nested field paths like 'metadata.title'
    const fieldParts = field.split('.');
    let value = item;
    
    for (const part of fieldParts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return null;
      }
    }

    if (typeof value === 'string') {
      return value;
    } else if (typeof value === 'number') {
      return value.toString();
    } else if (value && typeof value.toString === 'function') {
      return value.toString();
    }

    return null;
  }

  private indexText(text: string, itemIndex: number): void {
    const tokens = this.tokenize(text);
    
    tokens.forEach(token => {
      if (!this.invertedIndex.has(token)) {
        this.invertedIndex.set(token, new Set());
      }
      this.invertedIndex.get(token)!.add(itemIndex);
    });
  }

  private tokenize(text: string): string[] {
    let normalizedText = this.config.caseSensitive ? text : text.toLowerCase();
    
    // Remove punctuation and split on whitespace
    normalizedText = normalizedText.replace(/[^\w\s]/g, ' ');
    const tokens = normalizedText.split(/\s+/).filter(token => 
      token.length >= this.config.minLength && 
      !this.config.stopWords.includes(token)
    );

    // Apply stemming if enabled
    if (this.config.stemming) {
      return tokens.map(token => this.stem(token));
    }

    return tokens;
  }

  private stem(word: string): string {
    // Simple stemming algorithm (Porter-like)
    if (word.length <= 2) return word;
    
    // Remove common suffixes
    const suffixes = ['ing', 'ed', 'er', 's', 'ly'];
    for (const suffix of suffixes) {
      if (word.endsWith(suffix) && word.length > suffix.length + 2) {
        return word.slice(0, -suffix.length);
      }
    }
    
    return word;
  }

  public clear(): void {
    this.items.clear();
    this.invertedIndex.clear();
    this.fieldCache.clear();
  }

  public getSize(): number {
    return this.items.size;
  }

  public getIndexStats() {
    return {
      itemCount: this.items.size,
      indexSize: this.invertedIndex.size,
      averageTermsPerItem: this.items.size > 0 ? this.invertedIndex.size / this.items.size : 0,
      memoryEstimate: this.estimateMemoryUsage()
    };
  }

  private estimateMemoryUsage(): number {
    // Rough memory estimation
    let memory = 0;
    
    // Items map
    memory += this.items.size * 50; // Assume ~50 bytes per item reference
    
    // Inverted index
    this.invertedIndex.forEach((indexSet, term) => {
      memory += term.length * 2; // String chars
      memory += indexSet.size * 8; // Number references
    });
    
    // Field cache
    this.fieldCache.forEach(fieldMap => {
      fieldMap.forEach((text, field) => {
        memory += field.length * 2 + text.length * 2;
      });
    });
    
    return memory;
  }
}

export class InResultSearch<T = any> implements IInResultSearch<T> {
  private config: Required<SearchWithinConfig>;
  private index: FastSearchIndex<T> | null = null;
  private events: InResultSearchEvents<T>;
  private performanceMetrics: SearchPerformanceMetrics;
  private searchCache: Map<string, SearchResult<T>[]> = new Map();

  constructor(
    config: Partial<SearchWithinConfig> = {},
    events: InResultSearchEvents<T> = {}
  ) {
    this.config = {
      enableHighlighting: true,
      caseSensitive: false,
      matchWholeWords: false,
      searchFields: ['label', 'value'],
      maxHighlights: 10,
      highlightClassName: 'search-highlight',
      ...config
    };

    this.events = events;
    this.performanceMetrics = {
      totalSearches: 0,
      averageSearchTime: 0,
      indexSize: 0,
      cacheHitRate: 0,
      lastRebuildTime: 0
    };
  }

  public search(query: string, items: T[]): SearchResult<T>[] {
    const startTime = performance.now();
    this.events.onSearchStart?.(query);

    // Check cache first
    const cacheKey = this.getCacheKey(query, items);
    if (this.searchCache.has(cacheKey)) {
      const cachedResults = this.searchCache.get(cacheKey)!;
      this.updatePerformanceMetrics(performance.now() - startTime, true);
      this.events.onSearchComplete?.(query, cachedResults, performance.now() - startTime);
      return cachedResults;
    }

    // Update index if needed
    if (!this.index || this.shouldRebuildIndex(items)) {
      this.updateIndex(items);
    }

    // Perform search
    const results = this.index ? this.index.search(query) : this.fallbackSearch(query, items);
    
    // Cache results
    this.searchCache.set(cacheKey, results);
    this.trimCache();
    
    const searchTime = performance.now() - startTime;
    this.updatePerformanceMetrics(searchTime, false);
    this.events.onSearchComplete?.(query, results, searchTime);

    return results;
  }

  private getCacheKey(query: string, items: T[]): string {
    // Simple cache key based on query and item count
    return `${query}:${items.length}`;
  }

  private shouldRebuildIndex(items: T[]): boolean {
    if (!this.index) return true;
    
    const currentSize = this.index.getSize();
    const expectedSize = items.length;
    
    // Rebuild if size difference is significant
    return Math.abs(currentSize - expectedSize) / Math.max(currentSize, expectedSize) > 0.1;
  }

  private fallbackSearch(query: string, items: T[]): SearchResult<T>[] {
    // Simple fallback search without index
    const lowerQuery = this.config.caseSensitive ? query : query.toLowerCase();
    const results: SearchResult<T>[] = [];

    items.forEach((item, index) => {
      const score = this.scoreItemMatch(item, lowerQuery);
      if (score > 0) {
        const highlights = this.extractHighlights(item, query);
        results.push({ item, index, score, highlights });
      }
    });

    return results.sort((a, b) => b.score - a.score);
  }

  private scoreItemMatch(item: T, query: string): number {
    let score = 0;

    this.config.searchFields.forEach(field => {
      const text = this.extractFieldText(item, field);
      if (text) {
        const lowerText = this.config.caseSensitive ? text : text.toLowerCase();
        if (lowerText.includes(query)) {
          score += this.config.matchWholeWords ? 
            (lowerText === query ? 10 : 5) :
            5;
        }
      }
    });

    return score;
  }

  private extractFieldText(item: any, field: string): string | null {
    const fieldParts = field.split('.');
    let value = item;
    
    for (const part of fieldParts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return null;
      }
    }

    return typeof value === 'string' ? value : 
           typeof value === 'number' ? value.toString() :
           value?.toString?.() || null;
  }

  private extractHighlights(item: T, query: string): SearchHighlight[] {
    if (!this.config.enableHighlighting) return [];

    const highlights: SearchHighlight[] = [];
    const lowerQuery = this.config.caseSensitive ? query : query.toLowerCase();

    this.config.searchFields.forEach(field => {
      const text = this.extractFieldText(item, field);
      if (text) {
        const lowerText = this.config.caseSensitive ? text : text.toLowerCase();
        let index = 0;
        let highlightCount = 0;

        while ((index = lowerText.indexOf(lowerQuery, index)) !== -1 && 
               highlightCount < this.config.maxHighlights) {
          highlights.push({
            field,
            start: index,
            end: index + query.length,
            text: text.substring(index, index + query.length)
          });
          index += query.length;
          highlightCount++;
        }
      }
    });

    return highlights;
  }

  private updatePerformanceMetrics(searchTime: number, wasCache: boolean): void {
    this.performanceMetrics.totalSearches++;
    
    if (wasCache) {
      const totalCacheChecks = this.performanceMetrics.totalSearches;
      this.performanceMetrics.cacheHitRate = 
        (this.performanceMetrics.cacheHitRate * (totalCacheChecks - 1) + 1) / totalCacheChecks;
    }

    if (!wasCache) {
      const totalNonCached = this.performanceMetrics.totalSearches - 
        Math.floor(this.performanceMetrics.totalSearches * this.performanceMetrics.cacheHitRate);
      
      this.performanceMetrics.averageSearchTime = 
        totalNonCached === 1 ? searchTime :
        (this.performanceMetrics.averageSearchTime * (totalNonCached - 1) + searchTime) / totalNonCached;
    }
  }

  private trimCache(): void {
    // Keep cache size reasonable
    const maxCacheSize = 50;
    if (this.searchCache.size > maxCacheSize) {
      const entries = Array.from(this.searchCache.entries());
      // Remove oldest half
      const toRemove = entries.slice(0, Math.floor(entries.length / 2));
      toRemove.forEach(([key]) => this.searchCache.delete(key));
    }
  }

  public highlight(text: string, query: string): string {
    if (!this.config.enableHighlighting || !query) return text;

    const lowerText = this.config.caseSensitive ? text : text.toLowerCase();
    const lowerQuery = this.config.caseSensitive ? query : query.toLowerCase();
    
    let highlightedText = text;
    let offset = 0;

    // Find and highlight all matches
    let index = 0;
    while ((index = lowerText.indexOf(lowerQuery, index)) !== -1) {
      const start = index + offset;
      const end = start + query.length;
      
      const before = highlightedText.substring(0, start);
      const match = highlightedText.substring(start, end);
      const after = highlightedText.substring(end);
      
      const highlighted = `<span class="${this.config.highlightClassName}">${match}</span>`;
      highlightedText = before + highlighted + after;
      
      offset += highlighted.length - match.length;
      index += query.length;
    }

    return highlightedText;
  }

  public setConfig(config: SearchWithinConfig): void {
    this.config = { ...this.config, ...config };
    
    // Clear cache and index when config changes
    this.searchCache.clear();
    this.clearIndex();
  }

  public getIndex(): SearchIndex<T> | null {
    return this.index;
  }

  public updateIndex(items: T[]): void {
    const startTime = performance.now();
    
    this.index = new FastSearchIndex({
      fields: this.config.searchFields,
      caseSensitive: this.config.caseSensitive,
      minLength: 1,
      maxResults: 1000
    });

    items.forEach((item, index) => {
      this.index!.add(item, index);
    });

    this.performanceMetrics.lastRebuildTime = performance.now() - startTime;
    this.performanceMetrics.indexSize = this.index.getSize();
    
    // Clear cache when index is updated
    this.searchCache.clear();
    
    this.events.onIndexUpdate?.(items.length);
  }

  public clearIndex(): void {
    if (this.index) {
      this.index.clear();
      this.index = null;
    }
    this.searchCache.clear();
    this.performanceMetrics.indexSize = 0;
  }

  public getPerformanceMetrics(): SearchPerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  public preWarmCache(queries: string[], items: T[]): void {
    queries.forEach(query => {
      this.search(query, items);
    });
  }

  public dispose(): void {
    this.clearIndex();
    this.searchCache.clear();
  }
}