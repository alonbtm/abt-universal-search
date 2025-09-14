/**
 * Universal Search Component - Main Entry Point
 * @description Entry point for the universal search component library
 */
import { UniversalSearch } from './UniversalSearch';
// Version constant
export const VERSION = '1.0.0';
// Core component
export { UniversalSearch } from './UniversalSearch';
// Search pipeline components  
export { MemoryAdapter } from './adapters/MemoryAdapter';
export { APIAdapter } from './adapters/APIAdapter';
export { DataSourceConnector, createDataSourceConnector, dataSourceConnector } from './pipeline/DataSourceConnector';
export { QueryProcessor } from './pipeline/QueryProcessor';
export { ResponseTransformer } from './pipeline/ResponseTransformer';
// UI components
export { SearchInput } from './ui/SearchInput';
export { ResultsDropdown } from './ui/ResultsDropdown';
// Utility exports
export { ValidationError } from './utils/validation';
// Default configuration
export { DEFAULT_CONFIG } from './types/Config';
/**
 * Legacy compatibility function
 * @deprecated Use UniversalSearch class directly
 */
export function createSearchComponent(selector, config) {
    return new UniversalSearch(selector, config);
}
//# sourceMappingURL=index.js.map