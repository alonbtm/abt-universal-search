/**
 * Universal Search Component - Main Entry Point
 * @description Entry point for the universal search component library
 */
import type { SearchConfiguration } from './types/Config';
import { UniversalSearch } from './UniversalSearch';
export declare const VERSION: "1.0.0";
export { UniversalSearch } from './UniversalSearch';
export { MemoryAdapter, type MemoryAdapterConfig } from './adapters/MemoryAdapter';
export { APIAdapter, type APIAdapterConfig } from './adapters/APIAdapter';
export { DataSourceConnector, createDataSourceConnector, dataSourceConnector } from './pipeline/DataSourceConnector';
export { QueryProcessor } from './pipeline/QueryProcessor';
export { ResponseTransformer, type ResponseMapping } from './pipeline/ResponseTransformer';
export { SearchInput } from './ui/SearchInput';
export { ResultsDropdown } from './ui/ResultsDropdown';
export type { SearchConfiguration, QueryConfig, UIConfig, DataSourceConfig } from './types/Config';
export type { SearchResult, SearchResponse, SearchState } from './types/Results';
export type { SearchEvent, SearchStartEvent, SearchCompleteEvent, SearchErrorEvent, ResultSelectEvent, UniversalSearchEvent, EventHandler } from './types/Events';
export { ValidationError } from './utils/validation';
export { DEFAULT_CONFIG } from './types/Config';
/**
 * Legacy compatibility function
 * @deprecated Use UniversalSearch class directly
 */
export declare function createSearchComponent(selector: string, config?: Partial<SearchConfiguration>): UniversalSearch;
//# sourceMappingURL=index.d.ts.map