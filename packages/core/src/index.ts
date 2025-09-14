/**
 * Universal Search Component - Main Entry Point
 * @description Entry point for the universal search component library
 */

import type { SearchConfiguration } from './types/Config';
import { UniversalSearch } from './UniversalSearch';

// Version constant
export const VERSION = '1.0.0' as const;

// Core component
export { UniversalSearch } from './UniversalSearch';

// Search pipeline components
export { MemoryAdapter, type MemoryAdapterConfig } from './adapters/MemoryAdapter';
export { APIAdapter, type APIAdapterConfig } from './adapters/APIAdapter';
export {
  DataSourceConnector,
  createDataSourceConnector,
  dataSourceConnector,
} from './pipeline/DataSourceConnector';
export { QueryProcessor } from './pipeline/QueryProcessor';
export { ResponseTransformer, type ResponseMapping } from './pipeline/ResponseTransformer';

// UI components
export { SearchInput } from './ui/SearchInput';
export { ResultsDropdown } from './ui/ResultsDropdown';

// Type exports
export type { SearchConfiguration, QueryConfig, UIConfig, DataSourceConfig } from './types/Config';

export type { SearchResult, SearchResponse, SearchState } from './types/Results';

export type {
  SearchEvent,
  SearchStartEvent,
  SearchCompleteEvent,
  SearchErrorEvent,
  ResultSelectEvent,
  UniversalSearchEvent,
  EventHandler,
} from './types/Events';

// Utility exports
export { ValidationError } from './utils/validation';

// Default configuration
export { DEFAULT_CONFIG } from './types/Config';

/**
 * Legacy compatibility function
 * @deprecated Use UniversalSearch class directly
 */
export function createSearchComponent(
  selector: string,
  config?: Partial<SearchConfiguration>
): UniversalSearch {
  return new UniversalSearch(selector, config);
}
