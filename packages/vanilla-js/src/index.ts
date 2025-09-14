/**
 * Universal Search Vanilla JS Library
 * Zero-dependency search component with multi-data source support
 */

// Core exports
export { UniversalSearch } from './core/UniversalSearch';

// Data Source exports
export { DataSourceBase } from './data-sources/DataSourceBase';
export { MemoryDataSource } from './data-sources/MemoryDataSource';
export { DOMDataSource } from './data-sources/DOMDataSource';
export { APIDataSource } from './data-sources/APIDataSource';
export { SQLDataSource } from './data-sources/SQLDataSource';
export { UnifiedDataSource } from './data-sources/UnifiedDataSource';

// Utility exports
export { EventEmitter } from './utils/EventEmitter';
export { SecurityUtils } from './utils/SecurityUtils';

// Types
export type {
  UniversalSearchConfig,
  SearchResult,
  DataSourceConfig,
  SearchOptions,
  UIConfig,
  SearchEvent,
  MemorySearchOptions,
  APIDataSourceConfig,
  DOMDataSourceConfig,
  SQLDataSourceConfig,
  DataSourceStats,
  SQLProxyRequest,
  SQLProxyResponse
} from './types';

// Version
export const VERSION = '1.0.0';

// Import for global namespace setup
import { UniversalSearch } from './core/UniversalSearch';
import { DataSourceBase } from './data-sources/DataSourceBase';
import { MemoryDataSource } from './data-sources/MemoryDataSource';
import { DOMDataSource } from './data-sources/DOMDataSource';
import { APIDataSource } from './data-sources/APIDataSource';
import { SQLDataSource } from './data-sources/SQLDataSource';
import { UnifiedDataSource } from './data-sources/UnifiedDataSource';
import { EventEmitter } from './utils/EventEmitter';
import { SecurityUtils } from './utils/SecurityUtils';

// Global namespace for CDN usage
if (typeof window !== 'undefined') {
  const globalScope = window as any;
  
  // Main API
  globalScope.UniversalSearch = UniversalSearch;
  globalScope.UniversalSearchVersion = VERSION;
  
  // Advanced API - expose data source classes for power users
  if (!globalScope.UniversalSearch.DataSources) {
    globalScope.UniversalSearch.DataSources = {
      Memory: MemoryDataSource,
      DOM: DOMDataSource,
      API: APIDataSource,
      SQL: SQLDataSource,
      Unified: UnifiedDataSource,
      Base: DataSourceBase
    };
  }
  
  // Utilities
  if (!globalScope.UniversalSearch.Utils) {
    globalScope.UniversalSearch.Utils = {
      EventEmitter,
      SecurityUtils
    };
  }
}