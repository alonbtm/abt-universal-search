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
/**
 * Common enums for type safety and IntelliSense support
 */
/**
 * Search result types for categorization
 * @enum {string}
 */
export var SearchResultType;
(function (SearchResultType) {
    /** General web page or document */
    SearchResultType["PAGE"] = "page";
    /** User profile or account */
    SearchResultType["USER"] = "user";
    /** Product or item */
    SearchResultType["PRODUCT"] = "product";
    /** Media file (image, video, audio) */
    SearchResultType["MEDIA"] = "media";
    /** Document file (PDF, DOC, etc.) */
    SearchResultType["DOCUMENT"] = "document";
    /** Contact or person */
    SearchResultType["CONTACT"] = "contact";
    /** Location or place */
    SearchResultType["LOCATION"] = "location";
    /** Event or activity */
    SearchResultType["EVENT"] = "event";
    /** Category or collection */
    SearchResultType["CATEGORY"] = "category";
    /** Custom type for extensions */
    SearchResultType["CUSTOM"] = "custom";
})(SearchResultType || (SearchResultType = {}));
/**
 * Search query types for different search modes
 * @enum {string}
 */
export var SearchQueryType;
(function (SearchQueryType) {
    /** Free text search */
    SearchQueryType["TEXT"] = "text";
    /** Exact phrase search */
    SearchQueryType["PHRASE"] = "phrase";
    /** Boolean search with operators */
    SearchQueryType["BOOLEAN"] = "boolean";
    /** Fuzzy/similarity search */
    SearchQueryType["FUZZY"] = "fuzzy";
    /** Regular expression search */
    SearchQueryType["REGEX"] = "regex";
    /** Wildcard search */
    SearchQueryType["WILDCARD"] = "wildcard";
})(SearchQueryType || (SearchQueryType = {}));
/**
 * Data source types for different backend integrations
 * @enum {string}
 */
export var DataSourceType;
(function (DataSourceType) {
    /** REST API endpoint */
    DataSourceType["API"] = "api";
    /** Static JSON data */
    DataSourceType["STATIC"] = "static";
    /** Local storage data */
    DataSourceType["LOCAL_STORAGE"] = "localStorage";
    /** Session storage data */
    DataSourceType["SESSION_STORAGE"] = "sessionStorage";
    /** IndexedDB database */
    DataSourceType["INDEXED_DB"] = "indexedDB";
    /** WebSocket connection */
    DataSourceType["WEBSOCKET"] = "websocket";
    /** Server-sent events */
    DataSourceType["SSE"] = "sse";
    /** GraphQL endpoint */
    DataSourceType["GRAPHQL"] = "graphql";
    /** Custom data source */
    DataSourceType["CUSTOM"] = "custom";
})(DataSourceType || (DataSourceType = {}));
/**
 * Theme variants for UI customization
 * @enum {string}
 */
export var ThemeVariant;
(function (ThemeVariant) {
    /** Light theme */
    ThemeVariant["LIGHT"] = "light";
    /** Dark theme */
    ThemeVariant["DARK"] = "dark";
    /** High contrast theme for accessibility */
    ThemeVariant["HIGH_CONTRAST"] = "high-contrast";
    /** Automatic theme based on system preference */
    ThemeVariant["AUTO"] = "auto";
    /** Custom theme */
    ThemeVariant["CUSTOM"] = "custom";
})(ThemeVariant || (ThemeVariant = {}));
/**
 * Event types for the search component
 * @enum {string}
 */
export var SearchEventType;
(function (SearchEventType) {
    /** Query input changed */
    SearchEventType["QUERY_CHANGE"] = "query-change";
    /** Search started */
    SearchEventType["SEARCH_START"] = "search-start";
    /** Search completed */
    SearchEventType["SEARCH_COMPLETE"] = "search-complete";
    /** Search failed */
    SearchEventType["SEARCH_ERROR"] = "search-error";
    /** Result selected */
    SearchEventType["RESULT_SELECT"] = "result-select";
    /** Result hovered */
    SearchEventType["RESULT_HOVER"] = "result-hover";
    /** Dropdown opened */
    SearchEventType["DROPDOWN_OPEN"] = "dropdown-open";
    /** Dropdown closed */
    SearchEventType["DROPDOWN_CLOSE"] = "dropdown-close";
    /** Focus gained */
    SearchEventType["FOCUS"] = "focus";
    /** Focus lost */
    SearchEventType["BLUR"] = "blur";
    /** Component initialized */
    SearchEventType["INIT"] = "init";
    /** Component destroyed */
    SearchEventType["DESTROY"] = "destroy";
})(SearchEventType || (SearchEventType = {}));
/**
 * Validation error types for runtime checking
 * @enum {string}
 */
export var ValidationErrorType;
(function (ValidationErrorType) {
    /** Invalid type */
    ValidationErrorType["INVALID_TYPE"] = "invalid-type";
    /** Missing required property */
    ValidationErrorType["MISSING_REQUIRED"] = "missing-required";
    /** Invalid format */
    ValidationErrorType["INVALID_FORMAT"] = "invalid-format";
    /** Out of range value */
    ValidationErrorType["OUT_OF_RANGE"] = "out-of-range";
    /** Invalid configuration */
    ValidationErrorType["INVALID_CONFIG"] = "invalid-config";
    /** Validation failed */
    ValidationErrorType["VALIDATION_FAILED"] = "validation-failed";
})(ValidationErrorType || (ValidationErrorType = {}));
/**
 * Version information for backward compatibility
 */
export const VERSION = '1.0.0';
export const API_VERSION = '1';
export const TYPESCRIPT_VERSION = '^5.3.0';
//# sourceMappingURL=index.js.map