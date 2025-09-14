/**
 * Search Index - Performance optimization for large datasets
 * @description Provides indexing and efficient search for in-memory data
 */

import type { SearchIndex, MemorySearchResult } from '../types/Results';
import type { MemoryPerformanceConfig } from '../types/Config';
import { ValidationError } from './validation';

/**
 * Search index entry
 */
interface IndexEntry {
  /** Item index in original data */
  itemIndex: number;
  /** Field name */
  field: string;
  /** Indexed value */
  value: string;
  /** Normalized value for case-insensitive search */
  normalizedValue: string;
}

/**
 * Index statistics
 */
interface IndexStats {
  /** Total number of indexed entries */
  totalEntries: number;
  /** Number of unique keys */
  uniqueKeys: number;
  /** Average key length */
  averageKeyLength: number;
  /** Estimated memory usage in bytes */
  memoryUsage: number;
  /** Last rebuild time */
  lastRebuild: number;
  /** Build time in milliseconds */
  buildTime: number;
}

/**
 * Search options for indexed search
 */
interface SearchOptions {
  /** Case sensitive search */
  caseSensitive: boolean;
  /** Match mode */
  matchMode: 'exact' | 'partial' | 'fuzzy' | 'prefix';
  /** Maximum results to return */
  maxResults?: number;
  /** Minimum score threshold */
  minScore?: number;
  /** Fields to search (subset of indexed fields) */
  fields?: string[];
}

/**
 * Advanced search index with multiple indexing strategies
 */
export class AdvancedSearchIndex {
  private data: unknown[] = [];
  private fields: string[] = [];
  private config: MemoryPerformanceConfig;
  
  // Different index types
  private exactIndex = new Map<string, Set<number>>();
  private prefixIndex = new Map<string, Set<number>>();
  private ngramIndex = new Map<string, Set<number>>();
  private soundexIndex = new Map<string, Set<number>>();
  
  private stats: IndexStats;
  private isBuilt = false;
  private changeCount = 0;

  constructor(config: MemoryPerformanceConfig) {
    this.config = config;
    this.stats = {
      totalEntries: 0,
      uniqueKeys: 0,
      averageKeyLength: 0,
      memoryUsage: 0,
      lastRebuild: 0,
      buildTime: 0
    };
  }

  /**
   * Build index from data
   */
  public buildIndex(data: unknown[], fields: string[]): void {
    if (!this.config.enableIndexing) {
      return;
    }

    const startTime = performance.now();
    
    this.data = data;
    this.fields = fields;
    this.clearIndexes();

    for (let itemIndex = 0; itemIndex < data.length; itemIndex++) {
      const item = data[itemIndex];
      this.indexItem(item, itemIndex);
    }

    this.updateStats(performance.now() - startTime);
    this.isBuilt = true;
    this.changeCount = 0;
  }

  /**
   * Search using the index
   */
  public search(query: string, options: SearchOptions): MemorySearchResult[] {
    if (!this.isBuilt || !this.config.enableIndexing) {
      throw new ValidationError('Index not built or indexing disabled');
    }

    const startTime = performance.now();
    const normalizedQuery = options.caseSensitive ? query : query.toLowerCase();
    const searchFields = options.fields || this.fields;
    
    const resultMap = new Map<number, MemorySearchResult>();

    for (const field of searchFields) {
      const fieldResults = this.searchField(field, normalizedQuery, options);
      
      for (const result of fieldResults) {
        const existing = resultMap.get(result.originalIndex);
        if (existing) {
          // Combine scores and matched fields
          existing.score += result.score;
          existing.matchedFields.push(...result.matchedFields);
        } else {
          resultMap.set(result.originalIndex, result);
        }
      }
    }

    const results = Array.from(resultMap.values());
    const searchTime = performance.now() - startTime;

    // Add search metadata
    for (const result of results) {
      result.searchMetadata = {
        usedIndex: true,
        searchTime,
        cacheHit: false // Would be determined by caching layer
      };
    }

    // Sort by score and apply limits
    results.sort((a, b) => b.score - a.score);

    if (options.minScore) {
      const filtered = results.filter(r => r.score >= options.minScore!);
      return options.maxResults ? filtered.slice(0, options.maxResults) : filtered;
    }

    return options.maxResults ? results.slice(0, options.maxResults) : results;
  }

  /**
   * Update index after data changes
   */
  public updateIndex(changes: { type: 'add' | 'update' | 'delete'; index: number; item?: unknown }[]): void {
    if (!this.config.enableIndexing) {
      return;
    }

    for (const change of changes) {
      switch (change.type) {
        case 'add':
          if (change.item !== undefined) {
            this.data.push(change.item);
            this.indexItem(change.item, this.data.length - 1);
          }
          break;
        case 'update':
          if (change.item !== undefined && change.index < this.data.length) {
            this.removeItemFromIndex(change.index);
            this.data[change.index] = change.item;
            this.indexItem(change.item, change.index);
          }
          break;
        case 'delete':
          if (change.index < this.data.length) {
            this.removeItemFromIndex(change.index);
            this.data.splice(change.index, 1);
            // Reindex all items after deleted index
            this.reindexFromIndex(change.index);
          }
          break;
      }
    }

    this.changeCount += changes.length;

    // Rebuild index if too many changes
    const threshold = this.config.indexRebuildThreshold || 100;
    if (this.changeCount >= threshold) {
      this.buildIndex(this.data, this.fields);
    }
  }

  /**
   * Get index statistics
   */
  public getStats(): IndexStats {
    return { ...this.stats };
  }

  /**
   * Check if index is built and ready
   */
  public isReady(): boolean {
    return this.isBuilt;
  }

  /**
   * Clear all indexes
   */
  public clear(): void {
    this.clearIndexes();
    this.data = [];
    this.fields = [];
    this.isBuilt = false;
    this.changeCount = 0;
  }

  /**
   * Get memory usage estimation
   */
  public getMemoryUsage(): number {
    return this.stats.memoryUsage;
  }

  /**
   * Search within a specific field
   */
  private searchField(field: string, query: string, options: SearchOptions): MemorySearchResult[] {
    const results: MemorySearchResult[] = [];
    
    switch (options.matchMode) {
      case 'exact':
        this.searchExact(field, query, results);
        break;
      case 'prefix':
        this.searchPrefix(field, query, results);
        break;
      case 'partial':
        this.searchPartial(field, query, results);
        break;
      case 'fuzzy':
        this.searchFuzzy(field, query, results);
        break;
    }

    return results;
  }

  /**
   * Exact match search
   */
  private searchExact(field: string, query: string, results: MemorySearchResult[]): void {
    const key = `${field}:${query}`;
    const indices = this.exactIndex.get(key);
    
    if (indices) {
      for (const index of indices) {
        results.push({
          item: this.data[index],
          score: 10, // Highest score for exact match
          matchedFields: [field],
          originalIndex: index
        });
      }
    }
  }

  /**
   * Prefix match search
   */
  private searchPrefix(field: string, query: string, results: MemorySearchResult[]): void {
    for (const [key, indices] of this.prefixIndex.entries()) {
      if (key.startsWith(`${field}:`) && key.substring(field.length + 1).startsWith(query)) {
        for (const index of indices) {
          results.push({
            item: this.data[index],
            score: 5, // High score for prefix match
            matchedFields: [field],
            originalIndex: index
          });
        }
      }
    }
  }

  /**
   * Partial match search using n-grams
   */
  private searchPartial(field: string, query: string, results: MemorySearchResult[]): void {
    const ngrams = this.generateNgrams(query, 3);
    const scoreMap = new Map<number, number>();

    for (const ngram of ngrams) {
      const key = `${field}:${ngram}`;
      const indices = this.ngramIndex.get(key);
      
      if (indices) {
        for (const index of indices) {
          const currentScore = scoreMap.get(index) || 0;
          scoreMap.set(index, currentScore + 1);
        }
      }
    }

    for (const [index, score] of scoreMap.entries()) {
      results.push({
        item: this.data[index],
        score: score / ngrams.length, // Normalize by number of ngrams
        matchedFields: [field],
        originalIndex: index
      });
    }
  }

  /**
   * Fuzzy search using Soundex
   */
  private searchFuzzy(field: string, query: string, results: MemorySearchResult[]): void {
    const soundexKey = `${field}:${this.soundex(query)}`;
    const indices = this.soundexIndex.get(soundexKey);
    
    if (indices) {
      for (const index of indices) {
        results.push({
          item: this.data[index],
          score: 2, // Lower score for fuzzy match
          matchedFields: [field],
          originalIndex: index
        });
      }
    }
  }

  /**
   * Index a single item
   */
  private indexItem(item: unknown, itemIndex: number): void {
    if (!item || typeof item !== 'object') {
      return;
    }

    for (const field of this.fields) {
      const value = this.getFieldValue(item, field);
      if (value !== null && value !== undefined) {
        const stringValue = String(value);
        const normalizedValue = stringValue.toLowerCase();

        this.addToExactIndex(field, normalizedValue, itemIndex);
        this.addToPrefixIndex(field, normalizedValue, itemIndex);
        this.addToNgramIndex(field, normalizedValue, itemIndex);
        this.addToSoundexIndex(field, normalizedValue, itemIndex);
      }
    }
  }

  /**
   * Add to exact match index
   */
  private addToExactIndex(field: string, value: string, itemIndex: number): void {
    const key = `${field}:${value}`;
    if (!this.exactIndex.has(key)) {
      this.exactIndex.set(key, new Set());
    }
    this.exactIndex.get(key)!.add(itemIndex);
  }

  /**
   * Add to prefix index
   */
  private addToPrefixIndex(field: string, value: string, itemIndex: number): void {
    for (let i = 1; i <= Math.min(value.length, 10); i++) {
      const prefix = value.substring(0, i);
      const key = `${field}:${prefix}`;
      if (!this.prefixIndex.has(key)) {
        this.prefixIndex.set(key, new Set());
      }
      this.prefixIndex.get(key)!.add(itemIndex);
    }
  }

  /**
   * Add to n-gram index
   */
  private addToNgramIndex(field: string, value: string, itemIndex: number): void {
    const ngrams = this.generateNgrams(value, 3);
    for (const ngram of ngrams) {
      const key = `${field}:${ngram}`;
      if (!this.ngramIndex.has(key)) {
        this.ngramIndex.set(key, new Set());
      }
      this.ngramIndex.get(key)!.add(itemIndex);
    }
  }

  /**
   * Add to Soundex index
   */
  private addToSoundexIndex(field: string, value: string, itemIndex: number): void {
    const soundex = this.soundex(value);
    const key = `${field}:${soundex}`;
    if (!this.soundexIndex.has(key)) {
      this.soundexIndex.set(key, new Set());
    }
    this.soundexIndex.get(key)!.add(itemIndex);
  }

  /**
   * Remove item from all indexes
   */
  private removeItemFromIndex(itemIndex: number): void {
    // This is complex - would need to track which keys contain which indices
    // For simplicity, we'll mark for rebuild instead
    this.changeCount += 10; // Trigger rebuild sooner for deletes
  }

  /**
   * Reindex items starting from a given index
   */
  private reindexFromIndex(startIndex: number): void {
    // Clear affected entries and rebuild
    // This is simplified - a full implementation would be more efficient
    this.buildIndex(this.data, this.fields);
  }

  /**
   * Clear all index data structures
   */
  private clearIndexes(): void {
    this.exactIndex.clear();
    this.prefixIndex.clear();
    this.ngramIndex.clear();
    this.soundexIndex.clear();
  }

  /**
   * Update index statistics
   */
  private updateStats(buildTime: number): void {
    const totalKeys = this.exactIndex.size + this.prefixIndex.size + 
                     this.ngramIndex.size + this.soundexIndex.size;
    
    let totalKeyLength = 0;
    let totalEntries = 0;

    for (const key of this.exactIndex.keys()) {
      totalKeyLength += key.length;
      totalEntries += this.exactIndex.get(key)!.size;
    }

    this.stats = {
      totalEntries,
      uniqueKeys: totalKeys,
      averageKeyLength: totalKeys > 0 ? totalKeyLength / totalKeys : 0,
      memoryUsage: this.estimateMemoryUsage(),
      lastRebuild: Date.now(),
      buildTime
    };
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    // Rough estimation - in bytes
    let usage = 0;
    
    usage += this.exactIndex.size * 50; // Estimated overhead per Map entry
    usage += this.prefixIndex.size * 50;
    usage += this.ngramIndex.size * 50;
    usage += this.soundexIndex.size * 50;
    
    return usage;
  }

  /**
   * Generate n-grams from a string
   */
  private generateNgrams(text: string, n: number): string[] {
    if (text.length < n) {
      return [text];
    }

    const ngrams: string[] = [];
    for (let i = 0; i <= text.length - n; i++) {
      ngrams.push(text.substring(i, i + n));
    }
    return ngrams;
  }

  /**
   * Simple Soundex implementation for fuzzy matching
   */
  private soundex(word: string): string {
    if (!word) return '';
    
    word = word.toUpperCase();
    let soundex = word[0];
    
    const mapping: { [key: string]: string } = {
      'B': '1', 'F': '1', 'P': '1', 'V': '1',
      'C': '2', 'G': '2', 'J': '2', 'K': '2', 'Q': '2', 'S': '2', 'X': '2', 'Z': '2',
      'D': '3', 'T': '3',
      'L': '4',
      'M': '5', 'N': '5',
      'R': '6'
    };

    for (let i = 1; i < word.length && soundex.length < 4; i++) {
      const code = mapping[word[i]];
      if (code && soundex[soundex.length - 1] !== code) {
        soundex += code;
      }
    }

    return soundex.padEnd(4, '0');
  }

  /**
   * Get field value from object (supports dot notation)
   */
  private getFieldValue(obj: unknown, field: string): unknown {
    if (!obj || typeof obj !== 'object') {
      return null;
    }

    const path = field.split('.');
    let current: any = obj;

    for (const key of path) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return null;
      }
    }

    return current;
  }
}

/**
 * Search index factory and manager
 */
export class SearchIndexFactory {
  private static instances = new Map<string, AdvancedSearchIndex>();

  /**
   * Get or create search index
   */
  public static getIndex(key: string, config: MemoryPerformanceConfig): AdvancedSearchIndex {
    if (!this.instances.has(key)) {
      this.instances.set(key, new AdvancedSearchIndex(config));
    }
    return this.instances.get(key)!;
  }

  /**
   * Create new search index
   */
  public static createIndex(config: MemoryPerformanceConfig): AdvancedSearchIndex {
    return new AdvancedSearchIndex(config);
  }

  /**
   * Clear specific index
   */
  public static clearIndex(key: string): void {
    const index = this.instances.get(key);
    if (index) {
      index.clear();
      this.instances.delete(key);
    }
  }

  /**
   * Clear all indexes
   */
  public static clearAllIndexes(): void {
    for (const index of this.instances.values()) {
      index.clear();
    }
    this.instances.clear();
  }

  /**
   * Get memory usage for all indexes
   */
  public static getTotalMemoryUsage(): number {
    let total = 0;
    for (const index of this.instances.values()) {
      total += index.getMemoryUsage();
    }
    return total;
  }
}

/**
 * Global search index factory instance
 */
export const searchIndexFactory = SearchIndexFactory;