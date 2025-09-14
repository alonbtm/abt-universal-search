/**
 * @fileoverview Comprehensive TypeScript definitions for Alon Search Component
 * @version 1.0.0
 * @author Alon Search Team
 * @description This module exports all TypeScript interfaces, types, and enums
 * for the Alon Search Component with complete JSDoc documentation, generic type support,
 * and excellent IDE integration.
 * 
 * @example Basic Usage
 * ```typescript
 * import { SearchConfiguration, SearchResult, SearchResultType } from '@alon/core';
 * 
 * const config: SearchConfiguration = {
 *   dataSources: [{ type: 'api', url: 'https://api.example.com/search' }],
 *   ui: { theme: 'light', placeholder: 'Search...' }
 * };
 * ```
 * 
 * @example Generic Types
 * ```typescript
 * import { SearchResult, GenericSearchResult } from '@alon/core';
 * 
 * interface CustomData {
 *   customField: string;
 *   metadata: Record<string, any>;
 * }
 * 
 * const result: GenericSearchResult<CustomData> = {
 *   id: '1',
 *   title: 'Custom Result',
 *   data: { customField: 'value', metadata: {} }
 * };
 * ```
 * 
 * @see {@link https://docs.alon.dev/typescript} TypeScript Documentation
 * @since 1.0.0
 */

// Core Configuration Types - Export only what exists
export {
  SearchConfiguration,
  DataSourceConfig,
  APIDataSourceConfig,
  SQLDataSourceConfig,
  DOMDataSourceConfig,
  UIConfig
} from './Config';

export {
  SearchResult,
  SearchResponse
} from './Results';

export {
  SearchEvent
} from './Events';

// Export only essential types that exist
export {
  ThemeConfig
} from './Theming';

export {
  AccessibilityConfig
} from './Accessibility';

// Enums are already declared below in this file

/**
 * Generic Types for Extensibility
 * Provides flexible type definitions for custom data structures and transformations
 */

/**
 * Generic search result type for custom data structures
 * @template TData - Custom data type for search results
 * 
 * @example
 * ```typescript
 * interface ProductData {
 *   price: number;
 *   category: string;
 *   inStock: boolean;
 * }
 * 
 * const productResult: GenericSearchResult<ProductData> = {
 *   id: 'product-1',
 *   title: 'Wireless Headphones',
 *   description: 'High-quality wireless headphones',
 *   data: {
 *     price: 99.99,
 *     category: 'Electronics',
 *     inStock: true
 *   }
 * };
 * ```
 */
export interface GenericSearchResult<TData = any> {
  /** Unique identifier for the search result */
  id: string;
  /** Primary display title */
  title: string;
  /** Optional description text */
  description?: string;
  /** Optional URL for the result */
  url?: string;
  /** Custom data payload */
  data: TData;
  /** Result type for categorization */
  type?: string;
  /** Relevance score (0-1) */
  score?: number;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Generic configuration type for extensible component customization
 * @template TCustomOptions - Custom configuration options
 * @template TDataSource - Custom data source configuration
 * 
 * @example
 * ```typescript
 * interface CustomOptions {
 *   enablePreview: boolean;
 *   maxPreviewLength: number;
 * }
 * 
 * interface APIDataSource {
 *   type: 'api';
 *   url: string;
 *   headers: Record<string, string>;
 * }
 * 
 * const config: GenericSearchConfiguration<CustomOptions, APIDataSource> = {
 *   dataSources: [{
 *     type: 'api',
 *     url: 'https://api.example.com',
 *     headers: { 'Authorization': 'Bearer token' }
 *   }],
 *   customOptions: {
 *     enablePreview: true,
 *     maxPreviewLength: 200
 *   }
 * };
 * ```
 */
export interface GenericSearchConfiguration<TCustomOptions = any, TDataSource = any> {
  /** Array of data source configurations */
  dataSources: TDataSource[];
  /** UI configuration options */
  ui?: {
    theme?: 'light' | 'dark' | 'auto';
    placeholder?: string;
    maxResults?: number;
    showCategories?: boolean;
  };
  /** Search behavior configuration */
  search?: {
    minQueryLength?: number;
    debounceDelay?: number;
    caseSensitive?: boolean;
    fuzzySearch?: boolean;
  };
  /** Custom configuration options */
  customOptions?: TCustomOptions;
  /** Performance optimization settings */
  performance?: {
    cacheEnabled?: boolean;
    virtualScrolling?: boolean;
    lazy?: boolean;
  };
}

/**
 * Generic event handler type for type-safe event handling
 * @template TEventData - Type of data passed to the event handler
 * 
 * @example
 * ```typescript
 * interface SelectEventData {
 *   result: SearchResult;
 *   index: number;
 *   query: string;
 * }
 * 
 * const onSelect: GenericEventHandler<SelectEventData> = (data) => {
 *   console.log('Selected:', data.result.title);
 *   console.log('Query was:', data.query);
 * };
 * ```
 */
export type GenericEventHandler<TEventData = any> = (data: TEventData) => void | Promise<void>;

/**
 * Generic callback function type for async operations
 * @template TInput - Input parameter type
 * @template TOutput - Return value type
 * 
 * @example
 * ```typescript
 * const transformer: GenericCallback<SearchResult[], SearchResult[]> = async (results) => {
 *   return results.map(result => ({
 *     ...result,
 *     title: result.title.toUpperCase()
 *   }));
 * };
 * ```
 */
export type GenericCallback<TInput = any, TOutput = any> = (input: TInput) => TOutput | Promise<TOutput>;

/**
 * Generic data transformer type for result processing
 * @template TSource - Source data type
 * @template TTarget - Target data type
 * 
 * @example
 * ```typescript
 * interface APIResponse {
 *   items: Array<{ name: string; desc: string; id: number }>;
 * }
 * 
 * const transformer: GenericDataTransformer<APIResponse, SearchResult[]> = (apiData) => {
 *   return apiData.items.map(item => ({
 *     id: item.id.toString(),
 *     title: item.name,
 *     description: item.desc,
 *     type: 'api-result'
 *   }));
 * };
 * ```
 */
export type GenericDataTransformer<TSource = any, TTarget = any> = (source: TSource) => TTarget;

/**
 * Generic validation function type for runtime type checking
 * @template T - Type to validate
 * 
 * @example
 * ```typescript
 * const validateSearchResult: GenericValidator<SearchResult> = (data): data is SearchResult => {
 *   return typeof data === 'object' &&
 *          typeof data.id === 'string' &&
 *          typeof data.title === 'string';
 * };
 * ```
 */
export type GenericValidator<T> = (data: any) => data is T;

/**
 * Generic filter function type for result filtering
 * @template T - Type being filtered
 * 
 * @example
 * ```typescript
 * const onlyInStock: GenericFilter<GenericSearchResult<{ inStock: boolean }>> = (result) => {
 *   return result.data.inStock === true;
 * };
 * ```
 */
export type GenericFilter<T> = (item: T) => boolean;

/**
 * Common enums for type safety and IntelliSense support
 */

/**
 * Search result types for categorization
 * @enum {string}
 */
export enum SearchResultType {
  /** General web page or document */
  PAGE = 'page',
  /** User profile or account */
  USER = 'user',
  /** Product or item */
  PRODUCT = 'product',
  /** Media file (image, video, audio) */
  MEDIA = 'media',
  /** Document file (PDF, DOC, etc.) */
  DOCUMENT = 'document',
  /** Contact or person */
  CONTACT = 'contact',
  /** Location or place */
  LOCATION = 'location',
  /** Event or activity */
  EVENT = 'event',
  /** Category or collection */
  CATEGORY = 'category',
  /** Custom type for extensions */
  CUSTOM = 'custom'
}

/**
 * Search query types for different search modes
 * @enum {string}
 */
export enum SearchQueryType {
  /** Free text search */
  TEXT = 'text',
  /** Exact phrase search */
  PHRASE = 'phrase',
  /** Boolean search with operators */
  BOOLEAN = 'boolean',
  /** Fuzzy/similarity search */
  FUZZY = 'fuzzy',
  /** Regular expression search */
  REGEX = 'regex',
  /** Wildcard search */
  WILDCARD = 'wildcard'
}

/**
 * Data source types for different backend integrations
 * @enum {string}
 */
export enum DataSourceType {
  /** REST API endpoint */
  API = 'api',
  /** Static JSON data */
  STATIC = 'static',
  /** Local storage data */
  LOCAL_STORAGE = 'localStorage',
  /** Session storage data */
  SESSION_STORAGE = 'sessionStorage',
  /** IndexedDB database */
  INDEXED_DB = 'indexedDB',
  /** WebSocket connection */
  WEBSOCKET = 'websocket',
  /** Server-sent events */
  SSE = 'sse',
  /** GraphQL endpoint */
  GRAPHQL = 'graphql',
  /** Custom data source */
  CUSTOM = 'custom'
}

/**
 * Theme variants for UI customization
 * @enum {string}
 */
export enum ThemeVariant {
  /** Light theme */
  LIGHT = 'light',
  /** Dark theme */
  DARK = 'dark',
  /** High contrast theme for accessibility */
  HIGH_CONTRAST = 'high-contrast',
  /** Automatic theme based on system preference */
  AUTO = 'auto',
  /** Custom theme */
  CUSTOM = 'custom'
}

/**
 * Event types for the search component
 * @enum {string}
 */
export enum SearchEventType {
  /** Query input changed */
  QUERY_CHANGE = 'query-change',
  /** Search started */
  SEARCH_START = 'search-start',
  /** Search completed */
  SEARCH_COMPLETE = 'search-complete',
  /** Search failed */
  SEARCH_ERROR = 'search-error',
  /** Result selected */
  RESULT_SELECT = 'result-select',
  /** Result hovered */
  RESULT_HOVER = 'result-hover',
  /** Dropdown opened */
  DROPDOWN_OPEN = 'dropdown-open',
  /** Dropdown closed */
  DROPDOWN_CLOSE = 'dropdown-close',
  /** Focus gained */
  FOCUS = 'focus',
  /** Focus lost */
  BLUR = 'blur',
  /** Component initialized */
  INIT = 'init',
  /** Component destroyed */
  DESTROY = 'destroy'
}

/**
 * Validation error types for runtime checking
 * @enum {string}
 */
export enum ValidationErrorType {
  /** Invalid type */
  INVALID_TYPE = 'invalid-type',
  /** Missing required property */
  MISSING_REQUIRED = 'missing-required',
  /** Invalid format */
  INVALID_FORMAT = 'invalid-format',
  /** Out of range value */
  OUT_OF_RANGE = 'out-of-range',
  /** Invalid configuration */
  INVALID_CONFIG = 'invalid-config',
  /** Validation failed */
  VALIDATION_FAILED = 'validation-failed'
}

/**
 * Type utility helpers for advanced TypeScript usage
 */

/**
 * Makes all properties of T optional recursively
 * @template T - Type to make optional
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[] 
    ? DeepPartial<U>[] 
    : T[P] extends object 
      ? DeepPartial<T[P]> 
      : T[P];
};

/**
 * Makes all properties of T required recursively
 * @template T - Type to make required
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends (infer U)[] 
    ? DeepRequired<U>[] 
    : T[P] extends object 
      ? DeepRequired<T[P]> 
      : T[P];
};

/**
 * Extracts keys of T that are of type U
 * @template T - Source type
 * @template U - Target type to match
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Creates a union type from the values of T
 * @template T - Object type to extract values from
 */
export type ValueOf<T> = T[keyof T];

/**
 * Omits keys K from T recursively
 * @template T - Source type
 * @template K - Keys to omit
 */
export type DeepOmit<T, K extends keyof any> = {
  [P in keyof T as P extends K ? never : P]: T[P] extends object 
    ? DeepOmit<T[P], K> 
    : T[P];
};

/**
 * Picks keys K from T recursively
 * @template T - Source type
 * @template K - Keys to pick
 */
export type DeepPick<T, K extends keyof T> = {
  [P in K]: T[P] extends object 
    ? DeepPick<T[P], keyof T[P]> 
    : T[P];
};

/**
 * Global type declarations for module augmentation
 * Allows users to extend interfaces with custom properties
 */
declare global {
  namespace AlonSearch {
    /**
     * Interface for custom search result extensions
     * Can be augmented by users to add custom properties
     */
    interface CustomSearchResultExtensions {}

    /**
     * Interface for custom configuration extensions
     * Can be augmented by users to add custom configuration options
     */
    interface CustomConfigurationExtensions {}

    /**
     * Interface for custom event data extensions
     * Can be augmented by users to add custom event data
     */
    interface CustomEventDataExtensions {}
  }
}

/**
 * Version information for backward compatibility
 */
export const VERSION = '1.0.0';
export const API_VERSION = '1';
export const TYPESCRIPT_VERSION = '^5.3.0';

/**
 * Deprecation utilities for version management
 */
export interface DeprecatedFeature {
  /** Feature name */
  name: string;
  /** Version when deprecated */
  deprecatedIn: string;
  /** Version when removed */
  removedIn: string;
  /** Replacement feature or migration path */
  replacement?: string;
  /** Additional migration notes */
  notes?: string;
}

/**
 * Type compatibility information
 */
export interface TypeCompatibilityInfo {
  /** Current version */
  version: string;
  /** Minimum supported version */
  minimumVersion: string;
  /** Breaking changes since last major version */
  breakingChanges: string[];
  /** Deprecated features */
  deprecated: DeprecatedFeature[];
}