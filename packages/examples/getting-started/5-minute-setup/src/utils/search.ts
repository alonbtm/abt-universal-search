/**
 * Search utilities and algorithms
 * Provides various search strategies and helper functions
 */

import { SearchItem, SearchStrategy, PerformanceMetrics } from '../types/search';

export class SearchEngine {
  private searchStrategy: SearchStrategy;
  private caseSensitive: boolean;

  constructor(strategy: SearchStrategy = 'contains', caseSensitive = false) {
    this.searchStrategy = strategy;
    this.caseSensitive = caseSensitive;
  }

  search(items: SearchItem[], query: string, searchKeys: string[]): SearchItem[] {
    if (!query.trim()) return [];

    const normalizedQuery = this.caseSensitive ? query : query.toLowerCase();
    const startTime = performance.now();

    const results = items.filter(item => 
      this.itemMatches(item, normalizedQuery, searchKeys)
    );

    // Sort by relevance
    const sortedResults = this.sortByRelevance(results, normalizedQuery, searchKeys);
    
    const endTime = performance.now();
    console.debug(`Search completed in ${(endTime - startTime).toFixed(2)}ms`);

    return sortedResults;
  }

  private itemMatches(item: SearchItem, query: string, searchKeys: string[]): boolean {
    return searchKeys.some(key => {
      const value = item[key];
      if (!value) return false;

      const searchText = this.caseSensitive ? String(value) : String(value).toLowerCase();
      
      switch (this.searchStrategy) {
        case 'exact':
          return searchText === query;
        case 'prefix':
          return searchText.startsWith(query);
        case 'contains':
          return searchText.includes(query);
        case 'fuzzy':
          return this.fuzzyMatch(searchText, query);
        default:
          return searchText.includes(query);
      }
    });
  }

  private fuzzyMatch(text: string, pattern: string, threshold = 0.6): boolean {
    const distance = this.levenshteinDistance(text, pattern);
    const maxLength = Math.max(text.length, pattern.length);
    const similarity = 1 - distance / maxLength;
    
    return similarity >= threshold;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    );

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private sortByRelevance(items: SearchItem[], query: string, searchKeys: string[]): SearchItem[] {
    return items.sort((a, b) => {
      const scoreA = this.calculateRelevanceScore(a, query, searchKeys);
      const scoreB = this.calculateRelevanceScore(b, query, searchKeys);
      return scoreB - scoreA; // Higher score first
    });
  }

  private calculateRelevanceScore(item: SearchItem, query: string, searchKeys: string[]): number {
    let score = 0;

    searchKeys.forEach(key => {
      const value = item[key];
      if (!value) return;

      const searchText = this.caseSensitive ? String(value) : String(value).toLowerCase();
      
      // Exact match gets highest score
      if (searchText === query) {
        score += 100;
      }
      // Starts with query gets high score
      else if (searchText.startsWith(query)) {
        score += 50;
      }
      // Contains query gets medium score
      else if (searchText.includes(query)) {
        score += 25;
      }
      
      // Bonus points for shorter text (more relevant)
      if (searchText.length < 50) {
        score += 10;
      }
      
      // Bonus for primary fields (name gets more weight than description)
      if (key === 'name') {
        score *= 1.5;
      } else if (key === 'category') {
        score *= 1.2;
      }
    });

    return score;
  }
}

/**
 * Debounce function to limit API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Highlight matching text in search results
 */
export function highlightMatches(text: string, query: string, caseSensitive = false): string {
  if (!query.trim() || !text) return text;

  const flags = caseSensitive ? 'g' : 'gi';
  const regex = new RegExp(`(${escapeRegExp(query)})`, flags);
  
  return text.replace(regex, '<mark class="search-highlight">$1</mark>');
}

/**
 * Escape special regex characters
 */
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract unique values for filter options
 */
export function extractFilterOptions(items: SearchItem[], key: string): string[] {
  const values = new Set<string>();
  
  items.forEach(item => {
    const value = item[key];
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach(v => values.add(String(v)));
      } else {
        values.add(String(value));
      }
    }
  });

  return Array.from(values).sort();
}

/**
 * Filter items based on selected filters
 */
export function applyFilters(items: SearchItem[], filters: Record<string, any>): SearchItem[] {
  return items.filter(item => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value || (Array.isArray(value) && value.length === 0)) {
        return true; // No filter applied
      }

      const itemValue = item[key];
      
      if (Array.isArray(value)) {
        // Multi-select filter
        return value.some(filterValue => 
          Array.isArray(itemValue) 
            ? itemValue.includes(filterValue)
            : itemValue === filterValue
        );
      } else {
        // Single value filter
        return Array.isArray(itemValue) 
          ? itemValue.includes(value)
          : itemValue === value;
      }
    });
  });
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private startTime: number = 0;
  private metrics: PerformanceMetrics[] = [];

  start(): void {
    this.startTime = performance.now();
  }

  end(resultCount: number, cacheHits = 0): PerformanceMetrics {
    const endTime = performance.now();
    const totalTime = endTime - this.startTime;
    
    const metric: PerformanceMetrics = {
      searchTime: totalTime,
      renderTime: 0, // Will be set by UI component
      totalTime,
      resultCount,
      cacheHits,
    };

    this.metrics.push(metric);
    
    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }

    return metric;
  }

  getAverageMetrics(): Partial<PerformanceMetrics> {
    if (this.metrics.length === 0) return {};

    const total = this.metrics.reduce((acc, metric) => ({
      searchTime: acc.searchTime + metric.searchTime,
      renderTime: acc.renderTime + metric.renderTime,
      totalTime: acc.totalTime + metric.totalTime,
      resultCount: acc.resultCount + metric.resultCount,
      cacheHits: acc.cacheHits + metric.cacheHits,
    }), {
      searchTime: 0,
      renderTime: 0,
      totalTime: 0,
      resultCount: 0,
      cacheHits: 0,
    });

    const count = this.metrics.length;

    return {
      searchTime: total.searchTime / count,
      renderTime: total.renderTime / count,
      totalTime: total.totalTime / count,
      resultCount: total.resultCount / count,
      cacheHits: total.cacheHits / count,
    };
  }

  getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metrics];
  }
}