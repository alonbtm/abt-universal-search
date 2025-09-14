/**
 * API Adapter - Enhanced REST and GraphQL API integration
 * @description Comprehensive API adapter with authentication, CORS, and rate limiting
 */
import { BaseDataSourceAdapter, type AdapterCapabilities } from './BaseAdapter';
import type { APIDataSourceConfig } from '../types/Config';
import type { ProcessedQuery, Connection, RawResult } from '../types/Results';
/**
 * Enhanced API adapter for REST and GraphQL endpoints
 */
export declare class APIAdapter extends BaseDataSourceAdapter {
    private readonly config;
    private responseCache;
    constructor(config?: unknown);
    /**
     * Connect to API endpoint
     */
    connect(config: APIDataSourceConfig): Promise<Connection>;
    /**
     * Execute API search query
     */
    query(connection: Connection, query: ProcessedQuery): Promise<RawResult[]>;
    /**
     * Disconnect from API (cleanup resources)
     */
    disconnect(connection: Connection): Promise<void>;
    /**
     * Validate API configuration
     */
    validateConfig(config: any): Promise<void>;
    /**
     * Get adapter capabilities
     */
    getCapabilities(): AdapterCapabilities;
    /**
     * Execute standard HTTP request
     */
    private executeStandardRequest;
    /**
     * Create mock Response object for validation
     */
    private createMockResponse;
    /**
     * Get HTTP status text
     */
    private getStatusText;
    /**
     * Validate authentication configuration
     */
    private validateAuthConfig;
    /**
     * Validate rate limit configuration
     */
    private validateRateLimitConfig;
    /**
     * Get cache key for request
     */
    private getCacheKey;
    /**
     * Get cached results
     */
    private getCachedResults;
    /**
     * Cache results
     */
    private cacheResults;
    /**
     * Validate initial configuration
     */
    private validateConfiguration;
    /**
     * Get current configuration
     */
    getConfig(): APIDataSourceConfig;
    /**
     * Clear response cache
     */
    clearCache(): void;
}
/**
 * API adapter configuration type export
 */
export type APIAdapterConfig = APIDataSourceConfig;
//# sourceMappingURL=APIAdapter.d.ts.map