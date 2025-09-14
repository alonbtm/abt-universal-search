/**
 * API utilities for Universal Search
 * Handles HTTP requests, error handling, and data transformation
 */

import { SearchItem, ApiResponse, SearchConfig } from '../types/search';

export class ApiClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  private timeout: number;

  constructor(config: SearchConfig) {
    this.baseUrl = config.apiEndpoint || '';
    this.headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
    
    if (config.apiKey) {
      this.headers['Authorization'] = `Bearer ${config.apiKey}`;
    }
    
    this.timeout = 5000; // 5 second timeout
  }

  async search(query: string, options: any = {}): Promise<ApiResponse> {
    const url = this.buildUrl('/search', { q: query, ...options });
    
    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return this.validateApiResponse(data);
    } catch (error) {
      console.error('API search error:', error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async fetchSuggestions(query: string): Promise<string[]> {
    if (query.length < 2) return [];
    
    const url = this.buildUrl('/suggestions', { q: query });
    
    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        return []; // Suggestions are non-critical, return empty array
      }

      const data = await response.json();
      return Array.isArray(data.suggestions) ? data.suggestions : [];
    } catch (error) {
      console.warn('Suggestions request failed:', error);
      return [];
    }
  }

  private buildUrl(endpoint: string, params: Record<string, any>): string {
    const url = new URL(endpoint, this.baseUrl);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    return url.toString();
  }

  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  private validateApiResponse(data: any): ApiResponse {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid API response format');
    }

    // Handle different API response formats
    if (Array.isArray(data)) {
      return {
        data: data as SearchItem[],
        total: data.length,
      };
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return {
      data: Array.isArray(data.data) ? data.data : data.results || [],
      total: data.total || data.count || 0,
      page: data.page || 1,
      hasMore: data.hasMore || false,
    };
  }
}

/**
 * Mock API client for development and testing
 */
export class MockApiClient {
  private mockData: SearchItem[];
  private delay: number;

  constructor(data: SearchItem[], delay = 200) {
    this.mockData = data;
    this.delay = delay;
  }

  async search(query: string, options: any = {}): Promise<ApiResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, this.delay));

    const normalizedQuery = query.toLowerCase().trim();
    
    if (!normalizedQuery) {
      return {
        data: [],
        total: 0,
      };
    }

    const filtered = this.mockData.filter(item => {
      const searchText = [
        item.name,
        item.category,
        item.description,
        ...(item.tags || []),
      ].join(' ').toLowerCase();

      return searchText.includes(normalizedQuery);
    });

    const page = options.page || 1;
    const pageSize = options.pageSize || 10;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return {
      data: filtered.slice(startIndex, endIndex),
      total: filtered.length,
      page,
      hasMore: endIndex < filtered.length,
    };
  }

  async fetchSuggestions(query: string): Promise<string[]> {
    await new Promise(resolve => setTimeout(resolve, 100));

    if (query.length < 2) return [];

    const suggestions = new Set<string>();
    const normalizedQuery = query.toLowerCase();

    this.mockData.forEach(item => {
      [item.name, item.category, ...(item.tags || [])].forEach(text => {
        if (text && text.toLowerCase().includes(normalizedQuery)) {
          suggestions.add(text);
        }
      });
    });

    return Array.from(suggestions).slice(0, 5);
  }
}

/**
 * Error handling utilities
 */
export function handleApiError(error: Error, onError?: (error: Error) => void): void {
  console.error('API Error:', error);
  
  if (onError) {
    onError(error);
  }
  
  // You can add error reporting here (e.g., to Sentry, LogRocket, etc.)
  // reportError(error);
}

/**
 * Validate search configuration
 */
export function validateConfig(config: SearchConfig): void {
  if (!config.data && !config.apiEndpoint) {
    throw new Error('Either data array or apiEndpoint must be provided');
  }

  if (config.apiEndpoint && !isValidUrl(config.apiEndpoint)) {
    throw new Error('Invalid API endpoint URL');
  }

  if (config.maxResults && config.maxResults < 1) {
    throw new Error('maxResults must be greater than 0');
  }

  if (config.debounceMs && config.debounceMs < 0) {
    throw new Error('debounceMs must be non-negative');
  }
}

function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}