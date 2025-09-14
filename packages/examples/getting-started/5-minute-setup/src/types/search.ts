/**
 * TypeScript type definitions for Universal Search
 * This file provides type safety for your search implementation
 */

export interface SearchItem {
  id?: string | number;
  name: string;
  category?: string;
  description?: string;
  price?: number;
  tags?: string[];
  [key: string]: any; // Allow additional properties
}

export interface SearchConfig {
  // Data configuration
  data?: SearchItem[];
  apiEndpoint?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  
  // Search behavior
  searchKeys?: string[];
  placeholder?: string;
  maxResults?: number;
  debounceMs?: number;
  fuzzySearch?: boolean;
  caseSensitive?: boolean;
  
  // UI configuration
  highlight?: boolean;
  showCategories?: boolean;
  showDescriptions?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  
  // Pagination
  pagination?: {
    enabled: boolean;
    pageSize: number;
  };
  
  // Filtering
  filters?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  
  // Callbacks
  onSearch?: (query: string, results: SearchItem[]) => void;
  onSelect?: (item: SearchItem) => void;
  onError?: (error: Error) => void;
}

export interface SearchResult {
  items: SearchItem[];
  totalCount: number;
  query: string;
  executionTime: number;
  hasMore: boolean;
}

export interface ApiResponse {
  data: SearchItem[];
  total?: number;
  page?: number;
  hasMore?: boolean;
  error?: string;
}

export interface SearchState {
  loading: boolean;
  error: string | null;
  results: SearchItem[];
  query: string;
  totalCount: number;
  currentPage: number;
}

export interface FilterOption {
  key: string;
  label: string;
  values: string[];
  multiple?: boolean;
}

export interface SearchEvents {
  search: (query: string) => void;
  select: (item: SearchItem) => void;
  filter: (filters: Record<string, any>) => void;
  paginate: (page: number) => void;
  clear: () => void;
}

export type SearchStrategy = 'exact' | 'fuzzy' | 'prefix' | 'contains';

export interface PerformanceMetrics {
  searchTime: number;
  renderTime: number;
  totalTime: number;
  resultCount: number;
  cacheHits: number;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}