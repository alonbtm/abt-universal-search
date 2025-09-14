/**
 * Enhanced Memory data source for searching in-memory JavaScript arrays
 * Supports advanced indexing, real-time updates, and configurable search algorithms
 */

import { SearchResult, SearchOptions, DataSourceConfig, DataSourceStats } from '../types';
import { SecurityUtils } from '../utils/SecurityUtils';
import { DataSourceBase } from './DataSourceBase';

interface IndexEntry {
  id: number;
  tokens: Set<string>;
  fields: Map<string, string>;
}

interface SearchIndex {
  tokens: Map<string, Set<number>>;
  entries: Map<number, IndexEntry>;
}

interface MemorySearchOptions extends SearchOptions {
  algorithm?: 'exact' | 'fuzzy' | 'prefix' | 'contains';
  fieldMapping?: Record<string, string>;
}

export class MemoryDataSource extends DataSourceBase {
  private data: any[] = [];
  private searchFields: string[] = ['title', 'description', 'content'];
  private cache: Map<string, SearchResult[]> = new Map();
  private index: SearchIndex = { tokens: new Map(), entries: new Map() };
  private isIndexed = false;
  private indexingThreshold = 1000; // Auto-index for datasets > 1000 items
  private searchAlgorithm: 'exact' | 'fuzzy' | 'prefix' | 'contains' = 'contains';
  private fieldMapping: Record<string, string> = {};

  constructor(config: DataSourceConfig) {
    super();
    
    if (config.data && Array.isArray(config.data)) {
      this.data = config.data;
    }
    
    if (config.options?.searchFields) {
      this.searchFields = config.options.searchFields;
    }

    if (config.options?.searchAlgorithm) {
      this.searchAlgorithm = config.options.searchAlgorithm;
    }

    if (config.options?.fieldMapping) {
      this.fieldMapping = config.options.fieldMapping;
    }

    if (config.options?.indexingThreshold) {
      this.indexingThreshold = config.options.indexingThreshold;
    }

    // Build index if dataset is large enough
    if (this.data.length >= this.indexingThreshold) {
      this.buildIndex();
    }
  }

  async search(query: string, options: MemorySearchOptions = {}): Promise<SearchResult[]> {
    const startTime = performance.now();
    const sanitizedQuery = SecurityUtils.sanitizeQuery(query);
    
    if (!sanitizedQuery || sanitizedQuery.length < 1) {
      return [];
    }

    // Check cache first
    const cacheKey = `${sanitizedQuery}-${JSON.stringify(options)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Use indexed search for large datasets, fallback to linear search
    const results = this.isIndexed && this.data.length >= this.indexingThreshold
      ? this.performIndexedSearch(sanitizedQuery, options)
      : this.performLinearSearch(sanitizedQuery, options);
    
    const searchTime = performance.now() - startTime;
    
    // Log performance for datasets over 1000 items
    if (this.data.length > 1000) {
      console.debug(`Memory search completed in ${searchTime.toFixed(2)}ms for ${this.data.length} items`);
    }
    
    // Cache results (limit cache size to prevent memory issues)
    if (this.cache.size >= 100) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(cacheKey, results);

    return results;
  }

  private performIndexedSearch(query: string, options: MemorySearchOptions): SearchResult[] {
    const algorithm = options.algorithm || this.searchAlgorithm;
    const tokens = this.tokenize(query.toLowerCase());
    const candidateIds = new Set<number>();
    
    // Find candidate items using inverted index
    for (const token of tokens) {
      const matchingIds = this.findTokenMatches(token, algorithm);
      for (const id of matchingIds) {
        candidateIds.add(id);
      }
    }

    // Score and rank candidates
    const results: Array<SearchResult & { _score: number }> = [];
    
    for (const id of candidateIds) {
      const item = this.data[id];
      if (!item) continue;
      
      const score = this.calculateIndexedScore(id, query.toLowerCase(), algorithm);
      
      if (score > 0) {
        const result: SearchResult & { _score: number } = {
          id: item.id || id,
          title: item.title || item.name || `Item ${id + 1}`,
          description: item.description || item.content || '',
          url: item.url,
          metadata: this.extractMetadata(item),
          score,
          _score: score
        };

        if (options.highlight) {
          const highlight = this.generateHighlight(result, query.toLowerCase());
          if (highlight) {
            result.highlight = highlight;
          }
        }

        results.push(result);
      }
    }

    return this.finalizeResults(results, options);
  }

  private performLinearSearch(query: string, options: MemorySearchOptions): SearchResult[] {
    const algorithm = options.algorithm || this.searchAlgorithm;
    const queryLower = query.toLowerCase();
    const results: Array<SearchResult & { _score: number }> = [];

    for (let i = 0; i < this.data.length; i++) {
      const item = this.data[i];
      const score = this.calculateLinearScore(item, queryLower, algorithm);
      
      if (score > 0) {
        const result: SearchResult & { _score: number } = {
          id: item.id || i,
          title: item.title || item.name || `Item ${i + 1}`,
          description: item.description || item.content || '',
          url: item.url,
          metadata: this.extractMetadata(item),
          score,
          _score: score
        };

        if (options.highlight) {
          const highlight = this.generateHighlight(result, queryLower);
          if (highlight) {
            result.highlight = highlight;
          }
        }

        results.push(result);
      }
    }

    return this.finalizeResults(results, options);
  }

  private finalizeResults(results: Array<SearchResult & { _score: number }>, options: MemorySearchOptions): SearchResult[] {
    // Sort by score (highest first)
    results.sort((a, b) => b._score - a._score);

    // Apply custom sorting if specified
    if (options.sort) {
      this.applySorting(results, options.sort);
    }

    // Apply pagination
    const start = options.offset || 0;
    const limit = options.limit || 20;
    const paginatedResults = results.slice(start, start + limit);

    // Remove internal _score property
    return paginatedResults.map(({ _score, ...result }) => result);
  }

  private buildIndex(): void {
    const startTime = performance.now();
    
    this.index.tokens.clear();
    this.index.entries.clear();
    
    for (let i = 0; i < this.data.length; i++) {
      const item = this.data[i];
      const entry: IndexEntry = {
        id: i,
        tokens: new Set(),
        fields: new Map()
      };
      
      // Index all searchable fields
      for (const field of this.searchFields) {
        const mappedField = this.fieldMapping[field] || field;
        const value = this.getNestedValue(item, mappedField);
        
        if (typeof value === 'string' && value.trim()) {
          const normalizedValue = value.toLowerCase();
          entry.fields.set(field, normalizedValue);
          
          // Tokenize and index
          const tokens = this.tokenize(normalizedValue);
          for (const token of tokens) {
            entry.tokens.add(token);
            
            if (!this.index.tokens.has(token)) {
              this.index.tokens.set(token, new Set());
            }
            this.index.tokens.get(token)!.add(i);
          }
        }
      }
      
      this.index.entries.set(i, entry);
    }
    
    this.isIndexed = true;
    const indexTime = performance.now() - startTime;
    console.debug(`Built search index for ${this.data.length} items in ${indexTime.toFixed(2)}ms`);
  }
  
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 0);
  }
  
  private findTokenMatches(token: string, algorithm: string): Set<number> {
    const matches = new Set<number>();
    
    switch (algorithm) {
      case 'exact':
        if (this.index.tokens.has(token)) {
          return new Set(this.index.tokens.get(token));
        }
        break;
        
      case 'prefix':
        for (const [indexedToken, ids] of this.index.tokens) {
          if (indexedToken.startsWith(token)) {
            for (const id of ids) {
              matches.add(id);
            }
          }
        }
        break;
        
      case 'contains':
      default:
        for (const [indexedToken, ids] of this.index.tokens) {
          if (indexedToken.includes(token)) {
            for (const id of ids) {
              matches.add(id);
            }
          }
        }
        break;
        
      case 'fuzzy':
        for (const [indexedToken, ids] of this.index.tokens) {
          if (this.fuzzyMatch(indexedToken, token)) {
            for (const id of ids) {
              matches.add(id);
            }
          }
        }
        break;
    }
    
    return matches;
  }
  
  private calculateIndexedScore(id: number, query: string, algorithm: string): number {
    const entry = this.index.entries.get(id);
    if (!entry) return 0;
    
    let score = 0;
    const queryTokens = this.tokenize(query);
    
    for (const [field, value] of entry.fields) {
      score += this.calculateFieldScore(value, query, queryTokens, algorithm);
    }
    
    return score;
  }
  
  private calculateLinearScore(item: any, query: string, algorithm: string): number {
    let score = 0;
    const queryTokens = this.tokenize(query);

    for (const field of this.searchFields) {
      const mappedField = this.fieldMapping[field] || field;
      const value = this.getNestedValue(item, mappedField);
      
      if (typeof value === 'string') {
        const valueLower = value.toLowerCase();
        score += this.calculateFieldScore(valueLower, query, queryTokens, algorithm);
      }
    }

    return score;
  }
  
  private calculateFieldScore(value: string, query: string, queryTokens: string[], algorithm: string): number {
    let score = 0;
    
    switch (algorithm) {
      case 'exact':
        if (value === query) {
          score += 100;
        } else {
          // Check for exact token matches
          const exactValueTokens = this.tokenize(value);
          for (const queryToken of queryTokens) {
            if (exactValueTokens.includes(queryToken)) {
              score += 30;
            }
          }
        }
        break;
        
      case 'prefix':
        if (value.startsWith(query)) {
          score += 100;
        } else {
          const prefixValueTokens = this.tokenize(value);
          for (const queryToken of queryTokens) {
            for (const valueToken of prefixValueTokens) {
              if (valueToken.startsWith(queryToken)) {
                score += 40;
              }
            }
          }
        }
        break;
        
      case 'fuzzy':
        if (this.fuzzyMatch(value, query)) {
          score += 60;
        }
        const fuzzyValueTokens = this.tokenize(value);
        for (const queryToken of queryTokens) {
          for (const valueToken of fuzzyValueTokens) {
            if (this.fuzzyMatch(valueToken, queryToken)) {
              score += 20;
            }
          }
        }
        break;
        
      case 'contains':
      default:
        // Full query match
        if (value.includes(query)) {
          score += value === query ? 100 : value.startsWith(query) ? 80 : 50;
        }
        
        // Token-based matching
        const containsValueTokens = this.tokenize(value);
        for (const queryToken of queryTokens) {
          for (const valueToken of containsValueTokens) {
            if (valueToken.includes(queryToken)) {
              score += valueToken === queryToken ? 40 : valueToken.startsWith(queryToken) ? 30 : 20;
            }
          }
        }
        break;
    }
    
    return score;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private fuzzyMatch(text: string, query: string): boolean {
    if (query.length === 0) return true;
    if (text.length === 0) return false;

    let queryIndex = 0;
    for (let i = 0; i < text.length && queryIndex < query.length; i++) {
      if (text[i] === query[queryIndex]) {
        queryIndex++;
      }
    }

    return queryIndex === query.length;
  }

  private generateHighlight(result: SearchResult, query: string): SearchResult['highlight'] {
    const highlight: SearchResult['highlight'] = {};

    if (result.title) {
      highlight.title = this.highlightText(result.title, query);
    }

    if (result.description) {
      highlight.description = this.highlightText(result.description, query);
    }

    return highlight;
  }

  private highlightText(text: string, query: string): string {
    const regex = new RegExp(`(${this.escapeRegExp(query)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private extractMetadata(item: any): Record<string, any> {
    const metadata: Record<string, any> = {};
    const excludeFields = ['id', 'title', 'description', 'content', 'url'];

    for (const [key, value] of Object.entries(item)) {
      if (!excludeFields.includes(key)) {
        metadata[key] = value;
      }
    }

    return metadata;
  }

  private applySorting(results: SearchResult[], sort: { field: string; direction: 'asc' | 'desc' }): void {
    results.sort((a, b) => {
      const aValue = this.getNestedValue(a, sort.field);
      const bValue = this.getNestedValue(b, sort.field);
      
      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;
      
      return sort.direction === 'desc' ? -comparison : comparison;
    });
  }

  setData(data: any[]): void {
    this.data = data;
    this.cache.clear(); // Clear cache when data changes
    
    // Rebuild index if dataset is large enough
    if (this.data.length >= this.indexingThreshold) {
      this.buildIndex();
    } else {
      this.isIndexed = false;
      this.index.tokens.clear();
      this.index.entries.clear();
    }
  }
  
  /**
   * Add a new item to the dataset with real-time index update
   */
  addItem(item: any): void {
    const id = this.data.length;
    this.data.push(item);
    this.cache.clear();
    
    // Update index if it exists
    if (this.isIndexed) {
      this.indexItem(item, id);
    } else if (this.data.length >= this.indexingThreshold) {
      // Build index if we've reached the threshold
      this.buildIndex();
    }
  }
  
  /**
   * Update an existing item with real-time index update
   */
  updateItem(id: number, item: any): void {
    if (id < 0 || id >= this.data.length) return;
    
    this.data[id] = item;
    this.cache.clear();
    
    if (this.isIndexed) {
      // Remove old index entry
      this.removeFromIndex(id);
      // Add new index entry
      this.indexItem(item, id);
    }
  }
  
  /**
   * Remove an item with real-time index update
   */
  removeItem(id: number): void {
    if (id < 0 || id >= this.data.length) return;
    
    this.data.splice(id, 1);
    this.cache.clear();
    
    // Rebuild index to handle ID shifts
    if (this.isIndexed) {
      this.buildIndex();
    }
  }
  
  private indexItem(item: any, id: number): void {
    const entry: IndexEntry = {
      id,
      tokens: new Set(),
      fields: new Map()
    };
    
    for (const field of this.searchFields) {
      const mappedField = this.fieldMapping[field] || field;
      const value = this.getNestedValue(item, mappedField);
      
      if (typeof value === 'string' && value.trim()) {
        const normalizedValue = value.toLowerCase();
        entry.fields.set(field, normalizedValue);
        
        const tokens = this.tokenize(normalizedValue);
        for (const token of tokens) {
          entry.tokens.add(token);
          
          if (!this.index.tokens.has(token)) {
            this.index.tokens.set(token, new Set());
          }
          this.index.tokens.get(token)!.add(id);
        }
      }
    }
    
    this.index.entries.set(id, entry);
  }
  
  private removeFromIndex(id: number): void {
    const entry = this.index.entries.get(id);
    if (!entry) return;
    
    // Remove from token index
    for (const token of entry.tokens) {
      const tokenIds = this.index.tokens.get(token);
      if (tokenIds) {
        tokenIds.delete(id);
        if (tokenIds.size === 0) {
          this.index.tokens.delete(token);
        }
      }
    }
    
    // Remove entry
    this.index.entries.delete(id);
  }
  
  /**
   * Get performance statistics
   */
  getStats(): DataSourceStats {
    return {
      itemCount: this.data.length,
      isIndexed: this.isIndexed,
      tokenCount: this.index.tokens.size,
      cacheSize: this.cache.size,
      indexingThreshold: this.indexingThreshold
    };
  }
  
  /**
   * Configure search algorithm and field mapping
   */
  configure(options: {
    searchAlgorithm?: 'exact' | 'fuzzy' | 'prefix' | 'contains';
    fieldMapping?: Record<string, string>;
    searchFields?: string[];
    indexingThreshold?: number;
  }): void {
    let shouldRebuildIndex = false;
    
    if (options.searchAlgorithm) {
      this.searchAlgorithm = options.searchAlgorithm;
    }
    
    if (options.fieldMapping) {
      this.fieldMapping = { ...options.fieldMapping };
      shouldRebuildIndex = true;
    }
    
    if (options.searchFields) {
      this.searchFields = [...options.searchFields];
      shouldRebuildIndex = true;
    }
    
    if (options.indexingThreshold) {
      this.indexingThreshold = options.indexingThreshold;
      shouldRebuildIndex = true;
    }
    
    // Rebuild index if configuration affects indexing
    if (shouldRebuildIndex && this.isIndexed) {
      this.buildIndex();
    }
    
    // Clear cache since search behavior may have changed
    this.cache.clear();
  }

  getData(): any[] {
    return [...this.data]; // Return copy to prevent external mutations
  }

  clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Force rebuild the search index
   */
  rebuildIndex(): void {
    if (this.data.length >= this.indexingThreshold) {
      this.buildIndex();
    }
  }
  
  /**
   * Get current search algorithm
   */
  getSearchAlgorithm(): string {
    return this.searchAlgorithm;
  }
  
  /**
   * Check if the data source is using indexed search
   */
  isUsingIndex(): boolean {
    return this.isIndexed && this.data.length >= this.indexingThreshold;
  }
}